import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { EmailService } from '../common/email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.usersService.findOneById(req.user.id);
  }

  @Post('change-password')
  async changePassword(@Request() req: any, @Body() body: any) {
    return this.usersService.verifyAndChangePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword || body.password,
    );
  }

  @Patch('change-password')
  async patchChangePassword(@Request() req: any, @Body() body: any) {
    return this.usersService.verifyAndChangePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword || body.password,
    );
  }

  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() body: any) {
    if (body.newPassword && String(body.newPassword).trim().length >= 6) {
      await this.usersService.verifyAndChangePassword(
        req.user.id,
        body.currentPassword,
        body.newPassword,
      );
    }
    return this.usersService.update(req.user.id, {
      phone: body.phone,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      nationalId: body.nationalId,
      address: body.address,
      otherInfo: body.otherInfo,
      name: body.name,
    });
  }

  @Get('lawyers')
  async getLawyers() {
    return this.usersService.findAllLawyers();
  }

  @Get('clients')
  @Roles(Role.ADMIN, Role.LAWYER)
  async getClients() {
    return this.usersService.findAllClients();
  }

  @Get('admins')
  @Roles(Role.ADMIN)
  async getAdmins() {
    return this.usersService.findAllAdmins();
  }

  @Post('lawyers')
  @Roles(Role.ADMIN)
  async createLawyer(@Body() body: any) {
    return this.usersService.create({
      email: body.email,
      password: body.password,
      name: body.name,
      role: Role.LAWYER,
      phone: body.phone,
      litigationTeam: body.litigationTeam || 'TEAM ANCHOR',
      department:
        String(body.department || 'LITIGATION').toUpperCase() === 'GENERAL'
          ? 'GENERAL'
          : 'LITIGATION',
      status: 'ACTIVE',
    } as any);
  }

  @Patch('lawyers/:id/team')
  @Roles(Role.ADMIN)
  async updateLawyerTeam(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const update: any = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.email !== undefined) update.email = String(body.email).trim().toLowerCase();
    if (body.phone !== undefined) update.phone = String(body.phone).trim();
    if (body.litigationTeam !== undefined) {
      update.litigationTeam = String(body.litigationTeam).trim().toUpperCase();
    }
    if (body.department !== undefined) {
      update.department =
        String(body.department).toUpperCase() === 'GENERAL'
          ? 'GENERAL'
          : 'LITIGATION';
    }
    if (body.status !== undefined) {
      update.status =
        String(body.status).toUpperCase() === 'DEACTIVATED'
          ? 'DEACTIVATED'
          : 'ACTIVE';
    }
    if (body.password && String(body.password).trim().length > 0) {
      await this.usersService.updatePassword(id, String(body.password).trim());
    }
    return this.usersService.update(id, update);
  }

  @Patch('lawyers/:id')
  @Roles(Role.ADMIN)
  async updateLawyer(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const update: any = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.email !== undefined) update.email = String(body.email).trim().toLowerCase();
    if (body.phone !== undefined) update.phone = String(body.phone).trim();
    if (body.litigationTeam !== undefined) {
      update.litigationTeam = String(body.litigationTeam).trim().toUpperCase();
    }
    if (body.department !== undefined) {
      update.department =
        String(body.department).toUpperCase() === 'GENERAL'
          ? 'GENERAL'
          : 'LITIGATION';
    }
    if (body.status !== undefined) {
      update.status =
        String(body.status).toUpperCase() === 'DEACTIVATED'
          ? 'DEACTIVATED'
          : 'ACTIVE';
    }
    if (body.password && String(body.password).trim().length > 0) {
      await this.usersService.updatePassword(id, String(body.password).trim());
    }
    return this.usersService.update(id, update);
  }

  @Delete('lawyers/:id')
  @Roles(Role.ADMIN)
  async deleteLawyer(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Post('lawyers/:id/delete')
  @Roles(Role.ADMIN)
  async deleteLawyerPost(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteUserDirect(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Get('team-messages/:teamName')
  @Roles(Role.ADMIN, Role.LAWYER)
  async getTeamMessages(@Param('teamName') teamName: string) {
    return this.usersService.getTeamMessages(teamName);
  }

  @Post('team-messages/:teamName')
  @Roles(Role.ADMIN, Role.LAWYER)
  async sendTeamMessage(
    @Param('teamName') teamName: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    return this.usersService.sendTeamMessage({
      teamName,
      senderId: req.user.id,
      content: body.content,
      fileUrl: body.fileUrl,
    });
  }

  @Post('clients')
  @Roles(Role.ADMIN)
  async createClient(@Body() body: any) {
    const temporaryPassword =
      body.password || `Midlex@${Math.random().toString(36).slice(2, 8)}`;

    const newUser = await this.usersService.create({
      email: body.email,
      password: temporaryPassword,
      name: body.name,
      role: Role.CLIENT,
      phone: body.phone,
    });

    try {
      await this.emailService.sendClientWelcomeEmail({
        name: newUser.name,
        email: newUser.email,
        temporaryPassword,
      });
    } catch (emailErr: any) {
      console.warn('[users/clients] Welcome email warning:', emailErr?.message || emailErr);
    }

    try {
      await this.notificationsService.notifyAdmins({
        title: 'New client account created',
        message: `${newUser.name} was added as a client.`,
        link: '/dashboard/clients',
        type: 'CLIENT_CREATED',
      });
    } catch (notifErr: any) {
      console.warn('[users/clients] Admin notification warning:', notifErr?.message || notifErr);
    }

    try {
      await this.notificationsService.create({
        recipientId: newUser.id,
        title: 'Complete your account information',
        message: 'Please update your profile so your legal records are complete.',
        link: '/dashboard/profile',
        type: 'PROFILE_SETUP',
      });
    } catch (clientNotifErr: any) {
      console.warn('[users/clients] Client notification warning:', clientNotifErr?.message || clientNotifErr);
    }

    return { ...newUser, temporaryPassword };
  }

  @Post('admins')
  @Roles(Role.ADMIN)
  async createAdmin(@Body() body: any) {
    const temporaryPassword =
      body.password || `Midlex@${Math.random().toString(36).slice(2, 8)}`;

    const newUser = await this.usersService.create({
      email: body.email,
      password: temporaryPassword,
      name: body.name,
      role: Role.ADMIN,
      phone: body.phone,
    });

    return { ...newUser, temporaryPassword };
  }
}
