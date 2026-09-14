import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

/**
 * AI Authorization Service
 * CRITICAL: AI must never have more permission than the requesting user.
 * If Manager A cannot see Process B, AI cannot see Process B on Manager A's behalf.
 */

export interface AIToolCall {
  toolName: string;
  parameters: Record<string, any>;
  companyId: string;
  userId: string;
}

export interface AIAuthorizationDecision {
  allowed: boolean;
  reason: string;
  scopedData: any;
}

@Injectable()
export class AIAuthorizationService {
  private readonly logger = new Logger(AIAuthorizationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Authorize an AI tool call against the user's actual permissions.
   * The AI inherits the user's role, permissions, and scope.
   */
  async authorizeToolCall(call: AIToolCall): Promise<AIAuthorizationDecision> {
    // 1. Verify user exists and is active
    const user = await (this.prisma as any).user.findUnique({
      where: { id: call.userId },
    });
    if (!user || (user as any).status !== 'ACTIVE') {
      return { allowed: false, reason: 'User not active', scopedData: null };
    }

    // 2. Get user's effective permissions
    const roleAssignments = await (this.prisma as any).userRoleAssignment.findMany({
      where: { userId: call.userId, companyId: call.companyId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const permissions = new Set<string>();
    const scopeSiteIds = new Set<string>();
    const scopeLobIds = new Set<string>();
    const scopeProcessIds = new Set<string>();
    const scopeShiftIds = new Set<string>();

    for (const assignment of roleAssignments) {
      for (const rp of assignment.role.permissions) {
        permissions.add(rp.permission.name);
      }
    }

    const accessScopes = await (this.prisma as any).accessScope.findMany({
      where: { userId: call.userId, companyId: call.companyId },
    });

    for (const scope of accessScopes) {
      if (scope.siteId) scopeSiteIds.add(scope.siteId);
      if (scope.lobId) scopeLobIds.add(scope.lobId);
      if (scope.processId) scopeProcessIds.add(scope.processId);
      if (scope.shiftId) scopeShiftIds.add(scope.shiftId);
    }

    // 3. Map AI tools to required permissions
    const toolPermissionMap: Record<string, string> = {
      query_trips: 'TRIP_VIEW',
      query_employees: 'EMPLOYEE_VIEW',
      query_bookings: 'BOOKING_VIEW',
      query_costs: 'COST_VIEW',
      query_analytics: 'ANALYTICS_VIEW',
      query_drivers: 'DRIVER_VIEW',
      query_vehicles: 'VEHICLE_VIEW',
      query_vendors: 'VENDOR_VIEW',
      query_incidents: 'INCIDENT_VIEW',
      query_noshow: 'NOSHOW_VIEW',
      generate_report: 'ANALYTICS_VIEW',
      recommend_action: 'ANALYTICS_VIEW',
      // Sensitive actions
      change_dispatch: 'DISPATCH_MANAGE',
      change_rate: 'BILLING_MANAGE',
      change_policy: 'POLICY_MANAGE',
      remove_ban: 'BAN_MANAGE',
      block_vehicle: 'VEHICLE_MANAGE',
    };

    const requiredPermission = toolPermissionMap[call.toolName];
    if (requiredPermission && !permissions.has(requiredPermission)) {
      return {
        allowed: false,
        reason: `AI tool '${call.toolName}' requires permission '${requiredPermission}' which the user does not have`,
        scopedData: null,
      };
    }

    // 4. Build scoped query based on user's authorization
    const scopedData = this.buildScopedQuery(
      call.toolName,
      call.parameters,
      {
        companyId: call.companyId,
        siteIds: Array.from(scopeSiteIds),
        lobIds: Array.from(scopeLobIds),
        processIds: Array.from(scopeProcessIds),
        shiftIds: Array.from(scopeShiftIds),
      },
    );

    return {
      allowed: true,
      reason: 'Authorized',
      scopedData,
    };
  }

  /**
   * Build a Prisma query that respects the user's scope.
   * AI cannot query data outside the user's authorized scope.
   */
  private buildScopedQuery(
    toolName: string,
    parameters: Record<string, any>,
    scope: {
      companyId: string;
      siteIds: string[];
      lobIds: string[];
      processIds: string[];
      shiftIds: string[];
    },
  ): any {
    const baseWhere: any = { companyId: scope.companyId };

    // Apply scope restrictions
    if (scope.siteIds.length > 0) {
      baseWhere.siteId = { in: scope.siteIds };
    }
    if (scope.lobIds.length > 0) {
      baseWhere.lobId = { in: scope.lobIds };
    }
    if (scope.processIds.length > 0) {
      baseWhere.processId = { in: scope.processIds };
    }

    return {
      tool: toolName,
      where: baseWhere,
      scope,
      // Never return more than the user could see manually
    };
  }

  /**
   * Validate AI output doesn't fabricate data.
   * Cross-reference AI response against actual database values.
   */
  async validateAIOutput(companyId: string, aiResponse: any): Promise<{
    valid: boolean;
    fabrications: string[];
  }> {
    const fabrications: string[] = [];

    // Check if AI claims data that doesn't exist
    if (aiResponse.claimedTripId) {
      const trip = await (this.prisma as any).trip.findUnique({
        where: { id: aiResponse.claimedTripId },
      });
      if (!trip || trip.companyId !== companyId) {
        fabrications.push(`Trip ${aiResponse.claimedTripId} does not exist in this company`);
      }
    }

    if (aiResponse.claimedVehicleCount !== undefined) {
      const actual = await (this.prisma as any).vehicle.count({ where: { companyId } });
      if (aiResponse.claimedVehicleCount !== actual) {
        fabrications.push(`Claimed ${aiResponse.claimedVehicleCount} vehicles but actual is ${actual}`);
      }
    }

    return {
      valid: fabrications.length === 0,
      fabrications,
    };
  }

  /**
   * AI grounding: ensure AI responses reference real system data
   */
  async groundResponse(companyId: string, query: string, context: any): Promise<{
    grounded: boolean;
    sources: Array<{ type: string; id: string; confidence: number }>;
  }> {
    // Ground the response by finding relevant database records
    const sources: Array<{ type: string; id: string; confidence: number }> = [];

    if (context.tripId) {
      const trip = await (this.prisma as any).trip.findUnique({ where: { id: context.tripId } });
      if (trip && trip.companyId === companyId) {
        sources.push({ type: 'TRIP', id: context.tripId, confidence: 1.0 });
      }
    }

    if (context.vehicleId) {
      const vehicle = await (this.prisma as any).vehicle.findUnique({ where: { id: context.vehicleId } });
      if (vehicle && vehicle.companyId === companyId) {
        sources.push({ type: 'VEHICLE', id: context.vehicleId, confidence: 1.0 });
      }
    }

    return {
      grounded: sources.length > 0,
      sources,
    };
  }
}
