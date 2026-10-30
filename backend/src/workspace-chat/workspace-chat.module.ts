import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { WorkspaceChatController } from './workspace-chat.controller';
import { WorkspaceChatService } from './workspace-chat.service';

@Module({ imports: [PrismaModule, WorkspaceModule], controllers: [WorkspaceChatController], providers: [WorkspaceChatService] })
export class WorkspaceChatModule {}
