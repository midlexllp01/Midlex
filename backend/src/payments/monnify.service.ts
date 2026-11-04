import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonnifyService {
  constructor(private config: ConfigService, private db: PrismaService) {}
  readiness() {
    const ready = ['MONNIFY_API_KEY', 'MONNIFY_SECRET_KEY', 'MONNIFY_CONTRACT_CODE'].every(key => !!this.config.get<string>(key)?.trim());
    return { configured: ready, mode: this.config.get('MONNIFY_LIVE') === 'true' ? 'live' : 'sandbox' };
  }
  private base() { return this.config.get('MONNIFY_LIVE') === 'true' ? 'https://api.monnify.com' : 'https://sandbox.monnify.com'; }
  private async request(path: string, auth: string, body?: unknown) {
    const res = await fetch(this.base() + path, { method: body ? 'POST' : 'GET', headers: { Authorization: auth, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    const data = await res.json();
    if (!res.ok || !data.requestSuccessful) throw new ServiceUnavailableException('Moniepoint checkout could not complete the request. Try again later.');
    return data.responseBody;
  }
  private async token() {
    if (!this.readiness().configured) throw new ServiceUnavailableException('Moniepoint checkout requires Monnify merchant setup. Bank transfer is still available.');
    const basic = Buffer.from(`${this.config.get('MONNIFY_API_KEY')}:${this.config.get('MONNIFY_SECRET_KEY')}`).toString('base64');
    const data = await this.request('/api/v1/auth/login', `Basic ${basic}`, {});
    if (!data.accessToken) throw new ServiceUnavailableException('Unable to authenticate payment provider');
    return `Bearer ${data.accessToken}`;
  }
  async checkout(id: string, clientId: string) {
    const payment = await this.db.payment.findUnique({ where: { id }, include: { client: true, case: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.clientId !== clientId) throw new ForbiddenException('Not your payment');
    if (payment.status === 'SUCCESS') throw new BadRequestException('Payment already completed');
    if (!Number.isFinite(payment.amount) || payment.amount <= 0 || payment.currency !== 'NGN') throw new BadRequestException('A valid NGN invoice is required');
    // Reuse a pending checkout so a retry cannot open parallel provider attempts.
    if (payment.gatewayReference && payment.gatewayCheckoutUrl) return { checkoutUrl: payment.gatewayCheckoutUrl };
    const auth = await this.token();
    const reference = `MIDLEX-${randomUUID()}`;
    const frontend = (this.config.get<string>('FRONTEND_URL') || 'https://midlex.xyz').replace(/\/$/, '');
    const data = await this.request('/api/v1/merchant/transactions/init-transaction', auth, {
      amount: payment.amount, customerEmail: payment.client.email, customerName: payment.client.name,
      paymentReference: reference, paymentDescription: payment.description || 'Midlex legal services', currencyCode: payment.currency,
      contractCode: this.config.get('MONNIFY_CONTRACT_CODE'), redirectUrl: `${frontend}/dashboard/payments?monnifyPayment=${encodeURIComponent(id)}`,
    });
    const url = new URL(data.checkoutUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.monnify.com')) throw new ServiceUnavailableException('Invalid checkout destination');
    await this.db.payment.update({ where: { id }, data: { paymentProvider: 'MONNIFY', gatewayReference: reference, gatewayCheckoutUrl: url.href } });
    return { checkoutUrl: url.href };
  }
  async sync(id: string, user: { id: string; role: string }) {
    const payment = await this.db.payment.findUnique({ where: { id }, include: { case: true } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!['ADMIN', 'ACCOUNTANT'].includes(user.role) && !(user.role === 'CLIENT' && payment.clientId === user.id)) throw new ForbiddenException('Not allowed');
    if (!payment.gatewayReference) throw new BadRequestException('No Moniepoint checkout exists for this invoice');
    const data = await this.request(`/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(payment.gatewayReference)}`, await this.token());
    if (data.paymentReference !== payment.gatewayReference || data.currencyCode !== payment.currency || !Number.isFinite(Number(data.amountPaid))) throw new BadRequestException('Provider payment details do not match the invoice');
    const paid = ['PAID', 'OVERPAID'].includes(data.paymentStatus) && Math.round(Number(data.amountPaid) * 100) >= Math.round(payment.amount * 100);
    // Unconfirmed callbacks never overwrite a completed payment.
    if (!paid) {
      if (['FAILED', 'EXPIRED'].includes(data.paymentStatus) && payment.status !== 'SUCCESS') await this.db.payment.update({ where: { id }, data: { gatewayCheckoutUrl: null, gatewayReference: null } });
      return { status: payment.status, providerStatus: data.paymentStatus };
    }
    if (payment.status === 'SUCCESS') return payment;
    return this.db.payment.update({ where: { id }, data: { status: 'SUCCESS', verifiedAt: new Date(), verificationNote: 'Verified server-to-server with Monnify', paymentProvider: 'MONNIFY' } });
  }
  async webhook(raw: Buffer | undefined, signature: string, body: any) {
    const secret = this.config.get<string>('MONNIFY_SECRET_KEY');
    if (!raw || !secret || !/^[a-f0-9]{128}$/i.test(signature || '')) throw new ForbiddenException('Invalid payment signature');
    const expected = createHmac('sha512', secret).update(raw).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw new ForbiddenException('Invalid payment signature');
    const reference = body?.eventData?.paymentReference;
    if (typeof reference !== 'string') throw new BadRequestException('Missing payment reference');
    const matches = await this.db.payment.findMany({ where: { gatewayReference: reference }, take: 1 });
    const payment = matches[0];
    if (payment) await this.sync(payment.id, { id: 'provider-webhook', role: 'ACCOUNTANT' });
    return { received: true };
  }
}
