import { MonnifyService } from './monnify.service';
import { PaymentsService } from './payments.service';

describe('Finance payment verification', () => {
  const payment = { id: 'invoice', clientId: 'client', amount: 4000, currency: 'NGN', status: 'PENDING', gatewayReference: 'expected' };
  let db: any;
  let service: MonnifyService;
  beforeEach(() => {
    db = { payment: { findUnique: jest.fn().mockResolvedValue(payment), update: jest.fn().mockResolvedValue({ status: 'SUCCESS' }), findMany: jest.fn().mockResolvedValue([payment]) } };
    service = new MonnifyService({ get: () => undefined } as any, db);
    jest.spyOn(service as any, 'token').mockResolvedValue('Bearer fake');
  });
  it('keeps both providers unconfigured without credentials', () => { expect(service.readiness().configured).toBe(false); });
  it('refuses to verify another client invoice', async () => {
    await expect(service.sync('invoice', { id: 'other', role: 'CLIENT' })).rejects.toThrow('Not allowed');
    expect(db.payment.update).not.toHaveBeenCalled();
  });
  it.each([3999, 0])('does not mark an underpayment of %s as paid', async amountPaid => {
    jest.spyOn(service as any, 'request').mockResolvedValue({ paymentReference: 'expected', currencyCode: 'NGN', paymentStatus: 'PAID', amountPaid });
    await service.sync('invoice', { id: 'accountant', role: 'ACCOUNTANT' });
    expect(db.payment.update).not.toHaveBeenCalled();
  });
  it('rejects a mismatched provider reference', async () => {
    jest.spyOn(service as any, 'request').mockResolvedValue({ paymentReference: 'other', currencyCode: 'NGN', paymentStatus: 'PAID', amountPaid: 4000 });
    await expect(service.sync('invoice', { id: 'accountant', role: 'ACCOUNTANT' })).rejects.toThrow('do not match');
    expect(db.payment.update).not.toHaveBeenCalled();
  });
  it('marks a provider-verified full payment as paid', async () => {
    jest.spyOn(service as any, 'request').mockResolvedValue({ paymentReference: 'expected', currencyCode: 'NGN', paymentStatus: 'PAID', amountPaid: 4000 });
    await service.sync('invoice', { id: 'accountant', role: 'ACCOUNTANT' });
    expect(db.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS' }) }));
  });
  it('rejects a wrong currency', async () => {
    jest.spyOn(service as any, 'request').mockResolvedValue({ paymentReference: 'expected', currencyCode: 'USD', paymentStatus: 'PAID', amountPaid: 4000 });
    await expect(service.sync('invoice', { id: 'client', role: 'CLIENT' })).rejects.toThrow('do not match');
    expect(db.payment.update).not.toHaveBeenCalled();
  });
  it('rejects unsigned callbacks', async () => {
    await expect(service.webhook(Buffer.from('{}'), '', {})).rejects.toThrow('Invalid payment signature');
  });
  it('allows accountants to monitor all admin-created invoices', async () => {
    const payments = new PaymentsService({} as any, db, {} as any, {} as any);
    await payments.findAllForUser({ userId: 'accountant', role: 'ACCOUNTANT' as any });
    expect(db.payment.findMany).toHaveBeenCalledWith(expect.not.objectContaining({ where: expect.anything() }));
  });
});
