import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/analytics')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getDashboardSummary(@Request() req: any) { return this.analyticsService.getDashboardSummary(req.user.companyId); }

  @Get('vendor/:vendorId')
  async getVendorAnalytics(@Request() req: any, @Param('vendorId') vendorId: string) { return this.analyticsService.getVendorAnalytics(req.user.companyId, vendorId); }

  @Get('driver/:driverId')
  async getDriverAnalytics(@Request() req: any, @Param('driverId') driverId: string) { return this.analyticsService.getDriverAnalytics(req.user.companyId, driverId); }

  @Get('utilization')
  async getUtilizationReport(@Request() req: any, @Query('date') date?: string) { return this.analyticsService.getUtilizationReport(req.user.companyId, date); }

  @Get('cost')
  async getCostReport(@Request() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.analyticsService.getCostReport(req.user.companyId, { startDate, endDate });
  }
}
