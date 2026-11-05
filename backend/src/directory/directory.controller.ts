import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DirectoryService } from './directory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('courts')
  async getCourts() {
    return this.directoryService.getCourts();
  }

  @Post('courts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER)
  async addCourt(@Body('name') name: string) {
    return this.directoryService.addCourt(name);
  }

  @Post('courts/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER)
  async removeCourtPost(@Body('name') name: string) {
    return this.directoryService.removeCourt(name);
  }

  @Delete('courts/:name')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.LAWYER)
  async removeCourt(@Param('name') name: string) {
    const decodedName = decodeURIComponent(name);
    return this.directoryService.removeCourt(decodedName);
  }

  @Get('teams')
  async getTeams() {
    return this.directoryService.getTeams();
  }

  @Get('litigation-teams')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getLitigationTeams() { return this.directoryService.getLitigationTeams(); }

  @Post('litigation-teams')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createLitigationTeam(@Body('name') name: string) { return this.directoryService.createLitigationTeam(name); }

  @Get('litigation-teams/eligible-lawyers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async eligibleLitigationLawyers() { return this.directoryService.eligibleLitigationLawyers(); }

  @Patch('litigation-teams/eligible-lawyers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async assignLitigationLawyer(@Param('id') id: string, @Body('team') team: string) { return this.directoryService.assignLitigationLawyer(id, team); }

  @Post('teams')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async addTeam(@Body('name') name: string) {
    return this.directoryService.addTeam(name);
  }

  @Post('teams/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async removeTeamPost(@Body('name') name: string) {
    return this.directoryService.removeTeam(name);
  }

  @Delete('teams/:name')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async removeTeam(@Param('name') name: string) {
    const decodedName = decodeURIComponent(name);
    return this.directoryService.removeTeam(decodedName);
  }
}
