import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export const defaultTeams = [
  'TEAM ANCHOR',
  'TEAM ALPHA',
  'TITAN LITIGATION',
  'MARITIME PRACTICE GROUP',
  'CORPORATE DISPUTE TEAM',
];

const generalTeamMarkers = ['GENERAL', 'RETAINER', 'PROPERTY', 'REALTY', 'FAMILY', 'PRIVATE CLIENT'];

export const defaultCourts = [
  'HIGH COURT BENIN CITY',
  'HIGH COURT OKADA',
  'HIGH COURT EKIADOLOR',
  'EKIADOLOR MAGISTRATE COURT',
  'FEDERAL HIGH COURT',
  'HIGH COURT',
  'MAGISTRATE COURT OGBESON',
  'MAGISTRATE COURT OREDO',
  'MAGISTRATE COURT EGOR',
  'HIGH COURT WARRI',
  'HIGH COURT ABUDU',
  'FEDERAL HIGH COURT BENIN',
  'HIGH COURT BENIN',
  'APPEAL COURT BENIN CITY',
  'NATIONAL INDUSTRIAL COURT BENIN CITY',
  'AREA CUSTOMARY COURT EHOR',
  'CUSTOMARY COURT URHONIGBE',
  'HIGH COURT EHOR',
];

@Injectable()
export class DirectoryService implements OnModuleInit {
  private filePath = path.join(process.cwd(), 'data', 'directory.json');
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private courts: string[] = [];
  private teams: string[] = [];
  private isLoaded = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadData();
  }

  private async loadData() {
    // 1. Prioritize reading from Database (Firestore / persistent store)
    try {
      const record = await this.prisma.directory.findUnique({
        where: { id: 'settings' },
      });
      if (record && (Array.isArray(record.teams) || Array.isArray(record.courts))) {
        this.teams = Array.isArray(record.teams) ? record.teams : [...defaultTeams];
        this.courts = Array.isArray(record.courts) ? record.courts : [...defaultCourts];
        this.isLoaded = true;
        this.saveToFile();
        return;
      }
    } catch (dbErr: any) {
      if (this.isProduction) {
        throw new Error(`[DirectoryService] Persistent database unavailable in production: ${dbErr?.message || dbErr}`);
      }
      console.warn(
        '[DirectoryService] Could not read directory from DB, checking local file:',
        dbErr?.message || dbErr,
      );
    }

    // 2. Local JSON is development-only. Render disks are ephemeral and must
    // never become the authoritative copy of workspace data.
    if (this.isProduction) {
      this.courts = [...defaultCourts];
      this.teams = [...defaultTeams];
      this.isLoaded = true;
      await this.syncToDb();
      return;
    }

    // 2. Fallback to local JSON file (development only)
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.courts = Array.isArray(parsed.courts) ? parsed.courts : [...defaultCourts];
        this.teams = Array.isArray(parsed.teams) ? parsed.teams : [...defaultTeams];
        this.isLoaded = true;
        await this.syncToDb();
        return;
      }
    } catch (fileErr: any) {
      console.warn(
        '[DirectoryService] Could not read directory from file:',
        fileErr?.message || fileErr,
      );
    }

    // 3. Fallback to defaults
    this.courts = [...defaultCourts];
    this.teams = [...defaultTeams];
    this.isLoaded = true;
    await this.persistData();
  }

  private async syncToDb() {
    try {
      const existing = await this.prisma.directory.findUnique({
        where: { id: 'settings' },
      });
      if (existing) {
        await this.prisma.directory.update({
          where: { id: 'settings' },
          data: {
            teams: this.teams,
            courts: this.courts,
          },
        });
      } else {
        await this.prisma.directory.create({
          data: {
            id: 'settings',
            teams: this.teams,
            courts: this.courts,
          },
        });
      }
    } catch (dbErr: any) {
      if (this.isProduction) {
        throw new Error(`[DirectoryService] Persistent database write failed in production: ${dbErr?.message || dbErr}`);
      }
      console.warn(
        '[DirectoryService] DB sync warning:',
        dbErr?.message || dbErr,
      );
    }
  }

  private async persistData() {
    this.saveToFile();
    await this.syncToDb();
  }

  private saveToFile() {
    if (this.isProduction) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({ courts: this.courts, teams: this.teams }, null, 2),
        'utf-8',
      );
    } catch (e) {
      console.error('[DirectoryService] Failed to save directory data to file:', e);
    }
  }

  async getCourts(): Promise<string[]> {
    if (!this.isLoaded) await this.loadData();
    return [...this.courts];
  }

  async addCourt(name: string): Promise<string[]> {
    if (!this.isLoaded) await this.loadData();
    const clean = name.trim().toUpperCase();
    if (clean && !this.courts.includes(clean)) {
      this.courts.push(clean);
      await this.persistData();
    }
    return this.getCourts();
  }

  async removeCourt(name: string): Promise<string[]> {
    if (!this.isLoaded) await this.loadData();
    const clean = name.trim().toUpperCase();
    this.courts = this.courts.filter((c) => c.toUpperCase() !== clean);
    await this.persistData();
    return this.getCourts();
  }

  async getTeams(): Promise<string[]> {
    if (!this.isLoaded) await this.loadData();
    return [...this.teams];
  }

  async getLitigationTeams(): Promise<string[]> {
    return (await this.getTeams()).filter(team => !generalTeamMarkers.some(marker => team.toUpperCase().includes(marker)));
  }

  async createLitigationTeam(name: string): Promise<string[]> {
    const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').toUpperCase() : '';
    if (clean.length < 3 || clean.length > 80 || !/^[A-Z0-9 &.'-]+$/.test(clean)) throw new BadRequestException('Enter a team name of 3 to 80 letters');
    if (generalTeamMarkers.some(marker => clean.includes(marker))) throw new BadRequestException('Use a litigation team name');
    const existing = await this.getTeams();
    if (existing.some(team => team.toUpperCase() === clean)) throw new BadRequestException('Team already exists');
    const next = [...existing, clean];
    const record = await this.prisma.directory.findUnique({ where: { id: 'settings' } });
    if (record) await this.prisma.directory.update({ where: { id: 'settings' }, data: { teams: next } });
    else await this.prisma.directory.create({ data: { id: 'settings', teams: next, courts: await this.getCourts() } });
    this.teams = next;
    this.saveToFile();
    return this.getLitigationTeams();
  }

  async renameLitigationTeam(oldName: string, newName: string): Promise<string[]> {
    const oldTeam = oldName.trim().toUpperCase();
    const nextTeam = typeof newName === 'string' ? newName.trim().replace(/\s+/g, ' ').toUpperCase() : '';
    const teams = await this.getTeams();
    if (!(await this.getLitigationTeams()).includes(oldTeam)) throw new NotFoundException('Litigation team not found');
    if (nextTeam.length < 3 || nextTeam.length > 80 || !/^[A-Z0-9 &.'-]+$/.test(nextTeam) || generalTeamMarkers.some(marker => nextTeam.includes(marker))) throw new BadRequestException('Enter a valid litigation team name');
    if (teams.some(team => team.toUpperCase() === nextTeam && team !== oldTeam)) throw new BadRequestException('Team already exists');
    if (nextTeam === oldTeam) return this.getLitigationTeams();
    const record = await this.prisma.directory.findUnique({ where: { id: 'settings' } });
    if (!record) throw new NotFoundException('Team directory not found');
    await this.prisma.directory.update({ where: { id: 'settings' }, data: { teams: teams.map(team => team === oldTeam ? nextTeam : team) } });
    this.teams = teams.map(team => team === oldTeam ? nextTeam : team);
    const members = await this.prisma.workspaceUser.findMany({ where: { litigationTeam: oldTeam } });
    for (const member of members) await this.prisma.mutateWorkspaceUser(member.id, () => ({ litigationTeam: nextTeam }));
    await this.prisma.user.updateMany({ where: { litigationTeam: oldTeam }, data: { litigationTeam: nextTeam } });
    await this.prisma.case.updateMany({ where: { litigationTeam: oldTeam }, data: { litigationTeam: nextTeam } });
    await this.prisma.message.updateMany({ where: { teamName: oldTeam }, data: { teamName: nextTeam } });
    this.saveToFile();
    return this.getLitigationTeams();
  }

  async deleteLitigationTeam(name: string): Promise<string[]> {
    const team = name.trim().toUpperCase();
    const teams = await this.getTeams();
    if (!(await this.getLitigationTeams()).includes(team)) throw new NotFoundException('Litigation team not found');
    const record = await this.prisma.directory.findUnique({ where: { id: 'settings' } });
    if (!record) throw new NotFoundException('Team directory not found');
    await this.prisma.directory.update({ where: { id: 'settings' }, data: { teams: teams.filter(item => item !== team) } });
    this.teams = teams.filter(item => item !== team);
    const members = await this.prisma.workspaceUser.findMany({ where: { litigationTeam: team } });
    for (const member of members) await this.prisma.mutateWorkspaceUser(member.id, () => ({ litigationTeam: null }));
    await this.prisma.user.updateMany({ where: { litigationTeam: team }, data: { litigationTeam: null } });
    await this.prisma.case.updateMany({ where: { litigationTeam: team }, data: { litigationTeam: null } });
    this.saveToFile();
    return this.getLitigationTeams();
  }

  async eligibleLitigationLawyers() {
    const users = await this.prisma.workspaceUser.findMany();
    return users.filter((user: any) => user.active && user.role !== 'DEVELOPER' && ['USER', 'BOTH'].includes(user.grants?.['legal-staff'])).map((user: any) => ({
      id: user.id, name: user.name, email: user.email, litigationTeam: user.litigationTeam || null,
    }));
  }

  async getLawyerTeam(legacyId: string): Promise<string | null> {
    const legacy = await this.prisma.user.findUnique({ where: { id: legacyId } });
    const member = legacy?.email
      ? await this.prisma.workspaceUser.findUnique({ where: { email: legacy.email } })
      : null;
    if (!member?.active || !['USER', 'BOTH'].includes(member.grants?.['legal-staff'])) return null;
    const team = member.litigationTeam?.trim();
    return team && (await this.getLitigationTeams()).includes(team.toUpperCase()) ? team.toUpperCase() : null;
  }
  async assignLitigationLawyer(workspaceId: string, teamName: string) {
    const user = await this.prisma.workspaceUser.findUnique({ where: { id: workspaceId } });
    if (!user) throw new NotFoundException('Workspace user not found');
    if (!user.active || user.role === 'DEVELOPER' || !['USER', 'BOTH'].includes(user.grants?.['legal-staff'])) {
      throw new ForbiddenException('This user has no active Counsel Workspace grant');
    }
    const clean = typeof teamName === 'string' ? teamName.trim().toUpperCase() : '';
    if (clean && !(await this.getLitigationTeams()).includes(clean)) throw new BadRequestException('Choose an existing litigation team');
    const updated = await this.prisma.mutateWorkspaceUser(user.id, () => ({ litigationTeam: clean || null }));
    const legacy = await this.prisma.user.findUnique({ where: { email: user.email } });
    if (legacy) await this.prisma.user.update({ where: { id: legacy.id }, data: { litigationTeam: clean || null, department: 'LITIGATION' } });
    return { id: updated.id, name: updated.name, email: updated.email, litigationTeam: updated.litigationTeam || null };
  }

  async addTeam(name: string): Promise<string[]> {
    if (!this.isLoaded) await this.loadData();
    const clean = name.trim().toUpperCase();
    if (clean && !this.teams.includes(clean)) {
      this.teams.push(clean);
      await this.persistData();
    }
    return this.getTeams();
  }

  async removeTeam(name: string): Promise<string[]> {
    if (!this.isLoaded) await this.loadData();
    const clean = name.trim().toUpperCase();
    this.teams = this.teams.filter((t) => t.toUpperCase() !== clean);
    await this.persistData();
    return this.getTeams();
  }
}
