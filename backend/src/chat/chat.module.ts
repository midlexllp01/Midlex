import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../common/email/email.module';
import { AuthModule } from '../auth/auth.module';
import { CasesModule } from '../cases/cases.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [PrismaModule, NotificationsModule, EmailModule, AuthModule, CasesModule, WorkspaceModule],
  controllers: [ChatController],
  providers: [ChatGateway],
})
export class ChatModule {}

