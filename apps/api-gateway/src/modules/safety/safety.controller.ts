import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { SafetyOptimizationService } from './safety-optimization.service';
import { SafetyIncidentService } from './safety-incident.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('safety')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class SafetyController {
  constructor(
    private safetyService: SafetyOptimizationService,
    private incidentService: SafetyIncidentService,
  ) {}

  // ============================================================
  // SAFETY POLICY
  // ============================================================

  @Get('policy')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async getSafetyPolicy(@Tenant() companyId: string) {
    return this.safetyService.getSafetyPolicy(companyId);
  }

  @Put('policy')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async updateSafetyPolicy(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.safetyService.updateSafetyPolicy(companyId, req.user.userId, body);
  }

  // ============================================================
  // OPTIMIZATION
  // ============================================================

  @Post('optimize/drop-sequence')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async optimizeDropSequence(@Tenant() companyId: string, @Body() body: any) {
    return this.safetyService.optimizeDropSequence(companyId, body);
  }

  @Post('optimize/pickup-sequence')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async optimizePickupSequence(@Tenant() companyId: string, @Body() body: any) {
    return this.safetyService.optimizePickupSequence(companyId, body);
  }

  @Post('optimize/trip')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async optimizeTrip(@Tenant() companyId: string, @Body() body: any) {
    return this.safetyService.optimizeTrip(companyId, body);
  }

  // ============================================================
  // CAPACITY VALIDATION
  // ============================================================

  @Post('capacity/validate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async validateCapacity(@Tenant() companyId: string, @Body() body: { vehicleId: string; passengerCount: number }) {
    return this.safetyService.validateCapacity(companyId, body.vehicleId, body.passengerCount);
  }

  @Get('capacity/config')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getCapacityConfig(@Tenant() companyId: string) {
    return this.safetyService.getCapacityConfig(companyId);
  }

  @Put('capacity/config')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async upsertCapacityConfig(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.safetyService.upsertCapacityConfig(companyId, req.user.userId, body);
  }

  // ============================================================
  // GUARD REQUIREMENTS
  // ============================================================

  @Get('guards')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'CONTROL_ROOM_USER')
  async listGuardRequirements(@Tenant() companyId: string, @Query() query: any) {
    return this.safetyService.listGuardRequirements(companyId, query);
  }

  @Post('guards')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async createGuardRequirement(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.safetyService.createGuardRequirement(companyId, req.user.userId, body);
  }

  @Put('guards/:id/status')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'CONTROL_ROOM_USER')
  async updateGuardStatus(
    @Tenant() companyId: string,
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string; assignedGuardId?: string; assignedGuardName?: string; notes?: string },
  ) {
    return this.safetyService.updateGuardStatus(companyId, req.user.userId, id, body.status, body);
  }

  // ============================================================
  // VEHICLE BREAKDOWN
  // ============================================================

  @Post('breakdown/report')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async reportBreakdown(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.incidentService.reportBreakdown(companyId, { ...body, reportedBy: req.user.userId });
  }

  @Post('breakdown/:incidentId/replace')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async assignReplacement(@Tenant() companyId: string, @Req() req: any, @Param('incidentId') incidentId: string, @Body() body: any) {
    return this.incidentService.assignReplacementVehicle(companyId, incidentId, body, req.user.userId);
  }

  @Post('breakdown/:incidentId/resolve')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MAINTENANCE_USER')
  async resolveBreakdown(@Tenant() companyId: string, @Req() req: any, @Param('incidentId') incidentId: string, @Body() body: any) {
    return this.incidentService.resolveBreakdown(companyId, incidentId, body, req.user.userId);
  }

  @Get('breakdown/active')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async getActiveBreakdowns(@Tenant() companyId: string) {
    return this.incidentService.getActiveBreakdowns(companyId);
  }

  // ============================================================
  // SOS / PANIC BUTTON
  // ============================================================

  @Post('sos/trigger')
  @Roles('EMPLOYEE', 'DRIVER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async triggerSOS(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.incidentService.triggerSOS(companyId, req.user.userId, body);
  }

  @Post('sos/:id/acknowledge')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'CONTROL_ROOM_USER')
  async acknowledgeSOS(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.incidentService.acknowledgeSOS(companyId, id, req.user.userId);
  }

  @Post('sos/:id/resolve')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'CONTROL_ROOM_USER')
  async resolveSOS(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.incidentService.resolveSOS(companyId, id, req.user.userId);
  }

  @Get('sos/active')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'CONTROL_ROOM_USER')
  async getActiveSOSAlerts(@Tenant() companyId: string) {
    return this.incidentService.getActiveSOSAlerts(companyId);
  }

  // ============================================================
  // INCIDENT REPORTING
  // ============================================================

  @Post('incidents')
  @Roles('EMPLOYEE', 'DRIVER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async reportIncident(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.incidentService.reportIncident(companyId, { ...body, reportedBy: req.user.userId });
  }

  @Get('incidents')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'CONTROL_ROOM_USER')
  async getIncidents(@Tenant() companyId: string, @Query() query: any) {
    return this.incidentService.getIncidents(companyId, {
      status: query.status, incidentType: query.incidentType,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }

  @Put('incidents/:id/status')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async updateIncidentStatus(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.incidentService.updateIncidentStatus(companyId, id, body.status, req.user.userId);
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  @Get('analytics')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getSafetyAnalytics(@Tenant() companyId: string, @Query() query: { from?: string; to?: string }) {
    return this.safetyService.getSafetyAnalytics(companyId, query);
  }
}
