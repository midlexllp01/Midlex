import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtService } from '@nestjs/jwt';
import { WorkspaceService } from '../workspace/workspace.service';
import { CasesService } from '../cases/cases.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

type ChatUser = { id: string; email: string; name: string; role: string; litigationTeam?: string | null };

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private jwt: JwtService,
    private workspace: WorkspaceService,
    private cases: CasesService,
  ) {}

  async broadcastToClients(actor: ChatUser, value: unknown) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Only an admin can broadcast to clients');
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 4000) {
      throw new BadRequestException('Enter a message of up to 4,000 characters');
    }

    const content = value.trim();
    const [clientUsers, cases] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'CLIENT' as any }, select: { id: true } }),
      this.prisma.case.findMany({
        where: { status: { in: ['OPEN' as any, 'IN_PROGRESS' as any] } },
        select: { id: true, clientId: true },
      }),
    ]);
    if (!clientUsers.length) throw new BadRequestException('There are no client accounts to receive this broadcast');

    const messages = await Promise.all(cases.map(matter => this.prisma.message.create({
      data: { caseId: matter.id, senderId: actor.id, content },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })));

    const clientIds = new Set(clientUsers.map(client => client.id));
    await this.notificationsService.createForRecipients(
      [...clientIds].map(recipientUserId => ({ recipientUserId })),
      {
        title: 'Message from Midlex LLP',
        message: content.slice(0, 180),
        type: 'CHAT_MESSAGE',
        entityType: 'BROADCAST',
        entityId: messages[0]?.id,
        href: '/dashboard/messages',
      },
    );

    await Promise.all(messages.map(message => this.emitToAuthorizedCaseMembers(message.caseId!, 'message', message)));
    return { recipientCount: clientIds.size, chatCount: messages.length };
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      client.disconnect(true);
      return;
    }
    client.data.chatUserReady = (async (): Promise<ChatUser> => {
      let user: ChatUser;
      const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64url').toString());
      if (payload.iss === 'midlex-workspace') {
        const session = await this.workspace.inspect(token);
        if (!['legal-admin', 'legal-staff'].includes(session.project)) throw new Error('Workspace project cannot access legal chat');
        user = session.user as ChatUser;
      } else {
        const verified = await this.jwt.verifyAsync(token);
        if (typeof verified.sub !== 'string') throw new Error('Invalid token subject');
        const account = await this.prisma.user.findUnique({ where: { id: verified.sub } });
        if (!account) throw new Error('Account not found');
        user = { id: account.id, email: account.email, name: account.name, role: account.role, litigationTeam: account.litigationTeam };
      }
      client.data.chatUser = user;
      return user;
    })();
    void (client.data.chatUserReady as Promise<ChatUser>).catch(() => client.disconnect(true));
  }

  handleDisconnect(client: Socket) {
    delete client.data.chatUser;
  }

  private async user(client: Socket): Promise<ChatUser> {
    const ready = client.data.chatUserReady as Promise<ChatUser> | undefined;
    if (ready) await ready;
    const user = client.data.chatUser as ChatUser | undefined;
    if (!user) throw new ForbiddenException('Sign in to use chat');
    return user;
  }

  private async canAccessCase(user: ChatUser, caseId: string) {
    if (user.role === 'ADMIN') return true;
    const matter = await this.prisma.case.findUnique({ where: { id: caseId }, select: { id: true, clientId: true } });
    if (!matter) return false;
    if (user.role === 'CLIENT') return matter.clientId === user.id;
    if (user.role === 'LAWYER') return (await this.cases.findByLawyer(user.id)).some(item => item.id === caseId);
    return false;
  }

  private async canAccessTeam(user: ChatUser, teamName: string) {
    if (user.role === 'ADMIN') return true;
    if (user.role !== 'LAWYER') return false;
    const account = user.email ? await this.prisma.workspaceUser.findUnique({ where: { email: user.email } }) : null;
    if (!account?.active || !['USER', 'BOTH'].includes(account.grants?.['legal-staff'])) return false;
    const team = account.litigationTeam?.trim();
    return Boolean(team && team.toUpperCase() === teamName.trim().toUpperCase());
  }

  private async emitToAuthorizedCaseMembers(caseId: string, event: string, payload: unknown) {
    const sockets = await this.server.in(caseId).fetchSockets();
    await Promise.all(sockets.map(async socket => {
      const user = socket.data.chatUser as ChatUser | undefined;
      if (!user || !await this.canAccessCase(user, caseId)) {
        await socket.leave(caseId);
        return;
      }
      socket.emit(event, payload);
    }));
  }

  private async emitToAuthorizedTeamMembers(teamName: string, event: string, payload: unknown) {
    const room = `team_${teamName}`;
    const sockets = await this.server.in(room).fetchSockets();
    await Promise.all(sockets.map(async socket => {
      const user = socket.data.chatUser as ChatUser | undefined;
      if (!user || !await this.canAccessTeam(user, teamName)) {
        await socket.leave(room);
        return;
      }
      socket.emit(event, payload);
    }));
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { caseId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = await this.user(client);
    if (!data?.caseId || !await this.canAccessCase(user, data.caseId)) throw new ForbiddenException('You do not have access to this client chat');
    await client.join(data.caseId);
    return { event: 'joined', data: data.caseId };
  }

  @SubscribeMessage('joinTeamRoom')
  async handleJoinTeamRoom(
    @MessageBody() data: { teamName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = await this.user(client);
    if (!data?.teamName || !await this.canAccessTeam(user, data.teamName)) throw new ForbiddenException('You do not have access to this litigation team chat');
    const room = `team_${data.teamName}`;
    await client.join(room);
    return { event: 'joinedTeam', data: data.teamName };
  }

  @SubscribeMessage('sendTeamMessage')
  async handleSendTeamMessage(
    @MessageBody()
    data: {
      teamName: string;
      content: string;
      fileUrl?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const actor = await this.user(client);
    if (!data?.teamName || !client.rooms.has(`team_${data.teamName}`) || !await this.canAccessTeam(actor, data.teamName)) throw new ForbiddenException('You do not have access to this litigation team chat');
    const message = await this.prisma.message.create({
      data: {
        content: data.content,
        fileUrl: data.fileUrl,
        teamName: data.teamName,
        senderId: actor.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            litigationTeam: true,
          },
        },
      },
    });

    await this.emitToAuthorizedTeamMembers(data.teamName, 'teamMessage', message);
    const recipients = await this.prisma.user.findMany({
      where: { OR: [{ role: 'ADMIN' as any }, { litigationTeam: data.teamName }] },
      select: { id: true },
    });
    await this.notificationsService.createForRecipients(
      recipients.filter((recipient: any) => recipient.id !== actor.id).map((recipient: any) => ({ recipientUserId: recipient.id })),
      { title: `New litigation team message · ${data.teamName}`, message: `${actor.name || 'Team member'}: ${(data.content || 'Shared a file').slice(0, 180)}`, type: 'CHAT_MESSAGE', entityType: 'TEAM', entityId: data.teamName, href: '/dashboard/messages' },
    );
    return message;
  }

  @SubscribeMessage('takeoverChat')
  async handleTakeoverChat(
    @MessageBody() data: { caseId: string; userRole: string; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const actor = await this.user(client);
    if (!['ADMIN', 'LAWYER'].includes(actor.role) || !await this.canAccessCase(actor, data.caseId) || !client.rooms.has(data.caseId)) throw new ForbiddenException('You do not have access to take over this case chat');
    const takeoverNotice = {
      id: `sys-${Date.now()}`,
      content: `👨‍⚖️ ${actor.name || 'Legal Counsel'} (${actor.role}) has officially taken over this chat. Midlex AI Assistant is now paused.`,
      senderId: 'system',
      caseId: data.caseId,
      createdAt: new Date().toISOString(),
      sender: { name: 'System Notice', role: 'ADMIN' },
    };

    await this.emitToAuthorizedCaseMembers(data.caseId, 'message', takeoverNotice);
    await this.emitToAuthorizedCaseMembers(data.caseId, 'aiModeChanged', { aiMode: false, takenOverBy: actor.name });
    return takeoverNotice;
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      caseId: string;
      senderId: string;
      content: string;
      fileUrl?: string;
      aiMode?: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const actor = await this.user(client);
    if (!data?.caseId || !client.rooms.has(data.caseId) || !await this.canAccessCase(actor, data.caseId)) throw new ForbiddenException('You do not have access to this client chat');
    const message = await this.prisma.message.create({
      data: {
        content: data.content,
        fileUrl: data.fileUrl,
        caseId: data.caseId,
        senderId: actor.id,
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    await this.emitToAuthorizedCaseMembers(data.caseId, 'message', message);

    // AI Assistant Auto-Reply (runs if AI mode is enabled and message is from client)
    const isClientSender = actor.role === 'CLIENT';

    if (isClientSender && data.aiMode !== false) {
      setTimeout(async () => {
        try {
          const aiText = this.generateAiLegalReply(data.content);
          const aiMessage = {
            id: `ai-${Date.now()}`,
            content: aiText,
            caseId: data.caseId,
            senderId: 'ai-assistant',
            createdAt: new Date().toISOString(),
            sender: { id: 'ai-assistant', name: 'Midlex AI Legal Assistant', role: 'AI' },
          };
          await this.emitToAuthorizedCaseMembers(data.caseId, 'message', aiMessage);
        } catch (err) {
          console.warn('[ChatGateway] AI auto-reply error:', err);
        }
      }, 1200);
    }

    // Auto-dispatch Email & System Notifications
    try {
      const caseData = await this.prisma.case.findUnique({
        where: { id: data.caseId },
        include: { client: true, lawyer: true },
      });

      if (caseData) {
        const sender = (message as any).sender;
        const noticeRecipients = await this.prisma.user.findMany({
          where: { OR: [{ role: 'ADMIN' as any }, { role: 'LAWYER' as any }, { id: caseData.clientId }] },
          select: { id: true },
        });
        await this.notificationsService.createForRecipients(
          noticeRecipients.filter((recipient: any) => recipient.id !== actor.id).map((recipient: any) => ({ recipientUserId: recipient.id })),
          {
            title: `New case message · ${caseData.title}`,
            message: `${sender?.name || 'A participant'}: ${(data.content || 'Shared a document').slice(0, 180)}`,
            type: 'CHAT_MESSAGE',
            entityType: 'CASE',
            entityId: caseData.id,
            href: `/dashboard/cases/${caseData.id}`,
          },
        );

        if (isClientSender) {
          // Client sent message -> Notify Lawyer / Admin
          const recipientEmail =
            caseData.lawyer?.email || 'midlexllp01@gmail.com';
          const recipientName = caseData.lawyer?.name || 'Midlex Legal Counsel';

          await this.emailService.sendChatMessageEmailNotification({
            recipientEmail,
            recipientName,
            senderName: sender?.name || 'Client',
            caseTitle: caseData.title,
            caseId: caseData.id,
            messageContent: data.content || 'Sent a document attachment',
          });

        } else if (sender?.role !== 'AI' && data.senderId !== 'system') {
          // Lawyer/Admin sent message -> Notify Client
          if (caseData.client?.email) {
            await this.emailService.sendChatMessageEmailNotification({
              recipientEmail: caseData.client.email,
              recipientName: caseData.client.name,
              senderName: sender?.name || 'Legal Counsel',
              caseTitle: caseData.title,
              caseId: caseData.id,
              messageContent: data.content || 'Sent a document attachment',
            });
          }

        }
      }
    } catch (err) {
      console.warn('[ChatGateway] Error sending email notification:', err);
    }

    return message;
  }

  private generateAiLegalReply(userPrompt: string): string {
    const text = (userPrompt || '').toLowerCase();

    if (text.includes('cost') || text.includes('fee') || text.includes('price') || text.includes('charge')) {
      return `🤖 **Midlex AI Assistant**: Our legal fees depend on the case category (e.g. litigation retainer, property search, or corporate filing). Our legal team will provide a formal fee estimate during your consultation. You can also view fee structures in your dashboard payments tab.`;
    }

    if (text.includes('document') || text.includes('file') || text.includes('upload') || text.includes('proof') || text.includes('paper')) {
      return `🤖 **Midlex AI Assistant**: You can securely upload relevant case files, contracts, or court documents directly using the **Document Manager** section below on this page. All uploaded files are instantly encrypted and accessible to your assigned lawyer.`;
    }

    if (text.includes('court') || text.includes('date') || text.includes('hearing') || text.includes('judge')) {
      return `🤖 **Midlex AI Assistant**: Scheduled court appearances and hearing dates are tracked under the **Court Dates** widget on your dashboard. Your lead counsel will update you as court proceedings progress.`;
    }

    return `🤖 **Midlex AI Assistant**: Thank you for your message! I have logged this update for your legal team. Barristers at Midlex LLP have been notified. Is there any document or specific detail you would like to add while a lawyer connects to this chat?`;
  }
}
