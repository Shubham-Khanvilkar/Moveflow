import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Logger } from '@nestjs/common';
import { PolicyScopeResolverService } from './policy-scope-resolver.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireAccessScope } from '../../common/decorators/access-scope.decorator';

/**
 * Controller for PolicyScope management (Section 31).
 *
 * Transport Admins can set/review policies at their assigned scope level.
 * AccessScopeGuard ensures they can only write within their scope.
 */
@Controller('policies')
@UseGuards(JwtAuthGuard, TenantGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN')
export class PolicyScopeController {
  private readonly logger = new Logger(PolicyScopeController.name);

  constructor(private readonly policyResolver: PolicyScopeResolverService) {}

  /**
   * Resolve the effective policy for a given context.
   * GET /policies/resolve?policyType=NO_SHOW&siteId=xxx&processId=yyy
   */
  @Get('resolve')
  async resolvePolicy(
    @Query('policyType') policyType: string,
    @Query('siteId') siteId?: string,
    @Query('processId') processId?: string,
    @Query('shiftId') shiftId?: string,
    @Req() req?: any,
  ) {
    const companyId = req?.user?.companyId;
    if (!companyId) return { error: 'No company context' };

    const policy = await this.policyResolver.resolve(companyId, policyType, {
      siteId,
      processId,
      shiftId,
    });

    return {
      success: true,
      policy,
      context: { siteId, processId, shiftId },
    };
  }

  /**
   * Get all policies for the company.
   * GET /policies?policyType=NO_SHOW
   */
  @Get()
  async getCompanyPolicies(
    @Query('policyType') policyType?: string,
    @Req() req?: any,
  ) {
    const companyId = req?.user?.companyId;
    if (!companyId) return { error: 'No company context' };

    const policies = await this.policyResolver.getCompanyPolicies(companyId, policyType);
    return { success: true, data: policies };
  }

  /**
   * Set a policy scope.
   * POST /policies
   *
   * AccessScopeGuard ensures the user can only write within their scope.
   */
  @Post()
  @UseGuards(AccessScopeGuard)
  @RequireAccessScope({ requireSite: true, requireProcess: true, requireShift: true })
  async setPolicy(
    @Body() body: {
      policyType: string;
      scopeLevel: string;
      configJson: any;
      siteId?: string;
      processId?: string;
      shiftId?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    },
    @Req() req?: any,
  ) {
    const companyId = req?.user?.companyId;
    const userId = req?.user?.id;
    const userRole = req?.user?.role || 'TRANSPORT_ADMIN';

    if (!companyId || !userId) return { error: 'No company/user context' };

    const policy = await this.policyResolver.setPolicy(
      companyId,
      body.policyType,
      body.scopeLevel,
      body.configJson,
      userId,
      userRole,
      {
        siteId: body.siteId,
        processId: body.processId,
        shiftId: body.shiftId,
      },
      body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      body.effectiveTo ? new Date(body.effectiveTo) : undefined,
    );

    this.logger.log(
      `Policy set: ${body.policyType} at ${body.scopeLevel} by user ${userId}`,
    );

    return { success: true, data: policy };
  }

  /**
   * Get a specific policy field value.
   * GET /policies/field/:policyType/:fieldName?siteId=xxx
   */
  @Get('field/:policyType/:fieldName')
  async getPolicyField(
    @Param('policyType') policyType: string,
    @Param('fieldName') fieldName: string,
    @Query('siteId') siteId?: string,
    @Query('processId') processId?: string,
    @Query('shiftId') shiftId?: string,
    @Req() req?: any,
  ) {
    const companyId = req?.user?.companyId;
    if (!companyId) return { error: 'No company context' };

    const value = await this.policyResolver.resolveField(
      companyId,
      policyType,
      fieldName,
      { siteId, processId, shiftId },
    );

    return { success: true, field: fieldName, value };
  }
}
