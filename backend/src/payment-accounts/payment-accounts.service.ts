import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentAccountsService {
  constructor(private prisma: PrismaService) {}

  async listActive() {
    for (const account of [
      { label: 'Zenith · Midlex consult', bankName: 'Zenith', accountName: 'Midlex consult llp', accountNumber: '1229406572' },
      { label: 'Moniepoint · Midlex Analytics', bankName: 'Moniepoint', accountName: 'Midlex Aalytics', accountNumber: '5556693093' },
    ]) {
      const match = await this.prisma.paymentAccount.findMany({ where: { accountNumber: account.accountNumber }, take: 1 });
      if (!match.length) {
        await this.prisma.paymentAccount.create({ data: { ...account, currency: 'NGN', isActive: true } });
      }
    }
    return this.prisma.paymentAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    label?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    currency: string;
    isActive: boolean;
  }) {
    const bankName = (data.bankName || '').trim();
    const accountName = (data.accountName || '').trim();
    const accountNumber = (data.accountNumber || '').trim();
    if (!bankName || !accountName || !accountNumber) {
      throw new BadRequestException('Missing required fields');
    }
    return this.prisma.paymentAccount.create({
      data: {
        label: data.label?.trim() || null,
        bankName,
        accountName,
        accountNumber,
        currency: (data.currency || 'NGN').trim(),
        isActive: Boolean(data.isActive),
      },
    });
  }

  async update(
    id: string,
    patch: Partial<{
      label: string | null;
      bankName: string;
      accountName: string;
      accountNumber: string;
      currency: string;
      isActive: boolean;
    }>,
  ) {
    const existing = await this.prisma.paymentAccount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Account not found');

    return this.prisma.paymentAccount.update({
      where: { id },
      data: {
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.bankName !== undefined ? { bankName: patch.bankName } : {}),
        ...(patch.accountName !== undefined ? { accountName: patch.accountName } : {}),
        ...(patch.accountNumber !== undefined ? { accountNumber: patch.accountNumber } : {}),
        ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      },
    });
  }
}

