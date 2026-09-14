import { Controller, Get, UseGuards, Request, Param, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardRegistryService } from './dashboard-registry.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('portals')
@UseGuards(JwtAuthGuard, AccessScopeGuard, RolesGuard)
@Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DISPATCHER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
export class PortalController {
  constructor(private readonly registry: DashboardRegistryService) {}

  /**
   * GET /portals/resolve
   * Returns all authorized portals, dashboards, and scope for the current user.
   * This is the main endpoint the frontend calls after login to determine routing.
   */
  @Get('resolve')
  async resolvePortals(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    const companyId = req.user.companyId;
    return this.registry.resolvePortalsForUser(userId, companyId);
  }

  /**
   * GET /portals/:portalId/dashboard
   * Returns dashboards for a specific portal.
   */
  @Get(':portalId/dashboard')
  async getPortalDashboards(
    @Request() req: any,
    @Param('portalId') portalId: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    const companyId = req.user.companyId;
    const dashboards = await this.registry.getUserDashboards(userId, companyId, portalId);
    return { portalId, dashboards };
  }

  /**
   * GET /portals/:portalId/dashboard/:dashboardId/widgets
   * Returns widgets for a specific dashboard.
   */
  @Get(':portalId/dashboard/:dashboardId/widgets')
  async getDashboardWidgets(
    @Param('dashboardId') dashboardId: string,
  ) {
    const widgets = this.registry.getDashboardWidgets(dashboardId);
    return { dashboardId, widgets };
  }

  /**
   * GET /portals/scope
   * Returns user's effective scope (sites, LOBs, processes, shifts).
   */
  @Get('scope')
  async getScope(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    const companyId = req.user.companyId;
    return this.registry.getUserScope(userId, companyId);
  }
}
