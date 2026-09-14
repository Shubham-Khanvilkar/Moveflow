import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class AdminDelegationService {
  private readonly logger = new Logger(AdminDelegationService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // Create delegation — must not exceed delegator's own scope
  async createDelegation(companyId: string, data: {
    delegateUserId: string;
    scope: string;
    siteIds: string[];
    processIds: string[];
    shiftIds: string[];
    permissions: string[];
    reason?: string;
    expiresAt: string;
  }, delegatorUserId: string) {
    // Verify delegator has authority
    const delegator = await (this.prisma as any).userRoleAssignment.findFirst({
      where: { userId: delegatorUserId },
      include: { role: true },
    });
    if (!delegator) throw new BadRequestException('Delegator has no role assignment');

    // Verify delegate exists in same company
    const delegate = await (this.prisma as any).companyMembership.findFirst({
      where: { userId: data.delegateUserId, companyId, status: 'ACTIVE' },
    });
    if (!delegate) throw new NotFoundException('Delegate not found in company');

    // Validate scope doesn't exceed delegator's own
    const delegatorScopes = await (this.prisma as any).accessScope.findMany({
      where: { userId: delegatorUserId, companyId, isActive: true },
    });
    const delegatorSiteIds = delegatorScopes.map((s: any) => s.siteId).filter(Boolean);

    // Delegated sites must be subset of delegator's sites
    if (data.siteIds.length > 0 && delegatorSiteIds.length > 0) {
      const invalidSites = data.siteIds.filter((s: string) => !delegatorSiteIds.includes(s));
      if (invalidSites.length > 0) {
        throw new BadRequestException(`Cannot delegate sites outside your scope: ${invalidSites.join(', ')}`);
      }
    }

    const delegation = await (this.prisma as any).adminDelegation.create({
      data: {
        companyId,
        delegatorUserId,
        delegateUserId: data.delegateUserId,
        scope: data.scope,
        siteIds: data.siteIds,
        processIds: data.processIds,
        shiftIds: data.shiftIds,
        permissions: data.permissions,
        reason: data.reason,
        startAt: new Date(),
        expiresAt: new Date(data.expiresAt),
        isActive: true,
      },
    });

    await this.audit.log({
      companyId,
      userId: delegatorUserId,
      action: 'ADMIN_DELEGATION_CREATED',
      entity: 'AdminDelegation',
      entityId: delegation.id,
      newValue: {
        delegate: data.delegateUserId,
        scope: data.scope,
        sites: data.siteIds,
        permissions: data.permissions,
      },
    });

    return delegation;
  }

  // Revoke delegation
  async revokeDelegation(companyId: string, delegationId: string, revokedByUserId: string) {
    const delegation = await (this.prisma as any).adminDelegation.findFirst({
      where: { id: delegationId, companyId },
    });
    if (!delegation) throw new NotFoundException('Delegation not found');

    return (this.prisma as any).adminDelegation.update({
      where: { id: delegationId },
      data: { isActive: false, revokedAt: new Date(), revokedByUserId },
    });
  }

  // List active delegations for a user
  async listDelegations(companyId: string, userId: string) {
    return (this.prisma as any).adminDelegation.findMany({
      where: {
        companyId,
        OR: [{ delegatorUserId: userId }, { delegateUserId: userId }],
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Access preview — what can this user do?
  async accessPreview(companyId: string, userId: string) {
    const roles = await (this.prisma as any).userRoleAssignment.findMany({
      where: { userId },
      include: { role: true },
    });

    const scopes = await (this.prisma as any).accessScope.findMany({
      where: { userId, companyId, isActive: true },
    });

    const delegationsReceived = await (this.prisma as any).adminDelegation.findMany({
      where: { delegateUserId: userId, companyId, isActive: true },
    });

    const delegationsGiven = await (this.prisma as any).adminDelegation.findMany({
      where: { delegatorUserId: userId, companyId, isActive: true },
    });

    return {
      directRoles: roles.map((r: any) => ({ roleId: r.roleId, roleName: r.role.name })),
      directScopes: scopes.map((s: any) => ({ siteId: s.siteId, siteName: s.siteName, lobId: s.lobId })),
      delegationsReceived: delegationsReceived.map((d: any) => ({
        from: d.delegatorUserId,
        scope: d.scope,
        sites: d.siteIds,
        permissions: d.permissions,
        expiresAt: d.expiresAt,
      })),
      delegationsGiven: delegationsGiven.length,
    };
  }

  // Record scope assignment history
  async recordScopeChange(companyId: string, userId: string, action: string, previousScope: any, newScope: any, assignedByUserId: string, reason?: string) {
    return (this.prisma as any).adminScopeAssignment.create({
      data: {
        companyId,
        userId,
        assignedByUserId,
        action,
        previousScope,
        newScope,
        reason,
      },
    });
  }
}
