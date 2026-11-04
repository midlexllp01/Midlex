import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentAccountsService } from './payment-accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('payment-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentAccountsController {
  constructor(private readonly accounts: PaymentAccountsService) {}

  @Get()
  async listActive() {
    return this.accounts.listActive();
  }

  @Post()
  @Roles(Role.ADMIN, 'ACCOUNTANT' as Role)
  async create(@Body() body: any) {
    return this.accounts.create({
      label: body.label,
      bankName: body.bankName,
      accountName: body.accountName,
      accountNumber: body.accountNumber,
      currency: body.currency || 'NGN',
      isActive: body.isActive ?? true,
    });
  }

  @Patch(':id')
  @Roles(Role.ADMIN, 'ACCOUNTANT' as Role)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.accounts.update(id, {
      label: body.label,
      bankName: body.bankName,
      accountName: body.accountName,
      accountNumber: body.accountNumber,
      currency: body.currency,
      isActive: body.isActive,
    });
  }
}

