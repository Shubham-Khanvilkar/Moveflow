import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class AppealService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async submitAppeal(companyId: string, data: {
    userId: string;
    noShowId: string;
    reason: string;
    evidence?: string;
  }) {
    const noShow = await (this.prisma as any).noShowRecord.findFirst({
      where: { id: data.noShowId, companyId },
    });
    if (!noShow) throw new NotFoundException('No-show record not found');

    const appeal = await (this.prisma as any).appeal.create({
      data: {
        companyId,
        userId: data.userId,
        noShowId: data.noShowId,
        reason: data.reason,
        evidence: data.evidence,
        status: 'PENDING',
      },
    });

    await this.audit.log({
      companyId, userId: data.userId, action: 'APPEAL_SUBMITTED', entity: 'Appeal',
      entityId: appeal.id,
    });

    return { appealId: appeal.id, status: 'PENDING' };
  }

  async escalateAppeal(companyId: string, appealId: string, escalatedBy: string) {
    const appeal = await (this.prisma as any).appeal.findFirst({
      where: { id: appealId, companyId },
    });
    if (!appeal) throw new NotFoundException('Appeal not found');

    await (this.prisma as any).appeal.update({
      where: { id: appealId },
      data: { status: 'ESCALATED', escalatedBy, escalatedAt: new Date() } as any,
    });

    await this.audit.log({
      companyId, userId: escalatedBy, action: 'APPEAL_ESCALATED', entity: 'Appeal', entityId: appealId,
    });

    return { escalated: true };
  }

  async decideAppeal(companyId: string, appealId: string, decision: 'UPHELD' | 'OVERTURNED', decidedBy: string, reason?: string) {
    const appeal = await (this.prisma as any).appeal.findFirst({
      where: { id: appealId, companyId },
    });
    if (!appeal) throw new NotFoundException('Appeal not found');

    await (this.prisma as any).appeal.update({
      where: { id: appealId },
      data: { status: 'DECIDED', decision, decidedBy, decidedAt: new Date(), decisionReason: reason } as any,
    });

    if (decision === 'OVERTURNED') {
      await (this.prisma as any).noShowRecord.update({
        where: { id: appeal.noShowId },
        data: { status: 'APPEAL_UPHELD' } as any,
      });
    }

    await this.audit.log({
      companyId, userId: decidedBy, action: 'APPEAL_DECIDED', entity: 'Appeal',
      entityId: appealId, newValue: { decision, reason },
    });

    return { decision, appealId };
  }

  async getAppeals(companyId: string, params: { status?: string; page?: number }) {
    const page = params.page || 1;
    const take = 50;
    const where: any = { companyId };
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      (this.prisma as any).appeal.findMany({
        where, skip: (page - 1) * take, take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      (this.prisma as any).appeal.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / take) };
  }

  async checkSLA(companyId: string) {
    const pendingAppeals = await (this.prisma as any).appeal.findMany({
      where: { companyId, status: 'PENDING' },
    });

    const now = new Date();
    const slaHours = 48;
    const breaches = pendingAppeals.filter((a: any) => {
      const elapsed = now.getTime() - new Date(a.createdAt).getTime();
      return elapsed > slaHours * 60 * 60 * 1000;
    });

    return {
      totalPending: pendingAppeals.length,
      slaBreaches: breaches.length,
      slaHours,
      overdueAppeals: breaches.map((a: any) => ({
        id: a.id,
        userId: a.userId,
        createdAt: a.createdAt,
        hoursElapsed: Math.round((now.getTime() - new Date(a.createdAt).getTime()) / (60 * 60 * 1000)),
      })),
    };
  }
}
