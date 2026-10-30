import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { WorkspaceService } from '../workspace/workspace.service';
import { WorkspaceChatService } from './workspace-chat.service';

@Controller('workspace/chat')
export class WorkspaceChatController {
  constructor(private chat: WorkspaceChatService, private workspace: WorkspaceService) {}
  private bearer(value: string) { if (!value?.startsWith('Bearer ')) throw new UnauthorizedException(); return value.slice(7); }
  private async user(auth: string) { return this.workspace.session(this.bearer(auth), true); }
  @Get('inbox') async inbox(@Headers('authorization') auth: string) { return this.chat.inbox(await this.user(auth) as any); }
  @Get('recipients') async recipients(@Headers('authorization') auth: string) { return this.chat.recipients(await this.user(auth) as any); }
  @Post('conversations') async conversation(@Headers('authorization') auth: string, @Body() body: any) { return this.chat.createConversation(await this.user(auth) as any, body); }
  @Post('broadcasts') async broadcast(@Headers('authorization') auth: string, @Body() body: any) { return this.chat.broadcast(await this.user(auth) as any, body); }
  @Get(':conversationId/messages') async messages(@Headers('authorization') auth: string, @Param('conversationId') id: string) { const user = await this.user(auth); return this.chat.inbox(user as any).then(data => data.conversations.find(item => item.id === id)?.messages || []); }
  @Post(':conversationId/messages') async send(@Headers('authorization') auth: string, @Param('conversationId') id: string, @Body() body: any) { return this.chat.sendMessage(await this.user(auth) as any, id, body); }
  @Post(':conversationId/read') async read(@Headers('authorization') auth: string, @Param('conversationId') id: string) { return this.chat.readMessages(await this.user(auth) as any, id); }
  @Post('broadcasts/:broadcastId/reply') async reply(@Headers('authorization') auth: string, @Param('broadcastId') id: string, @Body() body: any) { return this.chat.replyToBroadcast(await this.user(auth) as any, id, body); }
  @Post('broadcast-recipients/:recipientId/read') async readBroadcast(@Headers('authorization') auth: string, @Param('recipientId') id: string) { return this.chat.readBroadcast(await this.user(auth) as any, id); }
}
