import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';

type WorkspaceUser = { id: string; name: string; email: string; role: string; active: boolean };

@Injectable()
export class WorkspaceChatService {
  constructor(private db: PrismaService, private workspace: WorkspaceService) {}

  private canManage(user: WorkspaceUser) { return user.role === 'ADMIN' || user.role === 'DEVELOPER'; }
  private text(value: unknown, label: string, max = 4000) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new BadRequestException(`${label} is required and must be at most ${max} characters`);
    return value.trim();
  }
  private async audit(userId: string, action: string, target: string) { await this.db.workspaceAudit.create({ data: { actorId: userId, action, target } }); }
  private async member(user: WorkspaceUser, conversationId: string) {
    const conversation = await this.db.workspaceConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.adminId !== user.id && conversation.userId !== user.id) throw new ForbiddenException('You are not a member of this conversation');
    return conversation;
  }
  private async userSummary(id: string) {
    const user = await this.db.workspaceUser.findUnique({ where: { id } });
    return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : { id };
  }
  async recipients(actor: WorkspaceUser) {
    if (!this.canManage(actor)) throw new ForbiddenException('Only Admin or Developer accounts can view chat recipients');
    const users = await this.db.workspaceUser.findMany();
    return users.filter((user: WorkspaceUser) => user.active && user.id !== actor.id).map((user: WorkspaceUser) => ({ id: user.id, name: user.name, email: user.email, role: user.role }));
  }
  private async messages(conversationId: string) {
    const rows = await this.db.workspaceMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
    return Promise.all(rows.map(async row => ({ ...row, sender: await this.userSummary(row.senderId) })));
  }

  async inbox(user: WorkspaceUser) {
    const conversations = (await this.db.workspaceConversation.findMany({ orderBy: { updatedAt: 'desc' } }))
      .filter(row => row.adminId === user.id || row.userId === user.id);
    const broadcasts = (await this.db.workspaceBroadcastRecipient.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }));
    const broadcastItems = await Promise.all(broadcasts.map(async recipient => {
      const broadcast = await this.db.workspaceBroadcast.findUnique({ where: { id: recipient.broadcastId } });
      if (!broadcast) return null;
      return { ...broadcast, recipientId: recipient.id, repliedConversationId: recipient.repliedConversationId || null, readAt: recipient.readAt || null, sender: await this.userSummary(broadcast.senderId) };
    }));
    const conversationItems = await Promise.all(conversations.map(async conversation => ({
      ...conversation,
      otherUser: await this.userSummary(conversation.adminId === user.id ? conversation.userId : conversation.adminId),
      messages: await this.messages(conversation.id),
    })));
    const unread = broadcastItems.filter(Boolean).filter(item => !item!.readAt).length + conversationItems.reduce((count, item) => count + item.messages.filter(message => message.senderId !== user.id && !message.readAt).length, 0);
    return { unread, broadcasts: broadcastItems.filter(Boolean), conversations: conversationItems };
  }

  async createConversation(actor: WorkspaceUser, body: any) {
    if (!this.canManage(actor)) throw new ForbiddenException('Only Admin or Developer accounts can start conversations');
    const userId = this.text(body?.userId, 'Recipient');
    if (userId === actor.id) throw new BadRequestException('Choose another workspace user');
    const recipient = await this.db.workspaceUser.findUnique({ where: { id: userId } });
    if (!recipient?.active) throw new NotFoundException('Active recipient not found');
    const conversation = await this.db.workspaceConversation.create({ data: { type: 'DIRECT', adminId: actor.id, userId, broadcastId: null } });
    await this.sendInConversation(actor, conversation, body?.content);
    await this.audit(actor.id, 'CHAT_STARTED', userId);
    return { ...conversation, messages: await this.messages(conversation.id) };
  }

  async broadcast(actor: WorkspaceUser, body: any) {
    if (!this.canManage(actor)) throw new ForbiddenException('Only Admin or Developer accounts can broadcast');
    const subject = this.text(body?.subject, 'Subject', 160);
    const content = this.text(body?.content, 'Message');
    const requested = Array.isArray(body?.userIds) ? body.userIds.filter((id: unknown): id is string => typeof id === 'string') : [];
    const all = await this.db.workspaceUser.findMany();
    const recipients = all.filter((target: WorkspaceUser) => target.active && target.id !== actor.id && (!requested.length || requested.includes(target.id)));
    if (!recipients.length) throw new BadRequestException('Choose at least one active recipient');
    const broadcast = await this.db.workspaceBroadcast.create({ data: { senderId: actor.id, subject, content, recipientCount: recipients.length } });
    for (const target of recipients) await this.db.workspaceBroadcastRecipient.create({ data: { broadcastId: broadcast.id, userId: target.id, repliedConversationId: null, readAt: null } });
    await this.audit(actor.id, 'CHAT_BROADCAST_SENT', broadcast.id);
    return { ...broadcast, recipientCount: recipients.length };
  }

  private async sendInConversation(actor: WorkspaceUser, conversation: any, value: unknown) {
    const content = this.text(value, 'Message');
    const message = await this.db.workspaceMessage.create({ data: { conversationId: conversation.id, senderId: actor.id, content, readAt: null } });
    await this.db.workspaceConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date(), lastMessageAt: new Date() } });
    return message;
  }

  async sendMessage(actor: WorkspaceUser, conversationId: string, body: any) {
    const conversation = await this.member(actor, conversationId);
    const message = await this.sendInConversation(actor, conversation, body?.content);
    await this.audit(actor.id, 'CHAT_MESSAGE_SENT', conversationId);
    return { ...message, sender: await this.userSummary(actor.id) };
  }

  async replyToBroadcast(actor: WorkspaceUser, broadcastId: string, body: any) {
    const recipient = (await this.db.workspaceBroadcastRecipient.findMany({ where: { broadcastId, userId: actor.id }, take: 1 }))[0];
    if (!recipient) throw new ForbiddenException('You are not a recipient of this broadcast');
    let conversation = recipient.repliedConversationId ? await this.db.workspaceConversation.findUnique({ where: { id: recipient.repliedConversationId } }) : null;
    const broadcast = await this.db.workspaceBroadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    if (!conversation) {
      conversation = await this.db.workspaceConversation.create({ data: { type: 'BROADCAST_REPLY', broadcastId, adminId: broadcast.senderId, userId: actor.id } });
      await this.db.workspaceBroadcastRecipient.update({ where: { id: recipient.id }, data: { repliedConversationId: conversation.id } });
    }
    return this.sendMessage(actor, conversation.id, body);
  }

  async readMessages(actor: WorkspaceUser, conversationId: string) {
    await this.member(actor, conversationId);
    const rows = await this.db.workspaceMessage.findMany({ where: { conversationId } });
    for (const row of rows.filter(message => message.senderId !== actor.id && !message.readAt)) await this.db.workspaceMessage.update({ where: { id: row.id }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async readBroadcast(actor: WorkspaceUser, recipientId: string) {
    const recipient = await this.db.workspaceBroadcastRecipient.findUnique({ where: { id: recipientId } });
    if (!recipient || recipient.userId !== actor.id) throw new ForbiddenException('Not your broadcast notification');
    await this.db.workspaceBroadcastRecipient.update({ where: { id: recipientId }, data: { readAt: new Date() } });
    return { ok: true };
  }
}
