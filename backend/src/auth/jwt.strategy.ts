import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService, private workspace: WorkspaceService) {
    const jwtSecret =
      configService.get<string>('JWT_SECRET') || 'temporary-cloud-run-secret';
    if (jwtSecret === 'temporary-cloud-run-secret') {
      console.warn('[auth] JWT_SECRET is missing. Set it in Cloud Run.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKeyProvider: (_request: any, token: string, done: any) => {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
          done(null, payload.iss === 'midlex-workspace' ? workspace.secret() : jwtSecret);
        } catch (error) { done(error); }
      },
    });
  }

  async validate(request: any, payload: any) {
    if (payload.iss === 'midlex-workspace') {
      if (payload.kind !== 'project') throw new UnauthorizedException();
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      const session = await this.workspace.inspect(token!);
      const resource = request.path.split('/').filter(Boolean)[0];
      const resources: Record<string, string[]> = {
        'legal-admin': ['admin', 'users', 'cases', 'court-dates', 'documents', 'payments', 'payment-accounts', 'notifications', 'reminders', 'directory', 'inquiries', 'lawyer'],
        'legal-staff': ['admin', 'lawyer', 'users', 'cases', 'court-dates', 'documents', 'payments', 'payment-accounts', 'notifications', 'reminders', 'directory', 'inquiries'],
        finance: ['payments', 'payment-accounts', 'notifications', 'cases'],
        realty: ['realty', 'notifications'],
      };
      if (!resources[session.project]?.includes(resource)) throw new ForbiddenException('Session cannot access this project API');
      // Legacy identity endpoints let administrators create or promote users. Central onboarding is owner-only.
      if (resource === 'users' && request.method !== 'GET') throw new ForbiddenException('Manage internal users from the developer workspace');
      return session.user;
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
