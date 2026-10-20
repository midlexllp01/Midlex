import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UnauthorizedException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private service: WorkspaceService) {}
  private bearer(value: string) { if (!value?.startsWith('Bearer ')) throw new UnauthorizedException(); return value.slice(7); }
  @Post('login') login(@Body() body: any, @Req() req: any) { return this.service.login(body.email, body.password, req.ip); }
  @Get('me') async me(@Headers('authorization') auth: string) { return this.service.overview(await this.service.session(this.bearer(auth), true)); }
  @Post('users') async onboard(@Headers('authorization') auth: string, @Body() body: any) { return this.service.onboard(await this.service.session(this.bearer(auth)), body); }
  @Patch('users/:id') async update(@Headers('authorization') auth: string, @Param('id') id: string, @Body() body: any) { return this.service.update(await this.service.session(this.bearer(auth)), id, body); }
  @Delete('users/:id') async remove(@Headers('authorization') auth: string, @Param('id') id: string) { return this.service.delete(await this.service.session(this.bearer(auth)), id); }
  @Post('password') async password(@Headers('authorization') auth: string, @Body() body: any) { return this.service.changePassword(await this.service.session(this.bearer(auth), true), body); }
  @Post('logout') async logout(@Headers('authorization') auth: string) { return this.service.logout(await this.service.session(this.bearer(auth), true)); }
  @Post('launch/:project') async launch(@Headers('authorization') auth: string, @Param('project') project: string) { return this.service.launch(await this.service.session(this.bearer(auth)), project); }
  @Post('redeem') redeem(@Headers('x-project-secret') secret: string, @Body() body: any) { return this.service.redeem(body.project, body.code, secret); }
  @Post('introspect') inspect(@Headers('authorization') auth: string, @Body() body: any) { return this.service.inspect(this.bearer(auth), body.project); }
}
