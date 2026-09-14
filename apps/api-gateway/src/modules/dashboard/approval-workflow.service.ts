import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createApprovalRequest(companyId: string, data: { workflowType: string; entityType: string; entityId: string; requestReason: string; priority?: string; metadata?: any }, requestedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const levels = await this.prisma.approvalLevel.findMany({ where: { companyId, workflowType: data.workflowType, isActive: true }, orderBy: { level: 'asc' } });
    const firstLevel = levels[0];
    if (!firstLevel) throw new BadRequestException(`No approval levels configured for ${data.workflowType}`);

    const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 72);
    const approval = await this.prisma.approvalWorkflow.create({
      data: {
        companyId, workflowType: data.workflowType, entityType: data.entityType, entityId: data.entityId,
        requestedBy, requestReason: data.requestReason, priority: data.priority || 'NORMAL',
        currentApproverRole: firstLevel.approverRole, escalationLevel: 0, maxEscalationLevel: levels.length,
        metadata: data.metadata || {}, expiresAt,
      },
    });
    await this.audit.log({ companyId, userId: requestedBy, action: 'APPROVAL_REQUESTED', entity: 'ApprovalWorkflow', entityId: approval.id, newValue: { workflowType: data.workflowType } });
    return approval;
  }

  async getPendingApprovals(companyId: string, approverRole?: string, approverUserId?: string) {
    if (!this.prisma.isConnected()) return [];
    const where: any = { companyId, status: 'PENDING' };
    if (approverRole) where.currentApproverRole = approverRole;
    return this.prisma.approvalWorkflow.findMany({ where, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] });
  }

  async getMyRequests(companyId: string, requestedBy: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.approvalWorkflow.findMany({ where: { companyId, requestedBy }, orderBy: { createdAt: 'desc' } });
  }

  async approveRequest(companyId: string, approvalId: string, decision: string, decidedBy: string, reason?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const approval = await this.prisma.approvalWorkflow.findFirst({ where: { id: approvalId, companyId } });
    if (!approval) throw new NotFoundException('Approval request not found');
    if (approval.status !== 'PENDING') throw new BadRequestException('Request already processed');

    if (decision === 'APPROVE') {
      const updated = await this.prisma.approvalWorkflow.update({
        where: { id: approvalId }, data: { status: 'APPROVED', decidedBy, decidedAt: new Date(), decision: 'APPROVE', decisionReason: reason },
      });
      await this.audit.log({ companyId, userId: decidedBy, action: 'APPROVAL_APPROVED', entity: 'ApprovalWorkflow', entityId: approvalId });
      return updated;
    }

    const updated = await this.prisma.approvalWorkflow.update({
      where: { id: approvalId }, data: { status: 'REJECTED', decidedBy, decidedAt: new Date(), decision: 'REJECT', decisionReason: reason },
    });
    await this.audit.log({ companyId, userId: decidedBy, action: 'APPROVAL_REJECTED', entity: 'ApprovalWorkflow', entityId: approvalId });
    return updated;
  }

  async escalateRequest(companyId: string, approvalId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const approval = await this.prisma.approvalWorkflow.findFirst({ where: { id: approvalId } });
    if (!approval) throw new NotFoundException('Not found');
    const nextLevel = await this.prisma.approvalLevel.findFirst({
      where: { companyId, workflowType: approval.workflowType, level: approval.escalationLevel + 1, isActive: true },
    });
    if (!nextLevel) {
      await this.prisma.approvalWorkflow.update({ where: { id: approvalId }, data: { status: 'ESCALATED' } });
      return { escalated: true, finalEscalation: true };
    }
    const updated = await this.prisma.approvalWorkflow.update({
      where: { id: approvalId }, data: { escalationLevel: approval.escalationLevel + 1, currentApproverRole: nextLevel.approverRole, currentApproverId: nextLevel.approverUserIds?.split(',')[0] },
    });
    return updated;
  }

  async cancelRequest(companyId: string, approvalId: string, cancelledBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.approvalWorkflow.update({ where: { id: approvalId }, data: { status: 'CANCELLED' } });
  }

  async getApprovalStats(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.approvalWorkflow.count({ where: { companyId, status: 'PENDING' } }),
      this.prisma.approvalWorkflow.count({ where: { companyId, status: 'APPROVED' } }),
      this.prisma.approvalWorkflow.count({ where: { companyId, status: 'REJECTED' } }),
    ]);
    return { pending, approved, rejected };
  }

  async getWorkflowHistory(companyId: string, params?: { workflowType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.workflowType) where.workflowType = params.workflowType;
    const [data, total] = await Promise.all([this.prisma.approvalWorkflow.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.approvalWorkflow.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
