import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { EnterpriseDashboardService } from './enterprise-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, TenantGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'MANAGER', 'TRANSPORT_ADMIN')
export class EnterpriseDashboardController {
  constructor(private readonly dashboardService: EnterpriseDashboardService) {}

  // 22C.4 — SUPERADMIN Platform Command Center
  @Get('platform/command-center')
  async platformCommandCenter() {
    return this.dashboardService.platformCommandCenter();
  }

  // 22C.4 — Company health matrix
  @Get('platform/company-health')
  async companyHealthMatrix() {
    return this.dashboardService.companyHealthMatrix();
  }

  // 22C.5 — Company Transport Admin Dashboard
  @Get('transport')
  async transportDashboard(@Request() req: any) {
    return this.dashboardService.companyTransportDashboard(req.user.companyId);
  }

  // 22C.6 — SaaS Health Dashboard
  @Get('platform/saas-health')
  async saasHealthDashboard() {
    return this.dashboardService.saasHealthDashboard();
  }

  // 22C.7 — Manager Dashboard
  @Get('manager')
  async managerDashboard(@Request() req: any) {
    return this.dashboardService.managerDashboard(req.user.sub, req.user.companyId);
  }

  // 22C.8 — Employee Dashboard
  @Get('employee')
  async employeeDashboard(@Request() req: any) {
    return this.dashboardService.employeeDashboard(req.user.sub, req.user.companyId);
  }

  // 22C.9 — Control Room Dashboard
  @Get('control-room')
  async controlRoomDashboard(@Request() req: any) {
    return this.dashboardService.controlRoomDashboard(req.user.companyId);
  }

  // 22C.10 — Finance Dashboard
  @Get('finance')
  async financeDashboard(@Request() req: any) {
    return this.dashboardService.financeDashboard(req.user.companyId);
  }

  // 22C.11 — Vehicle Utilization
  @Get('analytics/vehicle-utilization')
  async vehicleUtilization(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.dashboardService.vehicleUtilization(req.user.companyId, days ? parseInt(days) : 30);
  }

  // 22C.12 — Driver Performance
  @Get('analytics/driver-performance')
  async driverPerformance(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.dashboardService.driverPerformance(req.user.companyId, days ? parseInt(days) : 30);
  }

  // 22C.13 — Safety Dashboard
  @Get('analytics/safety')
  async safetyDashboard(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.dashboardService.safetyDashboard(req.user.companyId, days ? parseInt(days) : 30);
  }

  // Recent Activity — FROM AUDIT LOG
  @Get('recent-activity')
  async recentActivity(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.recentActivity(req.user.companyId, limit ? parseInt(limit) : 10);
  }
}
