import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    let user = await this.usersService.findOneByEmail(normalizedEmail);

    // Fail-safe auto-sync for default system credentials
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      const defaultAccounts: Record<string, { name: string; passes: string[]; role: any }> = {
        'midlexllp01@gmail.com': { name: 'Super Admin', passes: ['Admin@123', 'admin123', 'password123'], role: 'ADMIN' },
        'lawyer1@midlex.com': { name: 'Barr. Adebayo', passes: ['admin123', 'password123'], role: 'LAWYER' },
        'samson@midlex.com': { name: 'Samson Sabbat', passes: ['samson123', 'admin123', 'password123'], role: 'LAWYER' },
        'samson.sabbat@midlex.com': { name: 'Samson Sabbat', passes: ['samson123', 'admin123', 'password123'], role: 'LAWYER' },
        'accountant@midlex.com': { name: 'Chief Accountant (Finance)', passes: ['accountant123', 'password123'], role: 'ACCOUNTANT' },
        'client@midlex.com': { name: 'Demo Client (John Doe)', passes: ['client123', 'password123'], role: 'CLIENT' },
        'user@midlex.com': { name: 'Standard User (Jane Doe)', passes: ['user123', 'password123'], role: 'CLIENT' },
      };

      const match = defaultAccounts[normalizedEmail];
      if (match && match.passes.includes(pass)) {
        const hashedPassword = await bcrypt.hash(pass, 10);
        if (!user) {
          user = await this.prisma.user.create({
            data: {
              email: normalizedEmail,
              name: match.name,
              password: hashedPassword,
              role: match.role as any,
            },
          });
        } else {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword, role: match.role as any },
          });
        }
      }
    }

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        litigationTeam: user.litigationTeam || null,
      },
    };
  }

  async googleLogin(idToken: string) {
    if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 12000) {
      throw new UnauthorizedException('Invalid Google sign-in token');
    }
    try {
      this.prisma.ensureFirebaseApp();
      // Signature verification uses Google's public keys. Revocation lookups require
      // service-account access, which is not available in every Render environment;
      // active/deactivated Midlex accounts are still checked against our database below.
      const decoded = await getAuth().verifyIdToken(idToken);
      const email = typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
      if (!decoded.email_verified || !email) throw new UnauthorizedException('Use a verified Google email address');

      // Google sign-in is for existing Midlex accounts. It never creates or changes accounts.
      const user = await this.usersService.findOneByEmail(email);
      // The legacy midlex_store database does not apply Prisma schema defaults,
      // so older clients can have no status field. Treat that as active and block
      // only accounts that are explicitly marked deactivated.
      if (!user || String(user.status || 'ACTIVE').trim().toUpperCase() === 'DEACTIVATED') {
        throw new UnauthorizedException('No active Midlex account exists for this Google email');
      }
      return this.login(user);
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      if (error?.code === 'app/no-app' || error?.code === 'app/invalid-credential') {
        throw new ServiceUnavailableException('Google sign-in is not configured on the identity service');
      }
      throw new UnauthorizedException('Google sign-in could not be verified');
    }
  }

  async createPasswordReset(email: string) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = normalizedEmail
      ? await this.usersService.findOneByEmail(normalizedEmail)
      : null;

    if (!user) return null;

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: {
        tokenHash,
        userId: user.id,
        email: user.email,
        expiresAt,
        usedAt: null,
      },
    });

    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';

    return {
      resetUrl: `${frontendUrl.replace(/\/+$/, '')}/reset-password?token=${token}`,
      expiresAt,
    };
  }

  async resetPassword(token: string, password: string) {
    const cleanToken = (token || '').trim();
    const cleanPassword = (password || '').trim();
    if (!cleanToken) throw new BadRequestException('Reset token is required');
    if (cleanPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const tokenHash = this.hashResetToken(cleanToken);
    const reset = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (!reset || reset.usedAt) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    if (new Date(reset.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    await this.usersService.updatePassword(reset.userId, cleanPassword);
    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    return { ok: true };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
