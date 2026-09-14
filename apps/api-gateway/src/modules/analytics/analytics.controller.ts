import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'MANAGER', 'TRANSPORT_ADMIN')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  // Business Analyst Dashboard
  @Get('business-analyst')
  getBusinessAnalystDashboard(@Req() req: any, @Query() q: any) {
    const companyId = req.user?.companyId || q.companyId;
    return this.svc.getBusinessAnalystDashboard(companyId, q);
  }

  // Cost Optimization Dashboard
  @Get('cost-optimization')
  getCostOptimizationDashboard(@Req() req: any, @Query() q: any) {
    const companyId = req.user?.companyId || q.companyId;
    return this.svc.getCostOptimizationDashboard(companyId, q);
  }

  // Optimization Simulator
  @Post('optimize/simulate')
  runOptimizationSimulation(@Req() req: any, @Body() body: any) {
    const companyId = req.user?.companyId || body.companyId;
    return this.svc.runOptimizationSimulation(companyId, body);
  }

  // Financial Analyst Dashboard
  @Get('financial')
  getFinancialAnalystDashboard(@Req() req: any, @Query() q: any) {
    const companyId = req.user?.companyId || q.companyId;
    return this.svc.getFinancialAnalystDashboard(companyId, q);
  }

  // Savings Tracker
  @Get('savings')
  getSavingsSummary(@Req() req: any) {
    const companyId = req.user?.companyId;
    return this.svc.getSavingsSummary(companyId);
  }

  @Post('savings')
  createOptimization(@Req() req: any, @Body() body: any) {
    const companyId = req.user?.companyId || body.companyId;
    return this.svc.createOptimization(companyId, body);
  }

  @Post('savings/:id/approve')
  approveOptimization(@Param('id') id: string, @Req() req: any) {
    return this.svc.approveOptimization(id, req.user?.sub || 'system');
  }

  @Post('savings/:id/implement')
  implementOptimization(@Param('id') id: string, @Body() body: any) {
    return this.svc.implementOptimization(id, body.actualSaving || 0);
  }

  // Enterprise Command Center
  @Get('command-center')
  getEnterpriseCommandCenter() {
    return this.svc.getEnterpriseCommandCenter();
  }

  // CXO Dashboards
  @Get('cxo/ceo')
  getCEODashboard(@Req() req: any) {
    const companyId = req.user?.companyId;
    return this.svc.getCEODashboard(companyId);
  }

  @Get('cxo/cfo')
  getCFODashboard(@Req() req: any) {
    const companyId = req.user?.companyId;
    return this.svc.getCFODashboard(companyId);
  }

  @Get('cxo/coo')
  getCOODashboard(@Req() req: any) {
    const companyId = req.user?.companyId;
    return this.svc.getCOODashboard(companyId);
  }

  @Get('cxo/chro')
  getCHRODashboard(@Req() req: any) {
    const companyId = req.user?.companyId;
    return this.svc.getCHRODashboard(companyId);
  }

  @Get('cxo/cio')
  getCIODashboard(@Req() req: any) {
    const companyId = req.user?.companyId;
    return this.svc.getCIODashboard(companyId);
  }

  // Vendor Performance
  @Get('vendor-performance')
  getVendorPerformance(@Req() req: any, @Query() q: any) {
    const companyId = req.user?.companyId || q.companyId;
    return this.svc.getVendorPerformance(companyId, q.period);
  }

  // Demand Forecast
  @Get('demand-forecast')
  getDemandForecast(@Req() req: any, @Query() q: any) {
    const companyId = req.user?.companyId || q.companyId;
    return this.svc.getDemandForecast(companyId, q.date, q.siteId, q.processId);
  }
}
