import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DriverManagementService } from './driver-management.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/drivers')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class DriverManagementController {
  constructor(private readonly driverService: DriverManagementService) {}

  @Post()
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createDriver(@Request() req: any, @Body() body: any) { return this.driverService.createDriver(req.user.companyId, body, req.user.id); }

  @Get()
  async getDrivers(@Request() req: any, @Query('status') status?: string, @Query('vendorId') vendorId?: string, @Query('isAvailable') isAvailable?: string, @Query('search') search?: string, @Query('skills') skills?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.driverService.getDrivers(req.user.companyId, { status, vendorId, isAvailable, search, skills, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Get(':driverId')
  async getDriverById(@Request() req: any, @Param('driverId') driverId: string) { return this.driverService.getDriverById(req.user.companyId, driverId); }

  @Put(':driverId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async updateDriver(@Request() req: any, @Param('driverId') driverId: string, @Body() body: any) { return this.driverService.updateDriver(req.user.companyId, driverId, body, req.user.id); }

  @Post(':driverId/offboard')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async offboardDriver(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { reason: string }) { return this.driverService.offboardDriver(req.user.companyId, driverId, body.reason, req.user.id); }

  @Post(':driverId/suspend')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async suspendDriver(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { reason: string }) { return this.driverService.suspendDriver(req.user.companyId, driverId, body.reason, req.user.id); }

  @Put(':driverId/availability')
  async updateAvailability(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { isAvailable: boolean }) { return this.driverService.updateAvailability(req.user.companyId, driverId, body.isAvailable); }

  @Get(':driverId/performance')
  async getDriverPerformance(@Request() req: any, @Param('driverId') driverId: string) { return this.driverService.getDriverPerformance(req.user.companyId, driverId); }

  @Post(':driverId/assign-vendor')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async assignVendor(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { vendorId: string }) { return this.driverService.assignVendor(req.user.companyId, driverId, body.vendorId, req.user.id); }

  @Post('bulk-status')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async bulkUpdateStatus(@Request() req: any, @Body() body: { driverIds: string[]; status: string }) { return this.driverService.bulkUpdateStatus(req.user.companyId, body.driverIds, body.status, req.user.id); }
}
