import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CasesModule } from '../cases/cases.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from '../common/email/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [
    WorkspaceModule,
    UsersModule,
    CasesModule,
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const jwtSecret =
          configService.get<string>('JWT_SECRET') ||
          'temporary-cloud-run-secret';
        if (jwtSecret === 'temporary-cloud-run-secret') {
          console.warn('[auth] JWT_SECRET is missing. Set it in Cloud Run.');
        }

        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '1d' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, EmailService],
  controllers: [AuthController],
})
export class AuthModule {}
