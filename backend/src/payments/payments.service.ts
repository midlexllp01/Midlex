import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, Role } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type OpayStatus =
  | 'INITIAL'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAIL'
  | 'FAILED'
  | 'CLOSE';

type OpayConfig = {
  publicKey: string;
  privateKey: string;
  merchantId: string;
  country: string;
  baseUrl: string;
};

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    const run = () => void this.cleanupExpiredProofs().catch((error) => console.warn('[Payments] Receipt cleanup failed:', error?.message || error));
    run();
    const timer = setInterval(run, 12 * 60 * 60 * 1000);
    timer.unref?.();
  }

  private async deleteStoredProof(url: string) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.includes('/uploads/payments/')) {
        const filename = path.basename(parsed.pathname);
        await fs.unlink(path.join(process.cwd(), 'uploads', 'payments', filename)).catch(() => undefined);
        return;
      }
      if (parsed.hostname.includes('firebasestorage.googleapis.com')) {
        const encoded = parsed.pathname.split('/o/')[1]?.split('/')[0];
        if (encoded) await this.prisma.storageBucket?.file(decodeURIComponent(encoded)).delete().catch(() => undefined);
        return;
      }
      if (parsed.hostname === 'storage.googleapis.com') {
        const objectPath = parsed.pathname.split('/').slice(2).join('/');
        if (objectPath) await this.prisma.storageBucket?.file(decodeURIComponent(objectPath)).delete().catch(() => undefined);
        return;
      }
      if (parsed.hostname.includes('cloudinary.com')) {
        const uploadPart = parsed.pathname.split('/upload/')[1] || '';
        const publicId = uploadPart.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
        if (publicId) await this.cloudinary.deleteFile(publicId);
      }
    } catch (error) {
      console.warn('[Payments] Could not remove expired receipt:', error);
    }
  }

  private async cleanupExpiredProofs() {
    const expired = await this.prisma.paymentSubmission.findMany({
      where: { proofUrl: { not: null }, proofExpiresAt: { lte: new Date() } },
      select: { id: true, proofUrl: true },
      take: 100,
    });
    for (const item of expired as any[]) {
      await this.deleteStoredProof(item.proofUrl);
      await this.prisma.paymentSubmission.update({ where: { id: item.id }, data: { proofUrl: null, proofType: null } });
    }
  }

  private async notifyPaymentStakeholders(payment: { id: string; caseId: string; clientId: string }, payload: { title: string; message: string }) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: payment.caseId },
      select: { lawyerId: true, litigationTeam: true },
    });
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { role: Role.ADMIN },
          { role: Role.LAWYER },
          ...(caseRecord?.litigationTeam ? [{ litigationTeam: caseRecord.litigationTeam }] : []),
          ...(caseRecord?.lawyerId ? [{ id: caseRecord.lawyerId }] : []),
          { id: payment.clientId },
        ],
      },
      select: { id: true },
    });
    await this.notificationsService.createForRecipients(
      users.filter((user: any) => user.id !== 'SYSTEM').map((user: any) => ({ recipientUserId: user.id })),
      { ...payload, type: 'PAYMENT', entityType: 'PAYMENT', entityId: payment.id, href: '/dashboard/payments' },
    );
  }

  private async withPaymentBalances<T extends any>(payments: T[]): Promise<T[]> {
    return Promise.all(payments.map(async (payment: any) => {
      const submissions = payment.submissions || [];
      const legacyPaid = payment.status === PaymentStatus.SUCCESS && submissions.length === 0 ? Number(payment.amount || 0) : 0;
      const paidAmount = legacyPaid + submissions
        .filter((submission: any) => submission.status === PaymentStatus.SUCCESS)
        .reduce((sum: number, submission: any) => sum + Number(submission.amount || 0), 0);
      return { ...payment, paidAmount, remainingAmount: Math.max(0, Number(payment.amount || 0) - paidAmount) };
    }));
  }

  private getOpayConfig(): OpayConfig {
    const publicKey = this.configService.get<string>('OPAY_PUBLIC_KEY')?.trim();
    const privateKey = this.configService
      .get<string>('OPAY_PRIVATE_KEY')
      ?.trim();
    const merchantId = this.configService
      .get<string>('OPAY_MERCHANT_ID')
      ?.trim();

    if (!publicKey || !privateKey || !merchantId) {
      throw new BadRequestException('OPay is not configured');
    }

    const sandboxRaw = this.configService
      .get<string>('OPAY_SANDBOX')
      ?.trim()
      .toLowerCase();
    const sandbox =
      sandboxRaw === undefined || sandboxRaw === '' || sandboxRaw === 'true';
    const baseUrl =
      this.configService.get<string>('OPAY_BASE_URL')?.trim() ||
      (sandbox
        ? 'https://sandboxapi.opaycheckout.com'
        : 'https://api.opaycheckout.com');

    return {
      publicKey,
      privateKey,
      merchantId,
      country: this.configService.get<string>('OPAY_COUNTRY')?.trim() || 'NG',
      baseUrl,
    };
  }

  private amountToMinorUnit(amount: number) {
    return Math.round(amount * 100);
  }

  private hmacDigest(
    algorithm: 'sha512' | 'sha3-512',
    value: string,
    secret: string,
  ) {
    return createHmac(algorithm, secret).update(value).digest('hex');
  }

  private hmacSha512(value: string, secret: string) {
    return this.hmacDigest('sha512', value, secret);
  }

  private mapOpayStatus(status?: string | null): PaymentStatus {
    switch ((status || '').toUpperCase()) {
      case 'SUCCESS':
        return PaymentStatus.SUCCESS;
      case 'FAIL':
      case 'FAILED':
      case 'CLOSE':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private normalizeUrl(value?: string | null) {
    return (value || '').trim().replace(/\/+$/, '');
  }

  private getBackendBaseUrl(fallbackBaseUrl?: string) {
    const configured = this.normalizeUrl(
      this.configService.get<string>('BACKEND_URL'),
    );
    return configured || this.normalizeUrl(fallbackBaseUrl);
  }

  private getFrontendBaseUrl() {
    const frontendUrl = this.normalizeUrl(
      this.configService.get<string>('FRONTEND_URL'),
    );
    if (!frontendUrl) {
      throw new BadRequestException('FRONTEND_URL is not configured');
    }
    return frontendUrl;
  }

  private async opayRequest<T>(params: {
    path: string;
    body: any;
    mode: 'public' | 'signed';
  }): Promise<T> {
    const config = this.getOpayConfig();
    const body = JSON.stringify(params.body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      MerchantId: config.merchantId,
    };

    if (params.mode === 'public') {
      headers.Authorization = `Bearer ${config.publicKey}`;
    } else {
      headers.Authorization = `Bearer ${this.hmacSha512(body, config.privateKey)}`;
    }

    const response = await fetch(`${config.baseUrl}${params.path}`, {
      method: 'POST',
      headers,
      body,
    });

    const text = await response.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new BadRequestException(
        `Unexpected OPay response${text ? `: ${text}` : ''}`,
      );
    }

    if (!response.ok) {
      throw new BadRequestException(
        data?.message || 'OPay request failed',
      );
    }

    if (data?.code && data.code !== '00000' && data.code !== '00') {
      throw new BadRequestException(data?.message || 'OPay request failed');
    }

    return data as T;
  }

  private buildLegacyCallbackSignature(payload: any, secret: string) {
    if (!payload || typeof payload !== 'object') return null;

    const signString = `{Amount:"${payload.amount || ''}",Currency:"${payload.currency || ''}",Reference:"${payload.reference || ''}",Refunded:${payload.refunded ? 't' : 'f'},Status:"${payload.status || ''}",Timestamp:"${payload.timestamp || ''}",Token:"${payload.token || ''}",TransactionID:"${payload.transactionId || ''}"}`;

    return this.hmacDigest('sha3-512', signString, secret);
  }

  private isValidCallbackSignature(body: any, headers: Record<string, any>) {
    const config = this.getOpayConfig();
    const authorization =
      headers.authorization ||
      headers.Authorization ||
      headers.signature ||
      headers.Signature;
    const requestTimestamp =
      headers.requesttimestamp || headers.RequestTimestamp;

    if (authorization && requestTimestamp) {
      const provided = String(authorization).replace(/^Bearer\s+/i, '').trim();
      const rawBody = JSON.stringify(body ?? {});
      const calculated = this.hmacSha512(
        `${requestTimestamp}${rawBody}`,
        config.privateKey,
      );
      return provided.toLowerCase() === calculated.toLowerCase();
    }

    if (body?.payload && body?.sha512) {
      const calculated = this.buildLegacyCallbackSignature(
        body.payload,
        config.privateKey,
      );
      return !!calculated && calculated.toLowerCase() === String(body.sha512).toLowerCase();
    }

    return false;
  }

  private async fetchPaymentForClient(paymentId: string, clientId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { case: true, client: true, account: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.clientId !== clientId) {
      throw new ForbiddenException('You cannot pay for this record');
    }

    return payment;
  }

  private buildOpayAttemptReference(internalReference: string) {
    return `${internalReference}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  private async findPaymentByReference(reference?: string | null) {
    if (!reference) return null;

    const byInternalRef = await this.prisma.payment.findUnique({
      where: { txRef: reference },
      include: { case: true, client: true, account: true, verifiedBy: true },
    });
    if (byInternalRef) return byInternalRef;

    const byOpayRef = await this.prisma.payment.findMany({
      where: { opayReference: reference },
      take: 1,
      include: { case: true, client: true, account: true, verifiedBy: true },
    });
    return byOpayRef[0] || null;
  }

  private async applyOpayStatusUpdate(params: {
    paymentId: string;
    opayStatus?: string | null;
    orderNo?: string | null;
    payChannel?: string | null;
    raw?: any;
  }) {
    const status = (params.opayStatus || '').toUpperCase();
    const previous = await this.prisma.payment.findUnique({ where: { id: params.paymentId }, select: { status: true } });
    const updated = await this.prisma.payment.update({
      where: { id: params.paymentId },
      data: {
        paymentProvider: 'OPAY',
        opayStatus: status || undefined,
        opayOrderNo: params.orderNo || undefined,
        opayChannel: params.payChannel || undefined,
        opayLastResponse: params.raw,
        status: this.mapOpayStatus(status),
        paidAt:
          this.mapOpayStatus(status) === PaymentStatus.SUCCESS
            ? new Date()
            : undefined,
      },
      include: { case: true, client: true, account: true, verifiedBy: true },
    });
    if (previous?.status !== updated.status && updated.status !== PaymentStatus.PENDING) {
      await this.notifyPaymentStakeholders(updated, {
        title: updated.status === PaymentStatus.SUCCESS ? 'Online payment approved' : 'Online payment failed',
        message: `${updated.currency} ${Number(updated.amount).toLocaleString()} online payment for ${updated.case?.title || 'your legal matter'} is ${String(updated.status).toLowerCase()}.`,
      });
    }
    return updated;
  }

  async createPaymentRequest(data: {
    amount: number;
    currency: string;
    caseId: string;
    clientId: string;
    accountId?: string;
    description?: string;
    dueDate?: Date;
    createdBy: { id: string; role: Role };
  }) {
    if (data.createdBy.role !== Role.ADMIN && String(data.createdBy.role) !== 'ACCOUNTANT') {
      throw new ForbiddenException('Only admins and finance staff can create payment requests');
    }
    if (!Number.isFinite(Number(data.amount)) || Number(data.amount) <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    if (!data.caseId || !data.clientId) {
      throw new BadRequestException('Missing case/client');
    }

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: data.caseId },
      select: { id: true, clientId: true, lawyerId: true },
    });
    if (!caseRecord) throw new NotFoundException('Case not found');
    if (caseRecord.clientId !== data.clientId) {
      throw new BadRequestException('Client does not match case');
    }

    if (data.accountId) {
      const account = await this.prisma.paymentAccount.findUnique({
        where: { id: data.accountId },
        select: { id: true, isActive: true, currency: true },
      });
      if (!account || !account.isActive) {
        throw new BadRequestException('Invalid payment account');
      }
      if (account.currency !== data.currency) {
        throw new BadRequestException('Receiving account currency must match the invoice');
      }
    }

    const txRef = `MIDLEX-MANUAL-${Date.now()}`;
    const payment = await this.prisma.payment.create({
      data: {
        amount: data.amount,
        currency: data.currency,
        txRef,
        caseId: data.caseId,
        clientId: data.clientId,
        accountId: data.accountId,
        description: data.description,
        dueDate: data.dueDate,
        status: PaymentStatus.PENDING,
      },
      include: { case: true, client: true, account: true },
    });

    await this.notifyPaymentStakeholders(payment, {
      title: 'New payment request',
      message: `A payment request of ${data.currency} ${Number(data.amount).toLocaleString()} was created for ${payment.case?.title || 'your case'}.`,
    });

    return payment;
  }

  async createOpayCheckoutForPayment(params: {
    paymentId: string;
    clientId: string;
    backendBaseUrl?: string;
    customer?: {
      email?: string | null;
      name?: string | null;
      phone?: string | null;
    };
  }) {
    const payment = await this.fetchPaymentForClient(
      params.paymentId,
      params.clientId,
    );

    if (payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment has already been completed');
    }

    const config = this.getOpayConfig();
    const backendUrl = this.getBackendBaseUrl(params.backendBaseUrl);
    if (!backendUrl) {
      throw new BadRequestException('BACKEND_URL is not configured');
    }
    const frontendUrl = this.getFrontendBaseUrl();

    const opayReference = this.buildOpayAttemptReference(payment.txRef);

    const payload = {
      country: config.country,
      reference: opayReference,
      amount: {
        total: this.amountToMinorUnit(payment.amount),
        currency: payment.currency || 'NGN',
      },
      returnUrl: `${frontendUrl}/dashboard/payments/verify?reference=${encodeURIComponent(opayReference)}`,
      callbackUrl: `${backendUrl}/payments/opay/webhook`,
      cancelUrl: `${frontendUrl}/dashboard/payments/verify?reference=${encodeURIComponent(opayReference)}&cancelled=1`,
      expireAt: 30,
      userInfo: {
        userEmail: params.customer?.email || payment.client?.email || '',
        userId: payment.clientId,
        userMobile:
          params.customer?.phone || payment.client?.phone || '',
        userName: params.customer?.name || payment.client?.name || '',
      },
      productList: [
        {
          productId: payment.caseId,
          name: payment.case?.title || 'Legal service payment',
          description:
            payment.description || 'Midlex LLP legal services payment',
          price: this.amountToMinorUnit(payment.amount),
          quantity: 1,
        },
      ],
      product: {
        name: payment.case?.title || 'Legal service payment',
        description:
          payment.description || 'Midlex LLP legal services payment',
      },
    };

    const response = await this.opayRequest<any>({
      path: '/api/v1/international/cashier/create',
      body: payload,
      mode: 'public',
    });

    const orderNo =
      response?.data?.orderNo ||
      response?.data?.transactionId ||
      response?.orderNo ||
      null;
    const cashierUrl =
      response?.data?.cashierUrl ||
      response?.data?.webUrl ||
      response?.cashierUrl ||
      response?.url ||
      null;

    if (!cashierUrl) {
      throw new BadRequestException('OPay did not return a checkout URL');
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentProvider: 'OPAY',
        opayReference,
        opayOrderNo: orderNo || undefined,
        opayCheckoutUrl: cashierUrl,
        opayStatus: 'INITIAL',
        opayLastResponse: response,
      },
      include: { case: true, client: true, account: true, verifiedBy: true },
    });

    return {
      payment: updated,
      checkoutUrl: cashierUrl,
      orderNo,
      reference: opayReference,
      response,
    };
  }

  async verifyPayment(params: {
    reference?: string;
    orderNo?: string;
    txRef?: string;
  }) {
    const reference = params.reference || params.txRef;
    if (!reference && !params.orderNo) {
      throw new BadRequestException('reference or orderNo is required');
    }

    let payment = await this.findPaymentByReference(reference);

    if (!payment && params.orderNo) {
      const matches = await this.prisma.payment.findMany({
        where: { opayOrderNo: params.orderNo },
        take: 1,
        include: { case: true, client: true, account: true, verifiedBy: true },
      });
      payment = matches[0] || null;
    }

    if (!payment) throw new NotFoundException('Payment not found');

    const response = await this.opayRequest<any>({
      path: '/api/v1/international/cashier/status',
      body: {
        country: this.getOpayConfig().country,
        ...(payment.opayOrderNo ? { orderNo: payment.opayOrderNo } : {}),
        ...(payment.opayReference || payment.txRef
          ? { reference: payment.opayReference || payment.txRef }
          : {}),
      },
      mode: 'signed',
    });

    const data = response?.data || response?.payload || response || {};
    return this.applyOpayStatusUpdate({
      paymentId: payment.id,
      opayStatus: data.status || data.orderStatus,
      orderNo:
        data.orderNo ||
        data.transactionId ||
        payment.opayOrderNo ||
        null,
      payChannel: data.payChannel || data.channel || null,
      raw: response,
    });
  }

  async syncOpayPaymentStatus(params: {
    paymentId: string;
    requesterId: string;
    requesterRole: Role;
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: params.paymentId },
      include: { case: true, client: true, account: true, verifiedBy: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    if (
      params.requesterRole === Role.CLIENT &&
      payment.clientId !== params.requesterId
    ) {
      throw new ForbiddenException('You cannot access this payment');
    }

    if (
      params.requesterRole === Role.LAWYER &&
      payment.case?.lawyerId !== params.requesterId
    ) {
      throw new ForbiddenException('You cannot access this payment');
    }

    return this.verifyPayment({
      reference: payment.opayReference || payment.txRef,
      orderNo: payment.opayOrderNo,
    });
  }

  async handleOpayWebhook(body: any, headers: Record<string, any>) {
    const signatureLooksValid = this.isValidCallbackSignature(body, headers);

    const payload = body?.payload || body || {};
    const reference =
      payload.reference || payload.merchantOrderNo || payload.txRef;
    const orderNo = payload.orderNo || payload.transactionId || payload.token;

    if (!reference && !orderNo) {
      throw new BadRequestException('Invalid OPay callback payload');
    }

    let payment = await this.findPaymentByReference(reference);

    if (!payment && orderNo) {
      const matches = await this.prisma.payment.findMany({
        where: { opayOrderNo: orderNo },
        take: 1,
      });
      payment = matches[0] || null;
    }

    if (!payment) {
      throw new NotFoundException('Payment not found for callback');
    }

    const updated = await this.verifyPayment({
      reference: payment.opayReference || payment.txRef,
      orderNo: payment.opayOrderNo || orderNo,
    });

    return {
      ok: true,
      signatureValid: signatureLooksValid,
      paymentId: updated.id,
      status: updated.status,
    };
  }

  async findAllByClient(clientId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { case: true, account: true, submissions: { include: { account: true } } },
    });
    return this.withPaymentBalances(payments as any[]);
  }

  async findAllByCase(caseId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { caseId },
      include: { client: true, account: true, submissions: { include: { account: true } } },
    });
    return this.withPaymentBalances(payments as any[]);
  }

  async findAllForUser(params: { userId: string; role: Role }) {
    if (params.role === Role.ADMIN || String(params.role) === 'ACCOUNTANT') {
      const payments = await this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        include: { case: true, client: true, account: true, submissions: { include: { account: true } } },
      });
      return this.withPaymentBalances(payments as any[]);
    }

    if (params.role === Role.LAWYER) {
      const cases = await this.prisma.case.findMany({
        where: { lawyerId: params.userId },
        select: { id: true },
      });
      const caseIds = new Set(cases.map((c: any) => c.id));
      const payments = await this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        include: { case: true, client: true, account: true, submissions: { include: { account: true } } },
      });
      return this.withPaymentBalances(payments.filter((payment: any) => caseIds.has(payment.caseId)) as any[]);
    }

    return this.findAllByClient(params.userId);
  }

  private isCloudinaryConfigured() {
    const name = process.env.CLOUDINARY_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    const vals = [name, key, secret].map((v) => (v || '').trim());
    if (vals.some((v) => !v)) return false;
    if (vals.some((v) => v.toUpperCase() === 'XXXX')) return false;
    return true;
  }

  private async saveProofToLocal(params: {
    file: Express.Multer.File;
    baseUrl: string;
  }) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'payments');
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(params.file.originalname || '') || '';
    const safeExt = ext.length <= 10 ? ext : '';
    const filename = `${randomUUID()}${safeExt}`;
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, params.file.buffer);

    return `${params.baseUrl}/uploads/payments/${filename}`;
  }

  private async saveProofToFirebase(file: Express.Multer.File) {
    const bucket = this.prisma.storageBucket;
    if (!bucket) return null;

    const ext = path.extname(file.originalname || '') || '';
    const safeExt = ext.length <= 10 ? ext : '';
    const filename = `payments/${randomUUID()}${safeExt}`;
    const remoteFile = bucket.file(filename);
    await remoteFile.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });
    await remoteFile.makePublic();
    return remoteFile.publicUrl();
  }

  async submitProof(params: {
    paymentId: string;
    clientId: string;
    file: Express.Multer.File;
    baseUrl: string;
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: params.paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.clientId !== params.clientId)
      throw new ForbiddenException('Not allowed');
    if (payment.status !== PaymentStatus.PENDING)
      throw new BadRequestException('Payment is not pending');

    const url =
      (await this.saveProofToFirebase(params.file)) ||
      (this.isCloudinaryConfigured()
        ? (await this.cloudinary.uploadFile(params.file)).secure_url
        : await this.saveProofToLocal({
            file: params.file,
            baseUrl: params.baseUrl,
          }));

    const updated = await this.prisma.payment.update({
      where: { id: params.paymentId },
      data: {
        proofUrl: url,
        proofType: params.file.mimetype,
        proofSubmittedAt: new Date(),
      },
      include: { case: true, client: true, verifiedBy: true },
    });
    await this.notifyPaymentStakeholders(payment, {
      title: 'Payment receipt awaiting review',
      message: `A bank transfer receipt for ${payment.currency} ${Number(payment.amount).toLocaleString()} was submitted for ${payment.caseId ? 'a legal matter' : 'your account'}.`,
    });
    return updated;
  }

  async submitPartialProof(params: {
    paymentId: string;
    clientId: string;
    file: Express.Multer.File;
    baseUrl: string;
    amount: number;
    accountId: string;
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: params.paymentId },
      include: { submissions: true, case: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.clientId !== params.clientId) throw new ForbiddenException('Not allowed');
    const paid = payment.status === PaymentStatus.SUCCESS && !payment.submissions.length
      ? Number(payment.amount)
      : payment.submissions.filter((item: any) => item.status === PaymentStatus.SUCCESS).reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    const remaining = Math.max(0, Number(payment.amount) - paid);
    if (remaining <= 0) throw new BadRequestException('This payment is already fully paid');
    if (!Number.isFinite(params.amount) || params.amount <= 0 || params.amount > remaining) {
      throw new BadRequestException(`Enter an amount between 1 and ${remaining}`);
    }
    const hasPendingProof = payment.submissions.some((item: any) => item.status === PaymentStatus.PENDING && item.proofUrl);
    if (hasPendingProof || (payment.proofUrl && payment.status === PaymentStatus.PENDING)) {
      throw new BadRequestException('A receipt is already waiting for review');
    }
    const account = await this.prisma.paymentAccount.findUnique({ where: { id: params.accountId } });
    if (!account || !account.isActive || account.currency !== payment.currency) {
      throw new BadRequestException('Select an active receiving account in the invoice currency');
    }
    const url = (await this.saveProofToFirebase(params.file)) ||
      (this.isCloudinaryConfigured()
        ? (await this.cloudinary.uploadFile(params.file)).secure_url
        : await this.saveProofToLocal({ file: params.file, baseUrl: params.baseUrl }));
    const submission = await this.prisma.paymentSubmission.create({
      data: {
        paymentId: payment.id,
        amount: params.amount,
        accountId: account.id,
        proofUrl: url,
        proofType: params.file.mimetype,
        status: PaymentStatus.PENDING,
        submittedAt: new Date(),
        proofExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: { account: true },
    });
    await this.notifyPaymentStakeholders(payment, {
      title: 'Payment receipt awaiting review',
      message: `${payment.clientId === params.clientId ? 'The client' : 'A client'} submitted ${payment.currency} ${params.amount.toLocaleString()} to ${account.bankName} (${account.accountNumber}).`,
    });
    return submission;
  }

  async verifySubmission(params: { submissionId: string; verifiedById: string; status: 'SUCCESS' | 'FAILED'; note?: string }) {
    const submission = await this.prisma.paymentSubmission.findUnique({
      where: { id: params.submissionId },
      include: { payment: { include: { submissions: true, case: true } }, account: true },
    });
    if (!submission) throw new NotFoundException('Payment receipt not found');
    if (!submission.proofUrl) throw new BadRequestException('This receipt has expired or was removed');
    if (submission.status !== PaymentStatus.PENDING) throw new BadRequestException('Receipt has already been reviewed');
    const updated = await this.prisma.paymentSubmission.update({
      where: { id: submission.id },
      data: { status: params.status as PaymentStatus, verifiedAt: new Date(), verifiedById: params.verifiedById, verificationNote: params.note },
      include: { account: true },
    });
    const successfulSubmissions = await this.prisma.paymentSubmission.findMany({
      where: { paymentId: submission.paymentId, status: PaymentStatus.SUCCESS },
    });
    const successful = successfulSubmissions.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    const isPaid = successful >= Number(submission.payment.amount);
    await this.prisma.payment.update({
      where: { id: submission.paymentId },
      data: {
        status: isPaid ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
        ...(isPaid ? { verifiedAt: new Date(), verifiedById: params.verifiedById, paidAt: new Date() } : {}),
      },
    });
    await this.notifyPaymentStakeholders(submission.payment, {
      title: params.status === 'SUCCESS' ? (isPaid ? 'Payment approved' : 'Part payment approved') : 'Payment receipt declined',
      message: params.status === 'SUCCESS'
        ? `${submission.payment.currency} ${Number(submission.amount).toLocaleString()} was approved. ${isPaid ? 'The invoice is fully paid.' : `Remaining balance: ${submission.payment.currency} ${Math.max(0, Number(submission.payment.amount) - successful).toLocaleString()}.`}`
        : `A receipt for ${submission.payment.currency} ${Number(submission.amount).toLocaleString()} was declined${params.note ? `: ${params.note}` : '.'}`,
    });
    return updated;
  }

  async verifyManualPayment(params: {
    paymentId: string;
    verifiedById: string;
    status: 'SUCCESS' | 'FAILED';
    note?: string;
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: params.paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!payment.proofUrl) throw new BadRequestException('No proof uploaded');
    if (payment.status !== PaymentStatus.PENDING) throw new BadRequestException('Payment has already been reviewed');

    const updated = await this.prisma.payment.update({
      where: { id: params.paymentId },
      data: {
        status:
          params.status === 'SUCCESS'
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED,
        verifiedAt: new Date(),
        verifiedById: params.verifiedById,
        verificationNote: params.note,
      },
      include: { case: true, client: true, verifiedBy: true },
    });
    await this.notifyPaymentStakeholders(payment, {
      title: params.status === 'SUCCESS' ? 'Payment approved' : 'Payment receipt declined',
      message: params.status === 'SUCCESS'
        ? `Your ${payment.currency} ${Number(payment.amount).toLocaleString()} transfer has been approved.`
        : `Your ${payment.currency} ${Number(payment.amount).toLocaleString()} transfer was declined${params.note ? `: ${params.note}` : '.'}`,
    });
    return updated;
  }
}
