import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SuperComplianceService } from './super-compliance.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/super-compliance')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Roles('NAVIRA_PLATFORM_ADMINISTRATOR')
export class SuperComplianceController {
  constructor(private readonly superComplianceService: SuperComplianceService) {}

  @Get('config')
  async getConfig(@Query('configKey') configKey?: string) { return this.superComplianceService.getConfig(configKey); }

  @Put('config')
  async setConfig(@Body() body: { configKey: string; configValue: any; category: string; description?: string }) {
    return this.superComplianceService.setConfig(body.configKey, body.configValue, body.category, body.description);
  }

  @Post('audits')
  async createAudit(@Body() body: any) { return this.superComplianceService.createAudit(body); }

  @Get('audits')
  async getAudits(@Query('companyId') companyId?: string, @Query('status') status?: string, @Query('auditorId') auditorId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.superComplianceService.getAudits({ companyId, status, auditorId, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('audits/:auditId/complete')
  async completeAudit(@Param('auditId') auditId: string, @Body() body: any) {
    return this.superComplianceService.completeAudit(auditId, body, 'system');
  }

  @Post('alerts')
  async createAlert(@Body() body: any) { return this.superComplianceService.createAlert(body); }

  @Get('alerts')
  async getAlerts(@Query('companyId') companyId?: string, @Query('status') status?: string, @Query('severity') severity?: string, @Query('alertType') alertType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.superComplianceService.getAlerts({ companyId, status, severity, alertType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('alerts/:alertId/acknowledge')
  async acknowledgeAlert(@Param('alertId') alertId: string) { return this.superComplianceService.acknowledgeAlert(alertId, 'system'); }

  @Post('alerts/:alertId/resolve')
  async resolveAlert(@Param('alertId') alertId: string, @Body() body: { notes?: string }) { return this.superComplianceService.resolveAlert(alertId, 'system', body.notes); }

  @Get('scores/:companyId')
  async getCompanyScore(@Param('companyId') companyId: string, @Query('period') period?: string) {
    return this.superComplianceService.getCompanyScore(companyId, period);
  }

  @Post('scores/:companyId/calculate')
  async calculateCompanyScore(@Param('companyId') companyId: string, @Query('period') period?: string) {
    return this.superComplianceService.calculateCompanyScore(companyId, period || new Date().toISOString().slice(0, 7));
  }

  @Get('standings')
  async getAllCompanyStandings() { return this.superComplianceService.getAllCompanyStandings(); }

  @Get('rules')
  async getPlatformRules() { return this.superComplianceService.getPlatformRules(); }

  @Post('rules')
  async createPlatformRule(@Body() body: any) { return this.superComplianceService.createPlatformRule(body); }

  @Post('audit/run')
  async runPlatformAudit() { return this.superComplianceService.runPlatformAudit(); }
}
