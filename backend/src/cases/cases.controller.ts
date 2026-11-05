import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ForbiddenException,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CasesService } from './cases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, CaseStatus } from '@prisma/client';

@Controller('cases')
export class CasesController {
  constructor(private casesService: CasesService) {}

  private async requireCaseAccess(id: string, user: any) {
    const matter = await this.casesService.findOne(id);
    if (!matter) throw new NotFoundException('Case not found');
    if (user.role === Role.ADMIN || user.role === 'ACCOUNTANT') return matter;
    if (user.role === Role.CLIENT && matter.clientId === user.id) return matter;
    if (user.role === Role.LAWYER && (await this.casesService.findByLawyer(user.id)).some(c => c.id === id)) return matter;
    throw new ForbiddenException('You do not have access to this case');
  }

  @Get('public-share/:id')
  async getPublicShare(@Param('id') id: string) {
    return this.casesService.findPublicShare(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CLIENT)
  async create(@Body() body: any, @Request() req: any) {
    // If client is creating, automatically set them as the client
    const clientId =
      req.user.role === Role.CLIENT ? req.user.id : body.clientId;
    return this.casesService.create({
      title: body.title,
      description: body.description,
      clientId: clientId,
      category: body.category ? String(body.category).toUpperCase() : 'LITIGATION',
      subCategory: body.subCategory || body.type || body.serviceNeeded || null,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    if (req.user?.role === Role.ADMIN || (req.user?.role as any) === 'ACCOUNTANT') {
      return this.casesService.findAll();
    }
    if (req.user?.role === Role.LAWYER) {
      return this.casesService.findByLawyer(req.user.id);
    }
    return this.casesService.findByClient(req.user.id);
  }

  @Get('allocations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, ((Role as any).ACCOUNTANT || 'ACCOUNTANT') as any)
  async getAllocations() {
    return this.casesService.getAllocations();
  }

  @Get('my-cases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findMyCases(@Request() req: any) {
    if (req.user.role === Role.ADMIN) {
      return this.casesService.findAll();
    }
    if (req.user.role === Role.LAWYER) {
      return this.casesService.findByLawyer(req.user.id);
    }
    return this.casesService.findByClient(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.requireCaseAccess(id, req.user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: CaseStatus,
    @Request() req: any,
  ) {
    await this.requireCaseAccess(id, req.user);
    return this.casesService.updateStatus(id, status);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER)
  async updateCase(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; suitNumber?: string; court?: string; litigationTeam?: string; stage?: string; pendingTask?: string; category?: string; subCategory?: string },
    @Request() req: any,
  ) {
    await this.requireCaseAccess(id, req.user);
    if (req.user.role !== Role.ADMIN) {
      delete body.litigationTeam;
      delete body.category;
    }
    return this.casesService.updateCase(id, body);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async assign(
    @Param('id') id: string,
    @Body() body: { lawyerId?: string; litigationTeam?: string },
  ) {
    return this.casesService.assignTeam(id, body);
  }

  @Get(':id/timeline')
  @UseGuards(JwtAuthGuard)
  async getTimeline(@Param('id') id: string, @Request() req: any) {
    await this.requireCaseAccess(id, req.user);
    return this.casesService.getTimeline(id);
  }

  @Post(':id/timeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER)
  async addTimelineEvent(
    @Param('id') id: string,
    @Body() body: { title: string; description?: string; status?: string; date?: string },
    @Request() req: any,
  ) {
    await this.requireCaseAccess(id, req.user);
    return this.casesService.addTimelineEvent(id, {
      title: body.title,
      description: body.description,
      status: body.status,
      date: body.date,
      createdById: req.user?.id,
      createdByName: req.user?.name || req.user?.email || 'Legal Counsel',
    });
  }

  @Delete(':id/timeline/:timelineId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER)
  async deleteTimelineEvent(@Param('timelineId') timelineId: string, @Request() req: any) {
    const caseId = await this.casesService.timelineCaseId(timelineId);
    if (!caseId) throw new NotFoundException('Timeline event not found');
    await this.requireCaseAccess(caseId, req.user);
    return this.casesService.deleteTimelineEvent(timelineId);
  }
}
