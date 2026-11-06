import { MonnifyService } from './monnify.service';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService, private readonly monnify: MonnifyService) {}

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  providers() {
    return { opay: { configured: ['OPAY_PUBLIC_KEY', 'OPAY_PRIVATE_KEY', 'OPAY_MERCHANT_ID'].every(key => !!process.env[key]?.trim()), mode: process.env.OPAY_SANDBOX === 'false' ? 'live' : 'sandbox' }, moniepoint: this.monnify.readiness() };
  }

  @Post('monnify/webhook')
  monnifyWebhook(@Request() req: any, @Headers('monnify-signature') signature: string, @Body() body: any) {
    return this.monnify.webhook(req.rawBody, signature, body);
  }

  @Post(':id/monnify-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  monnifyCheckout(@Param('id') id: string, @Request() req: any) { return this.monnify.checkout(id, req.user.id); }

  @Post(':id/monnify-sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.ADMIN, 'ACCOUNTANT' as Role)
  monnifySync(@Param('id') id: string, @Request() req: any) { return this.monnify.sync(id, req.user); }

  @Get('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  verify(
    @Query('reference') reference: string,
    @Query('orderNo') orderNo: string,
    @Query('tx_ref') txRef: string,
  ) {
    return this.paymentsService.verifyPayment({ reference, orderNo, txRef });
  }

  @Post('opay/webhook')
  webhook(@Body() body: any, @Headers() headers: Record<string, any>) {
    return this.paymentsService.handleOpayWebhook(body, headers);
  }

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, ((Role as any).ACCOUNTANT || 'ACCOUNTANT') as any)
  createRequest(@Body() body: any, @Request() req: any) {
    return this.paymentsService.createPaymentRequest({
      amount: body.amount,
      currency: body.currency || 'NGN',
      caseId: body.caseId,
      clientId: body.clientId,
      accountId: body.accountId,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      createdBy: { id: req.user.id, role: req.user.role },
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER, ((Role as any).ACCOUNTANT || 'ACCOUNTANT') as any)
  findAll(@Request() req: any) {
    return this.paymentsService.findAllForUser({
      userId: req.user.id,
      role: req.user.role,
    });
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findMyPayments(@Request() req: any) {
    return this.paymentsService.findAllByClient(req.user.id);
  }

  @Post(':id/opay-checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  startOpayCheckout(@Param('id') id: string, @Request() req: any) {
    const baseUrl =
      process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    return this.paymentsService.createOpayCheckoutForPayment({
      paymentId: id,
      clientId: req.user.id,
      backendBaseUrl: baseUrl,
      customer: {
        email: req.user.email,
        name: req.user.name,
        phone: req.user.phone,
      },
    });
  }

  @Post(':id/opay-sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  syncOpayStatus(@Param('id') id: string, @Request() req: any) {
    return this.paymentsService.syncOpayPaymentStatus({
      paymentId: id,
      requesterId: req.user.id,
      requesterRole: req.user.role,
    });
  }

  @Post(':id/proof')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.paymentsService.submitProof({
      paymentId: id,
      file,
      baseUrl,
      clientId: req.user.id,
    });
  }

  @Post(':id/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @UseInterceptors(FileInterceptor('file'))
  submitPartialProof(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body() body: any, @Request() req: any) {
    if (!file) throw new BadRequestException('Receipt file is required');
    return this.paymentsService.submitPartialProof({
      paymentId: id,
      clientId: req.user.id,
      file,
      baseUrl: `${req.protocol}://${req.get('host')}`,
      amount: Number(body.amount),
      accountId: String(body.accountId || ''),
    });
  }

  @Patch('submissions/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, ((Role as any).ACCOUNTANT || 'ACCOUNTANT') as any)
  verifySubmission(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const status = body.status as string;
    if (!status || !['SUCCESS', 'FAILED'].includes(status)) throw new ForbiddenException('Invalid verification status');
    return this.paymentsService.verifySubmission({ submissionId: id, verifiedById: req.user.id, status: status as 'SUCCESS' | 'FAILED', note: body.note });
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, ((Role as any).ACCOUNTANT || 'ACCOUNTANT') as any)
  async verifyManualPayment(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const status = body.status as string;
    if (!status || !['SUCCESS', 'FAILED'].includes(status)) {
      throw new ForbiddenException('Invalid verification status');
    }
    return this.paymentsService.verifyManualPayment({
      paymentId: id,
      verifiedById: req.user.id,
      status: status as 'SUCCESS' | 'FAILED',
      note: body.note,
    });
  }

  @Get('case/:caseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findByCase(@Param('caseId') caseId: string) {
    return this.paymentsService.findAllByCase(caseId);
  }
}
