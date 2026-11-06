import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ChatController {
  constructor(private readonly chat: ChatGateway) {}

  @Post('broadcast')
  broadcast(@Request() req: any, @Body() body: { content?: string }) {
    return this.chat.broadcastToClients(req.user, body?.content);
  }
}
