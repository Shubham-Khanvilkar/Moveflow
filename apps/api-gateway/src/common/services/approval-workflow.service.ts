import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit.service';

export interface CreateApprovalRequestDto {
  companyId: string;
  entityType: string;
  entityId: string;
  action: string;
  requestedBy: string;
  reason?: string;
  metadata?: any;
  expiresInHours?: number;
}

export interface ApprovalDecisionDto {
  requestId: string;
  approvedBy: string;
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
}

// Sensitive actions that require four-eyes approval
const SENSITIVE_ACTIONS: Record<string, string[]> = {
  RATE_CARD: ['CREATE', 'UPDATE', 'DELETE'],
  VENDOR_INVOICE: ['APPROVE', 'PAY'],
  ROLE_CHANGE: ['ESCALATE', 'DEESCALATE'],
  COMPANY_SETUP: ['CREATE', 'ACTIVATE', 'SUSPEND'],
  SITE_CREATE: ['CREATE', 'DELETE'],
  POLICY_CHANGE: ['UPDATE', 'DELETE'],
  LOCATION_CHANGE: ['APPROVE'],
  BUDGET: ['UPDATE', 'DELETE'],
};

@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Check if an action requires approval.
   */
  requiresApproval(entityType: string, action: string): boolean {
    const sensitive = SENSITIVE_ACTIONS[entityType];
    return sensitive ? sensitive.includes(action) : false;
  }

  /**
   * Create an approval request.
   */
  async createRequest(dto: CreateApprovalRequestDto) {
    if (!this.requiresApproval(dto.entityType, dto.action)) {
      throw new BadRequestException(
        `${dto.entityType}:${dto.action} does not require approval`,
      );
    }

    // Check for duplicate pending request
    const existing = await (this.prisma as any).approvalRequest.findFirst({
      where: {
        companyId: dto.companyId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new BadRequestException(
        `A pending approval request already exists for this ${dto.entityType}`,
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (dto.expiresInHours || 72));

    const request = await (this.prisma as any).approvalRequest.create({
      data: {
        companyId: dto.companyId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        requestedBy: dto.requestedBy,
        reason: dto.reason,
        metadata: dto.metadata || {},
        expiresAt,
      },
    });

    this.logger.log(
      `Approval request created: ${request.id} for ${dto.entityType}:${dto.action} by ${dto.requestedBy}`,
    );

    return { success: true, data: request };
  }

  /**
   * Make an approval decision (approve or reject).
   */
  async decide(dto: ApprovalDecisionDto) {
    const request = await (this.prisma as any).approvalRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Request is already ${request.status.toLowerCase()}`,
      );
    }

    // Check expiry
    if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
      await (this.prisma as any).approvalRequest.update({
        where: { id: dto.requestId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Approval request has expired');
    }

    // Prevent self-approval (four-eyes principle)
    if (request.requestedBy === dto.approvedBy && dto.decision === 'APPROVED') {
      throw new BadRequestException(
        'Cannot approve your own request (four-eyes principle)',
      );
    }

    const updated = await (this.prisma as any).approvalRequest.update({
      where: { id: dto.requestId },
      data: {
        status: dto.decision,
        approvedBy: dto.approvedBy,
        reason: dto.reason,
      },
    });

    await this.auditService.log({
      action: `APPROVAL_${dto.decision}`,
      entity: 'APPROVAL_REQUEST',
      entityId: dto.requestId,
      companyId: request.companyId,
      userId: dto.approvedBy,
      metadata: {
        entityType: request.entityType,
        entityId: request.entityId,
        action: request.action,
        requestedBy: request.requestedBy,
        decision: dto.decision,
        reason: dto.reason,
      },
    });

    this.logger.log(
      `Approval request ${dto.requestId} ${dto.decision} by ${dto.approvedBy}`,
    );

    return { success: true, data: updated };
  }

  /**
   * Cancel a pending approval request.
   */
  async cancel(requestId: string, userId: string) {
    const request = await (this.prisma as any).approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    // Only the requester or a platform admin can cancel
    if (request.requestedBy !== userId) {
      throw new BadRequestException('Only the requester can cancel this request');
    }

    const updated = await (this.prisma as any).approvalRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, data: updated };
  }

  /**
   * List pending approval requests for a company.
   */
  async listPending(companyId: string, query?: { entityType?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);

    const where: any = { companyId, status: 'PENDING' };
    if (query?.entityType) where.entityType = query.entityType;

    const [requests, total] = await Promise.all([
      (this.prisma as any).approvalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.prisma as any).approvalRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single approval request by ID.
   */
  async getById(requestId: string) {
    const request = await (this.prisma as any).approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    return { success: true, data: request };
  }
}
