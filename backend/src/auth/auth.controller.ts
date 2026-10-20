import { Controller, Post, Body, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../common/email/email.service';
import { Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from './jwt-auth.guard';

import { CasesService } from '../cases/cases.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private casesService: CasesService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('signup')
  async signup(@Body() body: any) {
    if (!body.email || !body.password || !body.name) {
      throw new UnauthorizedException('Full name, email, and password are required');
    }

    const newUser = await this.usersService.create({
      email: body.email,
      password: body.password,
      name: body.name,
      phone: body.phone,
      secondaryPhone: body.secondaryPhone || body.phone2,
      city: body.city || body.location,
      address: body.address,
      role: Role.CLIENT,
    } as any);

    let initialCase: any = null;
    const caseTitle = body.caseTitle?.trim() || body.title?.trim();
    const caseDescription = body.caseDescription?.trim() || body.description?.trim();

    if (caseTitle || caseDescription) {
      try {
        initialCase = await this.casesService.create({
          title: caseTitle || `Legal Matter - ${newUser.name}`,
          description: caseDescription || 'Client registered case details.',
          clientId: newUser.id,
        });

        await this.notificationsService.notifyAdmins({
          title: 'New Client Matter Registered',
          message: `${newUser.name} registered a new case: "${caseTitle || 'Legal Matter'}".`,
          link: '/dashboard/cases',
          type: 'CASE_CREATED',
        });
      } catch (caseErr: any) {
        console.warn('[auth/signup] Initial case creation warning:', caseErr?.message || caseErr);
      }
    }

    try {
      await this.emailService.sendAdminSignupNotification(
        newUser.name,
        newUser.email,
      );
    } catch (emailErr: any) {
      console.warn('[auth/signup] Admin email notification warning:', emailErr?.message || emailErr);
    }

    try {
      await this.notificationsService.notifyAdmins({
        title: 'New client registered',
        message: `${newUser.name} created a client account.`,
        link: '/dashboard/clients',
        type: 'CLIENT_SIGNUP',
      });
    } catch (notifErr: any) {
      console.warn('[auth/signup] Admin notification warning:', notifErr?.message || notifErr);
    }

    const loginResult = await this.authService.login(newUser);
    return {
      ...loginResult,
      user: newUser,
      initialCase,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    const reset = await this.authService.createPasswordReset(body.email);
    if (reset) {
      await this.emailService.sendPasswordResetEmail({
        email: body.email,
        resetUrl: reset.resetUrl,
        expiresAt: reset.expiresAt,
      });
    }

    return {
      message:
        'If an account exists for that email, password reset instructions have been sent.',
      ...(process.env.EXPOSE_PASSWORD_RESET_LINK === 'true' && reset
        ? { resetUrl: reset.resetUrl }
        : {}),
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    await this.authService.resetPassword(body.token, body.password);
    return { message: 'Password reset successfully' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: any, @Body() body: any) {
    return this.usersService.verifyAndChangePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword || body.password,
    );
  }
}
