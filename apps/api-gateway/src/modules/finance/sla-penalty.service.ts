import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class SLAPenaltyService {
  private readonly logger = new Logger(SLAPenaltyService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createPenalty(companyId: string, data: {
    vendorId: string;
    period: string;
    slaMetric: string;
    targetValue: number;
    actualValue: number;
    penaltyAmount?: number;
    notes?: string;
  }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const penaltyAmount = data.penaltyAmount || Math.max(0, (data.targetValue - data.actualValue) * 100);

    const penalty = await this.prisma.vendorSLAPenalty.create({
      data: {
        companyId,
        vendorId: data.vendorId,
        period: data.period,
        slaMetric: data.slaMetric.toUpperCase(),
        targetValue: data.targetValue,
        actualValue: data.actualValue,
        penaltyAmount,
        notes: data.notes,
      },
    });

    await this.audit.log({ companyId, userId: createdBy, action: 'SLA_PENALTY_RECORDED', entity: 'VendorSLAPenalty', entityId: penalty.id, newValue: { vendorId: data.vendorId, penaltyAmount } });
    return penalty;
  }

  async getPenalties(companyId: string, params?: { vendorId?: string; slaMetric?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.vendorId) where.vendorId = params.vendorId;
    if (params?.slaMetric) where.slaMetric = params.slaMetric.toUpperCase();

    const [penalties, total] = await Promise.all([
      this.prisma.vendorSLAPenalty.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.vendorSLAPenalty.count({ where }),
    ]);

    return { data: penalties, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async approvePenalty(companyId: string, penaltyId: string, approvedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const penalty = await this.prisma.vendorSLAPenalty.update({
      where: { id: penaltyId },
      data: { status: 'APPLIED', appliedAt: new Date() },
    });

    await this.audit.log({ companyId, userId: approvedBy, action: 'SLA_PENALTY_APPROVED', entity: 'VendorSLAPenalty', entityId: penaltyId });
    return penalty;
  }

  async recordPenaltyDeduction(companyId: string, penaltyId: string, invoiceId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const penalty = await this.prisma.vendorSLAPenalty.update({
      where: { id: penaltyId },
      data: { status: 'APPLIED', appliedAt: new Date() },
    });

    return penalty;
  }

  async getVendorSLASummary(companyId: string, vendorId: string, fiscalYear: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const penalties = await this.prisma.vendorSLAPenalty.findMany({
      where: { companyId, vendorId, period: { gte: `${fiscalYear}-01`, lte: `${fiscalYear}-12` } },
    });

    const totalPenaltyAmount = penalties.reduce((sum, p) => sum + p.penaltyAmount, 0);
    return { penalties, totalPenaltyAmount, count: penalties.length };
  }
}
