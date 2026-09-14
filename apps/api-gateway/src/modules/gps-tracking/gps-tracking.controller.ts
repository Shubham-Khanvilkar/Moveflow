import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GPSTrackingService } from './gps-tracking.service';
import { UpdateLocationDto, CreateGeofenceDto } from './gps-tracking.service';

@ApiTags('GPS Live Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('v1/gps')
export class GPSTrackingController {
  constructor(private readonly service: GPSTrackingService) {}

  // ===== Location Tracking =====

  @Post('location')
  @RequirePermissions({ module: 'tracking', action: 'edit' })
  @ApiOperation({ summary: 'Update vehicle GPS location' })
  async updateLocation(@Body() dto: UpdateLocationDto, @Request() req: any) {
    return this.service.updateLocation(req.user.companyId, dto);
  }

  @Get('vehicles')
  @RequirePermissions({ module: 'tracking', action: 'view' })
  @ApiOperation({ summary: 'Get all vehicle locations' })
  async getVehicleLocations(@Request() req: any) {
    return this.service.getVehicleLocations(req.user.companyId);
  }

  @Get('vehicles/:vehicleId')
  @RequirePermissions({ module: 'tracking', action: 'view' })
  @ApiOperation({ summary: 'Get specific vehicle location' })
  async getVehicleLocation(@Param('vehicleId') vehicleId: string, @Request() req: any) {
    return this.service.getVehicleLocation(req.user.companyId, vehicleId);
  }

  @Get('vehicles/:vehicleId/history')
  @RequirePermissions({ module: 'tracking', action: 'view' })
  @ApiOperation({ summary: 'Get vehicle GPS history' })
  async getVehicleHistory(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.service.getVehicleHistory(req.user.companyId, vehicleId, from, to);
  }

  @Get('trips/:tripId/history')
  @RequirePermissions({ module: 'tracking', action: 'view' })
  @ApiOperation({ summary: 'Get trip GPS history' })
  async getTripHistory(@Param('tripId') tripId: string, @Request() req: any) {
    return this.service.getTripHistory(req.user.companyId, tripId);
  }

  @Get('live')
  @RequirePermissions({ module: 'tracking', action: 'view' })
  @ApiOperation({ summary: 'Get live map data' })
  async getLiveMap(@Request() req: any) {
    return this.service.getLiveMap(req.user.companyId);
  }

  // ===== Geofence Management =====

  @Get('geofences')
  @RequirePermissions({ module: 'geofence', action: 'view' })
  @ApiOperation({ summary: 'Get geofences' })
  async getGeofences(@Request() req: any) {
    return this.service.getGeofences(req.user.companyId);
  }

  @Post('geofences')
  @RequirePermissions({ module: 'geofence', action: 'create' })
  @ApiOperation({ summary: 'Create geofence' })
  async createGeofence(@Body() dto: CreateGeofenceDto, @Request() req: any) {
    return this.service.createGeofence(req.user.companyId, dto, req.user.id);
  }

  @Patch('geofences/:geofenceId')
  @RequirePermissions({ module: 'geofence', action: 'edit' })
  @ApiOperation({ summary: 'Update geofence' })
  async updateGeofence(
    @Param('geofenceId') geofenceId: string,
    @Body() dto: Partial<CreateGeofenceDto>,
    @Request() req: any,
  ) {
    return this.service.updateGeofence(req.user.companyId, geofenceId, dto, req.user.id);
  }

  @Delete('geofences/:geofenceId')
  @RequirePermissions({ module: 'geofence', action: 'delete' })
  @ApiOperation({ summary: 'Delete geofence' })
  async deleteGeofence(@Param('geofenceId') geofenceId: string, @Request() req: any) {
    return this.service.deleteGeofence(req.user.companyId, geofenceId, req.user.id);
  }

  @Get('geofences/events')
  @RequirePermissions({ module: 'geofence', action: 'view' })
  @ApiOperation({ summary: 'Get geofence events' })
  async getGeofenceEvents(
    @Query('geofenceId') geofenceId: string,
    @Request() req: any,
  ) {
    return this.service.getGeofenceEvents(req.user.companyId, geofenceId);
  }

  // ===== Route Deviation =====

  @Get('deviations')
  @RequirePermissions({ module: 'tracking', action: 'view' })
  @ApiOperation({ summary: 'Get route deviations' })
  async getRouteDeviations(
    @Query('status') status: string,
    @Request() req: any,
  ) {
    return this.service.getRouteDeviations(req.user.companyId, status);
  }

  @Patch('deviations/:deviationId/resolve')
  @RequirePermissions({ module: 'tracking', action: 'edit' })
  @ApiOperation({ summary: 'Resolve route deviation' })
  async resolveRouteDeviation(
    @Param('deviationId') deviationId: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.service.resolveRouteDeviation(req.user.companyId, deviationId, req.user.id, status);
  }
}
