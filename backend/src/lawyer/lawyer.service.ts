import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaseStatus } from '@prisma/client';

@Injectable()
export class LawyerService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(lawyerId: string) {
    const assignedCases = await this.getMyCases(lawyerId);
    const activeCases = assignedCases.filter((c: any) => ![CaseStatus.CLOSED, CaseStatus.COMPLETED].includes(c.status)).length;
    const totalClients = new Set(assignedCases.map((c: any) => c.clientId));
    const assignedCaseIds = new Set(assignedCases.map((c: any) => c.id));
    const upcomingCourts = (
      await this.prisma.courtDate.findMany({
        where: { date: { gte: new Date() } },
      })
    ).filter((date: any) => assignedCaseIds.has(date.caseId)).length;

    return {
      activeCases,
      totalClients: totalClients.size,
      upcomingCourts,
      newMessages: 5, // Placeholder for real message count
    };
  }

  async getMyCases(lawyerId: string) {
    const lawyerUser = await this.prisma.user.findUnique({ where: { id: lawyerId } });
    const workspaceUser = lawyerUser?.email
      ? await this.prisma.workspaceUser.findUnique({ where: { email: lawyerUser.email } })
      : null;
    const team = workspaceUser?.active && ['USER', 'BOTH'].includes(workspaceUser.grants?.['legal-staff'])
      ? workspaceUser.litigationTeam?.trim()
      : null;

    if (!team) return [];

    const allCases = await this.prisma.case.findMany({
      include: {
        client: { select: { name: true, phone: true, email: true } },
        lawyer: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return allCases.filter(
      (c: any) =>
        c.litigationTeam && c.litigationTeam.trim().toUpperCase() === team.toUpperCase(),
    );
  }

  async getUpcomingHearings(lawyerId: string) {
    const cases = await this.getMyCases(lawyerId);
    const caseIds = new Set(cases.map((c: any) => c.id));
    const hearings = await this.prisma.courtDate.findMany({
      where: { date: { gte: new Date() } },
      include: {
        case: { select: { title: true } },
      },
      orderBy: { date: 'asc' },
    });
    return hearings.filter((date: any) => caseIds.has(date.caseId)).slice(0, 5);
  }
}
