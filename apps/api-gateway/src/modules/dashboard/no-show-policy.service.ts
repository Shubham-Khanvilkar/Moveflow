import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class NoShowPolicyService {
  private readonly logger = new Logger(NoShowPolicyService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createPolicy(companyId: string, data: { policyName: string; description?: string; policyType?: string; departmentId?: string; shiftId?: string; zoneName?: string; maxNoShowsBeforeWarning?: number; maxNoShowsBeforeBan?: number; banDurationDays?: number; warningMessageTemplate?: string; banMessageTemplate?: string; autoBanEnabled?: boolean; appealEnabled?: boolean; appealCooldownDays?: number; noShowWindowMinutes?: number; gracePeriodMinutes?: number; effectiveFrom?: string; effectiveTo?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const policy = await this.prisma.noShowPolicy.create({
      data: {
        companyId, policyName: data.policyName, description: data.description, policyType: data.policyType?.toUpperCase() || 'GLOBAL',
        departmentId: data.departmentId, shiftId: data.shiftId, zoneName: data.zoneName,
        maxNoShowsBeforeWarning: data.maxNoShowsBeforeWarning ?? 2, maxNoShowsBeforeBan: data.maxNoShowsBeforeBan ?? 3,
        banDurationDays: data.banDurationDays ?? 7, warningMessageTemplate: data.warningMessageTemplate, banMessageTemplate: data.banMessageTemplate,
        autoBanEnabled: data.autoBanEnabled ?? true, appealEnabled: data.appealEnabled ?? true, appealCooldownDays: data.appealCooldownDays ?? 30,
        noShowWindowMinutes: data.noShowWindowMinutes ?? 15, gracePeriodMinutes: data.gracePeriodMinutes ?? 5,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(), effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
        createdBy,
      },
    });
    await this.audit.log({ companyId, userId: createdBy, action: 'NOSHOW_POLICY_CREATED', entity: 'NoShowPolicy', entityId: policy.id });
    return policy;
  }

  async getPolicies(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.noShowPolicy.findMany({ where: { companyId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async updatePolicy(companyId: string, policyId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.noShowPolicy.update({ where: { id: policyId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'NOSHOW_POLICY_UPDATED', entity: 'NoShowPolicy', entityId: policyId, newValue: data });
    return updated;
  }

  async recordNoShow(companyId: string, userId: string, bookingId?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const policies = await this.prisma.noShowPolicy.findMany({ where: { companyId, isActive: true, policyType: 'GLOBAL' } });
    const policy = policies[0];
    if (!policy) return { action: 'NONE' };

    const existingRecords = await this.prisma.employeeNoShowRecord.findMany({ where: { companyId, userId } });
    const noShowCount = existingRecords.length;

    const record = await this.prisma.employeeNoShowRecord.create({
      data: { companyId, userId, bookingId, tripDate: new Date(), policyId: policy.id, actionTaken: 'NONE' },
    });

    if (noShowCount + 1 >= policy.maxNoShowsBeforeBan && policy.autoBanEnabled) {
      const banExpiry = new Date(); banExpiry.setDate(banExpiry.getDate() + policy.banDurationDays);
      await this.prisma.employeeNoShowRecord.update({ where: { id: record.id }, data: { actionTaken: 'BAN', banExpiry } });
      return { action: 'BAN', banExpiry, noShowCount: noShowCount + 1 };
    }

    if (noShowCount + 1 >= policy.maxNoShowsBeforeWarning) {
      await this.prisma.employeeNoShowRecord.update({ where: { id: record.id }, data: { actionTaken: 'WARNING' } });
      return { action: 'WARNING', noShowCount: noShowCount + 1 };
    }

    return { action: 'NONE', noShowCount: noShowCount + 1 };
  }

  async getNoShowRecords(companyId: string, params?: { userId?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.userId) where.userId = params.userId;
    const [data, total] = await Promise.all([this.prisma.employeeNoShowRecord.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.employeeNoShowRecord.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async appealNoShow(companyId: string, recordId: string, reason: string, userId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.employeeNoShowRecord.update({ where: { id: recordId }, data: { appealStatus: 'PENDING', appealReason: reason, appealedAt: new Date() } });
  }

  async decideAppeal(companyId: string, recordId: string, decision: string, decidedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.employeeNoShowRecord.update({ where: { id: recordId }, data: { appealStatus: decision.toUpperCase(), appealDecidedBy: decidedBy, appealDecidedAt: new Date() } });
  }
}
