import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

/**
 * SECTION 31: Generic Policy Resolution Service
 *
 * Resolves the effective policy for a given (companyId, policyType, site/process/shift).
 * Most-specific-wins: SHIFT > PROCESS > SITE > COMPANY > PLATFORM.
 *
 * Every policy type (no-show, cancellation, ban, approval, expense, etc.)
 * plugs into this one resolver — no per-policy scoping columns needed.
 */

export interface PolicyResolution {
  policyType: string;
  scopeLevel: string;
  configJson: any;
  siteId?: string;
  processId?: string;
  shiftId?: string;
  setByUserId: string;
  setByRole: string;
  effectiveFrom: Date;
}

@Injectable()
export class PolicyScopeResolverService {
  private readonly logger = new Logger(PolicyScopeResolverService.name);

  // Specificity order: higher number = more specific = wins
  private readonly specificityOrder: Record<string, number> = {
    SHIFT: 5,
    PROCESS: 4,
    SITE: 3,
    COMPANY: 2,
    PLATFORM: 1,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the effective policy for a given context.
   *
   * @param companyId - The company to resolve for
   * @param policyType - The policy type (NO_SHOW, CANCELLATION, BAN, etc.)
   * @param context - Optional scope context (siteId, processId, shiftId)
   * @returns The most-specific active policy, or null if none found
   */
  async resolve(
    companyId: string,
    policyType: string,
    context?: {
      siteId?: string;
      processId?: string;
      shiftId?: string;
    },
  ): Promise<PolicyResolution | null> {
    const now = new Date();

    // Build the scope conditions — we need policies that match the context
    const whereConditions: any[] = [
      { companyId },
      { policyType },
      {
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gt: now } },
        ],
      },
      { effectiveFrom: { lte: now } },
    ];

    // Add scope-level conditions based on what's provided
    const scopeConditions: any[] = [];

    // Always include PLATFORM and COMPANY level policies
    scopeConditions.push({ scopeLevel: 'PLATFORM' });
    scopeConditions.push({ scopeLevel: 'COMPANY' });

    if (context?.siteId) {
      scopeConditions.push({ scopeLevel: 'SITE', siteId: context.siteId });
    }
    if (context?.processId) {
      scopeConditions.push({
        scopeLevel: 'PROCESS',
        siteId: context.siteId || undefined,
        processId: context.processId,
      });
    }
    if (context?.shiftId) {
      scopeConditions.push({
        scopeLevel: 'SHIFT',
        siteId: context.siteId || undefined,
        processId: context.processId || undefined,
        shiftId: context.shiftId,
      });
    }

    whereConditions.push({ OR: scopeConditions });

    try {
      const candidates = await (this.prisma as any).policyScope.findMany({
        where: { AND: whereConditions },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!candidates || candidates.length === 0) {
        this.logger.debug(
          `No policy found for ${policyType} in company ${companyId}, context: ${JSON.stringify(context)}`,
        );
        return null;
      }

      // Sort by specificity (most-specific wins)
      candidates.sort(
        (a: any, b: any) =>
          (this.specificityOrder[b.scopeLevel] || 0) -
          (this.specificityOrder[a.scopeLevel] || 0),
      );

      const winner = candidates[0];
      this.logger.debug(
        `Resolved ${policyType} policy: scope=${winner.scopeLevel}, id=${winner.id}`,
      );

      return {
        policyType: winner.policyType,
        scopeLevel: winner.scopeLevel,
        configJson: winner.configJson,
        siteId: winner.siteId,
        processId: winner.processId,
        shiftId: winner.shiftId,
        setByUserId: winner.setByUserId,
        setByRole: winner.setByRole,
        effectiveFrom: winner.effectiveFrom,
      };
    } catch (error: any) {
      this.logger.error(`Failed to resolve policy ${policyType}: ${error?.message}`);
      return null;
    }
  }

  /**
   * Resolve a policy and return a specific field from configJson.
   * Convenience method for most use cases.
   */
  async resolveField<T = any>(
    companyId: string,
    policyType: string,
    fieldName: string,
    context?: { siteId?: string; processId?: string; shiftId?: string },
    defaultValue?: T,
  ): Promise<T> {
    const policy = await this.resolve(companyId, policyType, context);
    if (!policy?.configJson) return defaultValue as T;
    return (policy.configJson[fieldName] ?? defaultValue) as T;
  }

  /**
   * Set a policy scope (requires AccessScopeGuard to validate).
   */
  async setPolicy(
    companyId: string,
    policyType: string,
    scopeLevel: string,
    configJson: any,
    setByUserId: string,
    setByRole: string,
    context?: {
      siteId?: string;
      processId?: string;
      shiftId?: string;
    },
    effectiveFrom?: Date,
    effectiveTo?: Date,
  ): Promise<any> {
    const now = new Date();
    return (this.prisma as any).policyScope.create({
      data: {
        companyId,
        policyType,
        scopeLevel,
        siteId: context?.siteId || null,
        processId: context?.processId || null,
        shiftId: context?.shiftId || null,
        configJson,
        setByUserId,
        setByRole,
        effectiveFrom: effectiveFrom || now,
        effectiveTo: effectiveTo || null,
      },
    });
  }

  /**
   * Get all active policies for a company (for admin UI).
   */
  async getCompanyPolicies(companyId: string, policyType?: string): Promise<any[]> {
    const where: any = {
      companyId,
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gt: new Date() } },
      ],
    };
    if (policyType) where.policyType = policyType;

    return (this.prisma as any).policyScope.findMany({
      where,
      orderBy: [{ scopeLevel: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  /**
   * Audit: log scope-violation attempts (Section 2.22).
   */
  async logScopeViolation(
    companyId: string,
    userId: string,
    attemptedScope: string,
    requestedScopeLevel: string,
    maxAllowedScopeLevel: string,
    details: string,
  ): Promise<void> {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          companyId,
          userId,
          action: 'SCOPE_VIOLATION',
          resourceType: 'POLICY_SCOPE',
          resourceId: null,
          details: JSON.stringify({
            attemptedScope,
            requestedScopeLevel,
            maxAllowedScopeLevel,
            details,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to log scope violation: ${error?.message}`);
    }
  }
}
