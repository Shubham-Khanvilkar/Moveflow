import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { VehicleManagementService } from './vehicle-management.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/vehicles')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class VehicleManagementController {
  constructor(private readonly vehicleService: VehicleManagementService) {}

  @Post()
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createVehicle(@Request() req: any, @Body() body: any) { return this.vehicleService.createVehicle(req.user.companyId, body, req.user.id); }

  @Get()
  async getVehicles(@Request() req: any, @Query('status') status?: string, @Query('vehicleType') vehicleType?: string, @Query('vendorId') vendorId?: string, @Query('isAvailable') isAvailable?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.vehicleService.getVehicles(req.user.companyId, { status, vehicleType, vendorId, isAvailable, search, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Get(':vehicleId')
  async getVehicleById(@Request() req: any, @Param('vehicleId') vehicleId: string) { return this.vehicleService.getVehicleById(req.user.companyId, vehicleId); }

  @Put(':vehicleId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async updateVehicle(@Request() req: any, @Param('vehicleId') vehicleId: string, @Body() body: any) { return this.vehicleService.updateVehicle(req.user.companyId, vehicleId, body, req.user.id); }

  @Post(':vehicleId/offboard')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async offboardVehicle(@Request() req: any, @Param('vehicleId') vehicleId: string, @Body() body: { reason: string }) { return this.vehicleService.offboardVehicle(req.user.companyId, vehicleId, body.reason, req.user.id); }

  @Post(':vehicleId/maintenance')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async setMaintenance(@Request() req: any, @Param('vehicleId') vehicleId: string, @Body() body: { reason: string }) { return this.vehicleService.setMaintenance(req.user.companyId, vehicleId, body.reason, req.user.id); }

  @Put(':vehicleId/location')
  async updateLocation(@Request() req: any, @Param('vehicleId') vehicleId: string, @Body() body: { latitude: number; longitude: number; speed?: number }) { return this.vehicleService.updateLocation(req.user.companyId, vehicleId, body.latitude, body.longitude, body.speed); }

  @Get('compliance/alerts')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async getComplianceAlerts(@Request() req: any) { return this.vehicleService.getComplianceAlerts(req.user.companyId); }
}
