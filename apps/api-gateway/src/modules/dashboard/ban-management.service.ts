import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class BanManagementService {
  private readonly logger = new Logger(BanManagementService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createBan(companyId: string, data: { userId: string; banType: string; reason: string; banEndDate?: string; isPermanent?: boolean; policyId?: string; noShowRecordIds?: string }, bannedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existingBans = await this.prisma.transportBanRecord.findMany({ where: { companyId, userId: data.userId, status: 'ACTIVE' } });
    const totalBanCount = existingBans.length;
    const ban = await this.prisma.transportBanRecord.create({
      data: {
        companyId, userId: data.userId, banType: data.banType.toUpperCase(), reason: data.reason, banCount: totalBanCount + 1, totalBanCount: totalBanCount + 1,
        banEndDate: data.banEndDate ? new Date(data.banEndDate) : undefined, isPermanentBan: data.isPermanent ?? false,
        policyId: data.policyId, noShowRecordIds: data.noShowRecordIds, bannedBy,
      },
    });
    await this.audit.log({ companyId, userId: bannedBy, action: 'TRANSPORT_BAN_CREATED', entity: 'TransportBanRecord', entityId: ban.id, newValue: { targetUserId: data.userId, banType: data.banType } });
    return ban;
  }

  async getBans(companyId: string, params?: { status?: string; userId?: string; banType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.userId) where.userId = params.userId;
    if (params?.banType) where.banType = params.banType.toUpperCase();
    const [data, total] = await Promise.all([this.prisma.transportBanRecord.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.transportBanRecord.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async requestBanRemoval(companyId: string, banId: string, reason: string, requestedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const ban = await this.prisma.transportBanRecord.update({ where: { id: banId }, data: { liftRequestStatus: 'PENDING_MANAGER', liftRequestedBy: requestedBy, liftRequestedAt: new Date(), appealReason: reason } });
    const approval = await this.prisma.approvalWorkflow.create({
      data: { companyId, workflowType: 'BAN_REMOVAL', entityType: 'TransportBanRecord', entityId: banId, requestedBy, requestReason: reason, currentApproverRole: 'MANAGER' },
    });
    await this.audit.log({ companyId, userId: requestedBy, action: 'BAN_REMOVAL_REQUESTED', entity: 'TransportBanRecord', entityId: banId });
    return { ban, approvalWorkflowId: approval.id };
  }

  async approveBanRemoval(companyId: string, banId: string, decision: string, decidedBy: string, reason?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const newStatus = decision === 'APPROVE' ? 'LIFTED' : 'REJECTED';
    const ban = await this.prisma.transportBanRecord.update({ where: { id: banId }, data: { status: newStatus, liftRequestStatus: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', appealDecidedBy: decidedBy, appealDecidedAt: new Date(), appealNotes: reason } });
    await this.prisma.approvalWorkflow.updateMany({ where: { entityType: 'TransportBanRecord', entityId: banId, status: 'PENDING' }, data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', decidedBy, decidedAt: new Date(), decision: decision === 'APPROVE' ? 'APPROVE' : 'REJECT', decisionReason: reason } });
    await this.audit.log({ companyId, userId: decidedBy, action: `BAN_REMOVAL_${newStatus}`, entity: 'TransportBanRecord', entityId: banId });
    return ban;
  }

  async getBanHistory(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.transportBanRecord.findMany({ where: { companyId, userId }, orderBy: { createdAt: 'desc' } });
  }

  async isUserBanned(companyId: string, userId: string): Promise<{ banned: boolean; ban?: any }> {
    if (!this.prisma.isConnected()) return { banned: false };
    const ban = await this.prisma.transportBanRecord.findFirst({ where: { companyId, userId, status: 'ACTIVE' } });
    return { banned: !!ban, ban };
  }

  async getBanStats(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const [active, pending, lifted] = await Promise.all([
      this.prisma.transportBanRecord.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.transportBanRecord.count({ where: { companyId, liftRequestStatus: { in: ['PENDING_MANAGER', 'PENDING_TL', 'PENDING_DIRECTOR'] } } }),
      this.prisma.transportBanRecord.count({ where: { companyId, status: 'LIFTED' } }),
    ]);
    return { active, pending, lifted };
  }
}
