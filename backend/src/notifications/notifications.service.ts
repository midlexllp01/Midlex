import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = string;

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  href?: string;
  link?: string;
  recipientId?: string;
  recipientUserId?: string;
  recipientRole?: Role;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  href?: string;
  metadata?: Record<string, any>;
}

interface NotificationRecipient {
  recipientId?: string;
  recipientUserId?: string;
  recipientRole?: Role;
}

type CreateNotificationInput = {
  recipientId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  href?: string;
  createdById?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
};

type BroadcastInput = {
  title: string;
  message: string;
  targetRole?: 'ALL' | Role;
  targetUserId?: string;
  link?: string;
  href?: string;
  createdById?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(params: {
    userId: string;
    role: Role;
    unreadOnly?: boolean;
    limit?: number;
  }) {
    const rows = (await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    })) as NotificationRecord[];

    const visible = rows
      .filter((notification) =>
        this.canUserAccessNotification(notification, params.userId, params.role),
      )
      .map((notification) => this.normalize(notification));
    const unreadCount = visible.filter((notification) => !notification.isRead).length;
    const filtered = params.unreadOnly
      ? visible.filter((notification) => !notification.isRead)
      : visible;

    return {
      items:
        typeof params.limit === 'number'
          ? filtered.slice(0, params.limit)
          : filtered,
      unreadCount,
    };
  }

  async create(input: CreateNotificationInput) {
    if (!input.recipientId) throw new BadRequestException('Recipient is required');
    if (!input.title?.trim()) throw new BadRequestException('Title is required');
    if (!input.message?.trim()) throw new BadRequestException('Message is required');

    const created = await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        recipientUserId: input.recipientId,
        title: input.title.trim(),
        message: input.message.trim(),
        type: input.type || 'INFO',
        link: input.link || input.href,
        href: input.href || input.link,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
        isRead: false,
        readAt: null,
        createdById: input.createdById,
      },
    });

    // Auto dispatch multi-channel (Email, WhatsApp, SMS) to recipient user
    this.dispatchMultiChannel(input.recipientId, input.title.trim(), input.message.trim(), input.link || input.href).catch((err) => {
      console.warn('[Notifications] Auto multi-channel dispatch error:', err?.message || err);
    });

    return created;
  }

  /**
   * Automatic Multi-Channel Dispatcher: Email, WhatsApp, SMS
   */
  private async dispatchMultiChannel(
    recipientId: string,
    title: string,
    message: string,
    link?: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: recipientId } });
      if (!user) return;

      const recipientName = user.name || 'Valued Client';
      const email = user.email;
      const phone = user.phone || user.secondaryPhone;
      const appUrl = process.env.FRONTEND_URL || 'https://midlexlawfirms.vercel.app';
      const fullLink = link ? (link.startsWith('http') ? link : `${appUrl}${link}`) : appUrl;

      // 1. Dispatch Email Notification
      if (email) {
        this.sendEmailNotification({
          to: email,
          name: recipientName,
          title,
          message,
          link: fullLink,
        });
      }

      // 2. Dispatch WhatsApp Notification
      if (phone) {
        this.sendWhatsAppNotification({
          phone,
          name: recipientName,
          title,
          message,
          link: fullLink,
        });
      }

      // 3. Dispatch SMS Notification
      if (phone) {
        this.sendSMSNotification({
          phone,
          name: recipientName,
          title,
          message,
          link: fullLink,
        });
      }
    } catch (error) {
      console.warn('[Notifications] Failed to execute multi-channel dispatch:', error);
    }
  }

  private async sendEmailNotification(payload: {
    to: string;
    name: string;
    title: string;
    message: string;
    link: string;
  }) {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;

    console.log(`[📧 EMAIL AUTO-SENT] To: ${payload.to} | Subject: ${payload.title}`);
    console.log(`Body: Hello ${payload.name},\n${payload.message}\nLink: ${payload.link}`);

    if (sendgridApiKey) {
      try {
        await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: payload.to }] }],
            from: { email: process.env.EMAIL_FROM || 'notifications@midlex.com', name: 'Midlex LLP Legal Team' },
            subject: `Midlex LLP Update: ${payload.title}`,
            content: [
              {
                type: 'text/html',
                value: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px;">
                    <div style="background-color: #1B4D2E; padding: 20px; text-align: center; border-radius: 12px;">
                      <h1 style="color: #C69A59; margin: 0;">Midlex LLP</h1>
                      <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 2px;">BARRISTERS & SOLICITORS</p>
                    </div>
                    <div style="padding: 20px 0;">
                      <h3 style="color: #1B4D2E;">${payload.title}</h3>
                      <p style="color: #374151; font-size: 14px; line-height: 1.6;">Dear ${payload.name},</p>
                      <p style="color: #374151; font-size: 14px; line-height: 1.6;">${payload.message}</p>
                      <div style="margin: 25px 0; text-align: center;">
                        <a href="${payload.link}" style="background-color: #C69A59; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                          Open Legal Matter Details
                        </a>
                      </div>
                    </div>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 11px; color: #9ca3af; text-align: center;">
                      This is an automated legal update from Midlex LLP Portal. Confidential & Privileged.
                    </div>
                  </div>
                `,
              },
            ],
          }),
        });
      } catch (err) {
        console.warn('[Email Dispatcher] SendGrid API send error:', err);
      }
    }
  }

  private async sendWhatsAppNotification(payload: {
    phone: string;
    name: string;
    title: string;
    message: string;
    link: string;
  }) {
    const cleanPhone = payload.phone.replace(/[^0-9+]/g, '');
    const whatsappApiUrl = process.env.WHATSAPP_API_URL || process.env.TERMII_WHATSAPP_URL;

    console.log(`[💬 WHATSAPP AUTO-SENT] To: ${cleanPhone}`);
    console.log(`Text: ⚖️ *Midlex LLP Legal Update*\nHello *${payload.name}*,\n\n*${payload.title}*\n${payload.message}\n\n🔗 ${payload.link}`);

    if (whatsappApiUrl) {
      try {
        await fetch(whatsappApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            recipient: cleanPhone,
            message: `⚖️ *Midlex LLP Legal Update*\n\nHello *${payload.name}*,\n\n*${payload.title}*\n${payload.message}\n\n🔗 View details: ${payload.link}`,
            api_key: process.env.WHATSAPP_API_KEY || process.env.TERMII_API_KEY,
          }),
        });
      } catch (err) {
        console.warn('[WhatsApp Dispatcher] Webhook send error:', err);
      }
    }
  }

  private async sendSMSNotification(payload: {
    phone: string;
    name: string;
    title: string;
    message: string;
    link: string;
  }) {
    const cleanPhone = payload.phone.replace(/[^0-9+]/g, '');
    const termiiApiKey = process.env.TERMII_API_KEY;

    console.log(`[📱 SMS AUTO-SENT] To: ${cleanPhone}`);
    console.log(`Text: Midlex LLP: ${payload.title}. ${payload.message}. Link: ${payload.link}`);

    if (termiiApiKey) {
      try {
        await fetch('https://api.ng.termii.com/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanPhone,
            from: process.env.SMS_SENDER_ID || 'MidlexLLP',
            sms: `Midlex LLP: ${payload.title}. ${payload.message}. Link: ${payload.link}`,
            type: 'plain',
            channel: 'generic',
            api_key: termiiApiKey,
          }),
        });
      } catch (err) {
        console.warn('[SMS Dispatcher] Termii API send error:', err);
      }
    }
  }

  async notifyRole(role: Role, input: Omit<CreateNotificationInput, 'recipientId'>) {
    const users = await this.prisma.user.findMany({ where: { role } });
    return Promise.all(
      users.map((user: any) => this.create({ ...input, recipientId: user.id })),
    );
  }

  async notifyAdmins(input: Omit<CreateNotificationInput, 'recipientId'>) {
    return this.notifyRole(Role.ADMIN, input);
  }

  async broadcast(input: BroadcastInput) {
    if (input.targetUserId) {
      return [
        await this.create({
          recipientId: input.targetUserId,
          title: input.title,
          message: input.message,
          link: input.link || input.href,
          createdById: input.createdById,
          type: 'MANUAL',
        }),
      ];
    }

    const where =
      input.targetRole && input.targetRole !== 'ALL'
        ? { role: input.targetRole }
        : undefined;
    const users = await this.prisma.user.findMany({ where });
    return Promise.all(
      users.map((user: any) =>
        this.create({
          recipientId: user.id,
          title: input.title,
          message: input.message,
          link: input.link || input.href,
          createdById: input.createdById,
          type: 'MANUAL',
        }),
      ),
    );
  }

  async markRead(id: string, params: { userId: string; role: Role }) {
    const notification = (await this.prisma.notification.findUnique({
      where: { id },
    })) as NotificationRecord | null;
    if (!notification) throw new NotFoundException('Notification not found');
    if (!this.canUserAccessNotification(notification, params.userId, params.role)) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) return notification;

    return (await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })) as NotificationRecord;
  }

  async markAllRead(params: { userId: string; role: Role }) {
    const rows = (await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    })) as NotificationRecord[];

    const targets = rows.filter(
      (notification) =>
        !notification.isRead &&
        this.canUserAccessNotification(notification, params.userId, params.role),
    );

    await Promise.all(
      targets.map((notification) =>
        this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        }),
      ),
    );

    return { updated: targets.length };
  }

  async createForRecipients(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
  ) {
    const uniqueRecipients = recipients.filter((recipient, index) => {
      const key = recipient.recipientUserId
        ? `user:${recipient.recipientUserId}`
        : `role:${recipient.recipientRole ?? 'ALL'}`;

      return (
        index ===
        recipients.findIndex((candidate) => {
          const candidateKey = candidate.recipientUserId
            ? `user:${candidate.recipientUserId}`
            : `role:${candidate.recipientRole ?? 'ALL'}`;
          return candidateKey === key;
        })
      );
    });

    return Promise.all(
      uniqueRecipients.map((recipient) =>
        this.create({
          recipientId: recipient.recipientId || recipient.recipientUserId || '',
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.href,
          href: payload.href,
          entityType: payload.entityType,
          entityId: payload.entityId,
          metadata: payload.metadata,
        }),
      ),
    );
  }

  private canUserAccessNotification(
    notification: NotificationRecord,
    userId: string,
    role: Role,
  ) {
    const recipientUserId = notification.recipientUserId || notification.recipientId;
    if (recipientUserId && recipientUserId !== userId) {
      return false;
    }

    if (notification.recipientRole && notification.recipientRole !== role) {
      return false;
    }

    return true;
  }

  private normalize(notification: NotificationRecord) {
    return {
      ...notification,
      href: notification.href || notification.link,
      link: notification.link || notification.href,
      isRead: notification.isRead ?? Boolean(notification.readAt),
    };
  }
}
