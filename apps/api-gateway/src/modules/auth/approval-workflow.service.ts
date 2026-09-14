import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface CreateApprovalRequestInput {
  companyId: string;
  entityType: string; // RATE_CARD | VENDOR_INVOICE | ROLE_CHANGE | COMPANY_SETUP | SITE_CREATE | POLICY_CHANGE | LOCATION_CHANGE
  entityId: string;
  action: string; // CREATE | UPDATE | DELETE | ACTIVATE | DEACTIVATE
  requestedBy: string;
  reason?: string;
  metadata?: any;
  expiresAt?: Date;
}

export interface ApprovalDecision {
  id: string;
  companyId: string;
  approvedBy: string;
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
}

/**
 * ApprovalWorkflowService implements four-eyes / maker-checker approval.
 *
 * Sensitive actions require approval:
 * - Billing changes
 * - Vendor rate changes
 * - Role escalation
 * - Company creation
 * - Site creation
 * - Process changes
 * - Major transport-policy changes
 * - Financial adjustments
 * - Location changes
 */
@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an approval request. Returns the request record.
   */
  async createRequest(input: CreateApprovalRequestInput) {
    // Validate entity type
    const validEntityTypes = [
      'RATE_CARD', 'VENDOR_INVOICE', 'ROLE_CHANGE', 'COMPANY_SETUP',
      'SITE_CREATE', 'POLICY_CHANGE', 'LOCATION_CHANGE',
    ];
    if (!validEntityTypes.includes(input.entityType)) {
      throw new BadRequestException(`Invalid entity type: ${input.entityType}`);
    }

    // Validate action
    const validActions = ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'];
    if (!validActions.includes(input.action)) {
      throw new BadRequestException(`Invalid action: ${input.action}`);
    }

    // Check for duplicate pending request
    const existing = await this.prisma.approvalRequest.findFirst({
      where: {
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        status: 'PENDING',
      },
    });
    if (existing) {
      throw new BadRequestException(`Approval request already pending for this ${input.entityType}`);
    }

    const request = await this.prisma.approvalRequest.create({
      data: {
        companyId: input.companyId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        requestedBy: input.requestedBy,
        reason: input.reason,
        metadata: input.metadata || {},
        expiresAt: input.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      },
    });

    this.logger.log(`Approval request created: ${request.id} for ${input.entityType} ${input.action}`);

    return request;
  }

  /**
   * Approve a pending request.
   */
  async approveRequest(id: string, approvedBy: string, reason?: string) {
    const request = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }
    if (request.requestedBy === approvedBy) {
      throw new ForbiddenException('Cannot approve your own request (four-eyes rule)');
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new BadRequestException('Request has expired');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        reason,
      },
    });

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId: approvedBy,
        action: 'APPROVAL_GRANTED',
        entity: request.entityType,
        entityId: request.entityId,
        oldValue: { status: 'PENDING' },
        newValue: { status: 'APPROVED', reason },
        companyId: request.companyId,
      },
    });

    this.logger.log(`Approval request ${id} approved by ${approvedBy}`);

    return updated;
  }

  /**
   * Reject a pending request.
   */
  async rejectRequest(id: string, rejectedBy: string, reason: string) {
    const request = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }
    if (!reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: rejectedBy,
        reason,
      },
    });

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId: rejectedBy,
        action: 'APPROVAL_REJECTED',
        entity: request.entityType,
        entityId: request.entityId,
        oldValue: { status: 'PENDING' },
        newValue: { status: 'REJECTED', reason },
        companyId: request.companyId,
      },
    });

    this.logger.log(`Approval request ${id} rejected by ${rejectedBy}: ${reason}`);

    return updated;
  }

  /**
   * Get pending approval requests for a company or user.
   */
  async getPendingRequests(companyId: string, userId?: string) {
    const where: any = { companyId, status: 'PENDING' };
    if (userId) {
      // User can see requests they can approve
      where.requestedBy = { not: userId };
    }

    return this.prisma.approvalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get approval request by ID.
   */
  async getRequestById(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Approval request not found');
    return request;
  }

  /**
   * Check if an entity type + action requires approval.
   * Returns true if approval is required.
   */
  requiresApproval(entityType: string, action: string): boolean {
    const requiredMap: Record<string, string[]> = {
      RATE_CARD: ['CREATE', 'UPDATE', 'DELETE'],
      VENDOR_INVOICE: ['APPROVE', 'PAY'],
      ROLE_CHANGE: ['UPDATE', 'ACTIVATE', 'DEACTIVATE'],
      COMPANY_SETUP: ['CREATE', 'ACTIVATE', 'DEACTIVATE'],
      SITE_CREATE: ['CREATE', 'DELETE'],
      POLICY_CHANGE: ['UPDATE', 'DELETE'],
      LOCATION_CHANGE: ['APPROVE'],
    };

    const requiredActions = requiredMap[entityType];
    if (!requiredActions) return false;
    return requiredActions.includes(action);
  }
}
