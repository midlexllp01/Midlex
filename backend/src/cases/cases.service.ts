import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Case, CaseStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CasesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(data: Prisma.CaseUncheckedCreateInput): Promise<Case> {
    const createdCase = await this.prisma.case.create({ data });
    // Automatically seed initial timeline event
    try {
      await this.prisma.caseTimeline.create({
        data: {
          caseId: createdCase.id,
          title: 'Case Matter Registered',
          description: 'Legal case matter opened and recorded in Midlex LLP Registry.',
          status: 'OPEN',
          date: createdCase.createdAt || new Date(),
        },
      });
    } catch (e) {
      console.warn('[cases] Failed to seed initial timeline event:', e);
    }
    return createdCase;
  }

  async findAll(): Promise<Case[]> {
    return this.prisma.case.findMany({
      include: { client: true, lawyer: true, timeline: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async findOne(id: string): Promise<Case | null> {
    const caseItem = await this.prisma.case.findUnique({
      where: { id },
      include: {
        client: true,
        lawyer: true,
        documents: true,
        messages: { include: { sender: true } },
        courtDates: true,
        timeline: true,
      },
    });

    // If timeline is empty, auto-generate default start timeline entry
    if (caseItem && (!caseItem.timeline || caseItem.timeline.length === 0)) {
      try {
        const startEvent = await this.prisma.caseTimeline.create({
          data: {
            caseId: caseItem.id,
            title: 'Case Matter Registered',
            description: 'Legal case matter opened and recorded in Midlex LLP Registry.',
            status: 'OPEN',
            date: caseItem.createdAt || new Date(),
          },
        });
        caseItem.timeline = [startEvent];
      } catch (e) {
        console.warn('[cases] Failed to auto-create start timeline entry:', e);
      }
    }

    return caseItem;
  }

  async updateStatus(id: string, status: CaseStatus): Promise<Case> {
    const updated = await this.prisma.case.update({
      where: { id },
      data: { status },
    });

    // Auto post timeline update for status changes
    try {
      const isResolved = status === 'COMPLETED' || status === 'CLOSED';
      await this.prisma.caseTimeline.create({
        data: {
          caseId: id,
          title: isResolved ? 'Case Matter Resolved & Closed' : `Case Status Updated to ${status.replace('_', ' ')}`,
          description: isResolved ? 'Legal proceedings and client case matter concluded successfully.' : `Status progressed to ${status}.`,
          status,
          date: new Date(),
        },
      });

      // Send notification to client
      if (updated.clientId) {
        await this.notificationsService.create({
          recipientId: updated.clientId,
          title: `Case Status Update: ${status.replace('_', ' ')}`,
          message: `Your case status for "${updated.title}" has been updated to ${status.replace('_', ' ')}.`,
          link: `/dashboard/cases/${id}`,
          type: 'CASE_STATUS_UPDATE',
        });
      }
    } catch (e) {
      console.warn('[cases] Failed to log timeline status update or notification:', e);
    }

    return updated;
  }

  async addTimelineEvent(caseId: string, data: { title: string; description?: string; status?: string; date?: string; createdById?: string; createdByName?: string }) {
    const timelineStatus = data.status || 'IN_PROGRESS';
    const timeline = await this.prisma.caseTimeline.create({
      data: {
        caseId,
        title: data.title.trim(),
        description: data.description?.trim() || '',
        status: timelineStatus,
        date: data.date ? new Date(data.date) : new Date(),
        createdById: data.createdById,
        createdByName: data.createdByName,
      },
    });

    // Sync Case.status in database to match real timeline status milestone
    try {
      const normStatus = timelineStatus.trim().toUpperCase();
      let mappedStatus: CaseStatus | undefined;
      if (normStatus === 'OPEN' || normStatus === 'NEW') mappedStatus = CaseStatus.OPEN;
      else if (normStatus === 'IN_PROGRESS' || normStatus === 'HEARING' || normStatus.includes('PRE-TRIAL')) mappedStatus = CaseStatus.IN_PROGRESS;
      else if (normStatus === 'COMPLETED' || normStatus === 'RESOLVED') mappedStatus = CaseStatus.COMPLETED;
      else if (normStatus === 'CLOSED') mappedStatus = CaseStatus.CLOSED;

      if (mappedStatus) {
        await this.prisma.case.update({
          where: { id: caseId },
          data: { status: mappedStatus },
        });
      }
    } catch (e) {
      console.warn('[cases] Failed to sync case status with timeline event:', e);
    }

    // Send notification to client
    try {
      const caseItem = await this.prisma.case.findUnique({ where: { id: caseId } });
      if (caseItem && caseItem.clientId) {
        await this.notificationsService.create({
          recipientId: caseItem.clientId,
          title: `Timeline Update: ${data.title.trim()}`,
          message: data.description?.trim() || `New progress update posted for ${caseItem.title}`,
          link: `/dashboard/cases/${caseId}`,
          type: 'TIMELINE_UPDATE',
        });
      }
    } catch (e) {
      console.warn('[cases] Failed to create notification for timeline update:', e);
    }

    return timeline;
  }

  async getTimeline(caseId: string) {
    const events = await this.prisma.caseTimeline.findMany({
      where: { caseId },
      orderBy: { date: 'asc' },
    });
    return events;
  }

  async deleteTimelineEvent(timelineId: string) {
    return this.prisma.caseTimeline.delete({
      where: { id: timelineId },
    });
  }

  async updateCase(id: string, data: { title?: string; description?: string; suitNumber?: string; court?: string; litigationTeam?: string; stage?: string; pendingTask?: string; category?: string; subCategory?: string }): Promise<Case> {
    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.suitNumber !== undefined ? { suitNumber: data.suitNumber.trim() } : {}),
        ...(data.court !== undefined ? { court: data.court.trim() } : {}),
        ...(data.litigationTeam !== undefined ? { litigationTeam: data.litigationTeam.trim() } : {}),
        ...(data.stage !== undefined ? { stage: data.stage.trim() } : {}),
        ...(data.pendingTask !== undefined ? { pendingTask: data.pendingTask.trim() } : {}),
        ...(data.category !== undefined ? { category: String(data.category).toUpperCase() } : {}),
        ...(data.subCategory !== undefined ? { subCategory: data.subCategory.trim() } : {}),
      },
      include: { client: true, lawyer: true, timeline: true },
    });

    // Send notification to client
    try {
      if (updated.clientId) {
        await this.notificationsService.create({
          recipientId: updated.clientId,
          title: `Case Details Updated`,
          message: `Updates were made to your case: "${updated.title}".`,
          link: `/dashboard/cases/${id}`,
          type: 'CASE_UPDATE',
        });
      }
    } catch (e) {
      console.warn('[cases] Failed to create notification for case update:', e);
    }

    return updated;
  }

  async assignTeam(caseId: string, data: { litigationTeam?: string; lawyerId?: string }): Promise<Case> {
    const teamName = data.litigationTeam?.trim() || '';
    const existingCase = await this.prisma.case.findUnique({ where: { id: caseId } });
    const workspace =
      String(existingCase?.category || 'LITIGATION').toUpperCase() === 'GENERAL'
        ? 'GENERAL'
        : 'LITIGATION';
    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        ...(teamName ? { litigationTeam: teamName } : {}),
        ...(data.lawyerId ? { lawyerId: data.lawyerId } : {}),
      },
      include: { client: true, lawyer: true },
    });

    // Notify lawyers belonging to this litigation team
    if (teamName) {
      try {
        const teamLawyers = await this.prisma.user.findMany({
          where: {
            litigationTeam: teamName,
            role: 'LAWYER',
            department: workspace,
            status: 'ACTIVE',
          },
        });

        await Promise.all(
          teamLawyers.map((lawyer: any) =>
            this.notificationsService.create({
              recipientId: lawyer.id,
              title: `New ${workspace === 'GENERAL' ? 'General Retainer Matter' : 'Litigation Case'} Allocated to ${teamName}`,
              message: `"${updated.title}" has been allocated to your ${workspace === 'GENERAL' ? 'General Retainer' : 'Litigation'} Team (${teamName}).`,
              link: `/dashboard/cases/${caseId}`,
              type: 'CLIENT_ASSIGNED',
            }),
          ),
        );
      } catch (e) {
        console.warn('[cases] Failed to notify team lawyers:', e);
      }
    } else if (data.lawyerId) {
      await this.notificationsService.create({
        recipientId: data.lawyerId,
        title: 'New case assigned',
        message: `${updated.client?.name || 'A client'} has been allocated to you for ${updated.title}.`,
        link: `/dashboard/cases/${caseId}`,
        type: 'CLIENT_ASSIGNED',
      });
    }

    // Notify client of team assignment
    if (updated.clientId) {
      try {
        await this.notificationsService.create({
          recipientId: updated.clientId,
          title: `${workspace === 'GENERAL' ? 'General Retainer' : 'Litigation'} Team Assigned`,
          message: `Your matter "${updated.title}" has been allocated to Midlex ${workspace === 'GENERAL' ? 'General Retainer' : 'Litigation'} Team: ${teamName || updated.lawyer?.name || 'Legal Counsel'}.`,
          link: `/dashboard/cases/${caseId}`,
          type: 'TEAM_ASSIGNED',
        });
      } catch (e) {
        console.warn('[cases] Failed to notify client of team assignment:', e);
      }
    }

    return updated;
  }

  async assignLawyer(caseId: string, lawyerId: string): Promise<Case> {
    return this.assignTeam(caseId, { lawyerId });
  }

  async findByLawyer(lawyerId: string): Promise<Case[]> {
    const lawyerUser = await this.prisma.user.findUnique({ where: { id: lawyerId } });
    const workspaceUser = lawyerUser?.email
      ? await this.prisma.workspaceUser.findUnique({ where: { email: lawyerUser.email } })
      : null;
    const team = workspaceUser?.active && ['USER', 'BOTH'].includes(workspaceUser.grants?.['legal-staff'])
      ? workspaceUser.litigationTeam?.trim()
      : null;

    // The workspace assignment is authoritative. A legacy lawyerId or stale
    // local team must never grant access to an unassigned directory.
    if (!team) return [];

    const allCases = await this.prisma.case.findMany({
      include: { client: true, lawyer: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });

    return allCases.filter(
      (c: any) =>
        c.litigationTeam && c.litigationTeam.trim().toUpperCase() === team.toUpperCase(),
    );
  }

  async timelineCaseId(timelineId: string): Promise<string | null> {
    const event = await this.prisma.caseTimeline.findUnique({ where: { id: timelineId } });
    return event?.caseId || null;
  }

  async findByClient(clientId: string): Promise<Case[]> {
    return this.prisma.case.findMany({
      where: { clientId },
      include: { lawyer: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async findPublicShare(id: string): Promise<any> {
    const caseData = await this.prisma.case.findUnique({
      where: { id },
      include: {
        client: { select: { name: true } },
        lawyer: { select: { name: true } },
        documents: true,
      },
    });

    if (!caseData) return null;

    return {
      id: caseData.id,
      title: caseData.title,
      description: caseData.description,
      status: caseData.status,
      litigationTeam: (caseData as any).litigationTeam,
      createdAt: caseData.createdAt,
      clientName: (caseData as any).client?.name || 'Client',
      lawyerName: (caseData as any).litigationTeam ? `Litigation Team: ${(caseData as any).litigationTeam}` : (caseData as any).lawyer?.name || 'Midlex Legal Counsel',
      documents: caseData.documents || [],
    };
  }

  async getAllocations(): Promise<any[]> {
    const cases = await this.prisma.case.findMany({
      include: {
        client: true,
        lawyer: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return cases.map((c: any) => {
      const payments = c.payments || [];
      const totalPaid = payments
        .filter((p: any) => p.status === 'SUCCESS')
        .reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
      const totalPending = payments
        .filter((p: any) => p.status === 'PENDING')
        .reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

      return {
        id: c.id,
        title: c.title,
        status: c.status,
        createdAt: c.createdAt,
        client: c.client
          ? { id: c.client.id, name: c.client.name, email: c.client.email, phone: c.client.phone }
          : { name: 'Client', email: '-' },
        lawyer: c.lawyer
          ? { id: c.lawyer.id, name: c.lawyer.name, email: c.lawyer.email, phone: c.lawyer.phone }
          : { name: 'Unassigned', email: 'Awaiting Lawyer' },
        totalPaid,
        totalPending,
        paymentCount: payments.length,
      };
    });
  }
}
