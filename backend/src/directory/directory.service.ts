import { Injectable, OnModuleInit } from '@nestjs/common';
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
