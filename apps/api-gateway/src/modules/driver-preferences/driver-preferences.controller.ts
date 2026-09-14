import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { DriverPreferencesService } from './driver-preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('drivers')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class DriverPreferencesController {
  constructor(private readonly prefsService: DriverPreferencesService) {}

  // ============================================================
  // DRIVER: Preferred Areas CRUD
  // ============================================================

  @Get('me/preferred-areas')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async listMyAreas(@Request() req: any) {
    return this.prefsService.listPreferredAreas(req.user.companyId, req.user.sub);
  }

  @Post('me/preferred-areas')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async addArea(@Request() req: any, @Body() body: any) {
    return this.prefsService.addPreferredArea(req.user.companyId, req.user.sub, body);
  }

  @Patch('me/preferred-areas/:id')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async updateArea(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.prefsService.updatePreferredArea(req.user.companyId, req.user.sub, id, body);
  }

  @Delete('me/preferred-areas/:id')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async deleteArea(@Request() req: any, @Param('id') id: string) {
    return this.prefsService.deletePreferredArea(req.user.companyId, req.user.sub, id);
  }

  // ============================================================
  // DRIVER: Temporary Preference
  // ============================================================

  @Post('me/preferred-areas/temporary')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async addTemporary(@Request() req: any, @Body() body: any) {
    return this.prefsService.addTemporaryPreference(req.user.companyId, req.user.sub, body);
  }

  // ============================================================
  // DRIVER: Home Base
  // ============================================================

  @Get('me/home-base')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getHomeBase(@Request() req: any) {
    return this.prefsService.getHomeBase(req.user.companyId, req.user.sub);
  }

  @Post('me/home-base')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async setHomeBase(@Request() req: any, @Body() body: any) {
    return this.prefsService.setHomeBase(req.user.companyId, req.user.sub, body);
  }

  // ============================================================
  // DRIVER: Eligibility
  // ============================================================

  @Get('me/eligibility')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getMyEligibility(@Request() req: any) {
    return this.prefsService.getDriverEligibility(req.user.companyId, req.user.sub);
  }

  // ============================================================
  // DISPATCH: Candidate Generation & Scoring
  // ============================================================

  @Post('me/dispatch-score')
  @Roles('DRIVER', 'DISPATCHER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getMyDispatchScore(@Request() req: any, @Body() body: { latitude: number; longitude: number }) {
    return this.prefsService.calculateDispatchScore(req.user.companyId, req.user.sub, body);
  }

  @Post('dispatch/candidates')
  @Roles('DISPATCHER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getCandidates(@Request() req: any, @Body() body: { latitude: number; longitude: number }) {
    return this.prefsService.generateCandidates(req.user.companyId, body);
  }

  @Post('dispatch/demand-pressure')
  @Roles('DISPATCHER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getDemandPressure(@Request() req: any, @Body() body: { zoneName: string; latitude: number; longitude: number }) {
    return this.prefsService.calculateDemandPressure(req.user.companyId, body.zoneName, body.latitude, body.longitude);
  }

  // ============================================================
  // ADMIN: Configuration
  // ============================================================

  @Get('preference-config')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getConfig(@Request() req: any) {
    return this.prefsService.getOrCreateConfig(req.user.companyId);
  }

  @Put('preference-config')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async updateConfig(@Request() req: any, @Body() body: any) {
    return this.prefsService.updateConfig(req.user.companyId, req.user.sub, body);
  }

  // ============================================================
  // ADMIN: Analytics
  // ============================================================

  @Get('preference-analytics')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getAnalytics(@Request() req: any, @Query() query: any) {
    return this.prefsService.getPreferenceAnalytics(req.user.companyId, {
      driverId: query.driverId,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }
}
