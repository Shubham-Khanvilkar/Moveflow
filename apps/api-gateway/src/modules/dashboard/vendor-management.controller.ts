import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { VendorManagementService } from './vendor-management.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/vendors')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class VendorManagementController {
  constructor(private readonly vendorService: VendorManagementService) {}

  @Post()
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createVendor(@Request() req: any, @Body() body: any) { return this.vendorService.createVendor(req.user.companyId, body, req.user.id); }

  @Get()
  async getVendors(@Request() req: any, @Query('status') status?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.vendorService.getVendors(req.user.companyId, { status, search, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Get(':vendorId')
  async getVendorById(@Request() req: any, @Param('vendorId') vendorId: string) { return this.vendorService.getVendorById(req.user.companyId, vendorId); }

  @Put(':vendorId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async updateVendor(@Request() req: any, @Param('vendorId') vendorId: string, @Body() body: any) { return this.vendorService.updateVendor(req.user.companyId, vendorId, body, req.user.id); }

  @Post(':vendorId/offboard')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async offboardVendor(@Request() req: any, @Param('vendorId') vendorId: string, @Body() body: { reason: string }) { return this.vendorService.offboardVendor(req.user.companyId, vendorId, body.reason, req.user.id); }

  @Post(':vendorId/suspend')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async suspendVendor(@Request() req: any, @Param('vendorId') vendorId: string, @Body() body: { reason: string }) { return this.vendorService.suspendVendor(req.user.companyId, vendorId, body.reason, req.user.id); }

  @Post(':vendorId/blacklist')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async blacklistVendor(@Request() req: any, @Param('vendorId') vendorId: string, @Body() body: { reason: string }) { return this.vendorService.blacklistVendor(req.user.companyId, vendorId, body.reason, req.user.id); }

  @Get(':vendorId/performance')
  async getVendorPerformance(@Request() req: any, @Param('vendorId') vendorId: string) { return this.vendorService.getVendorPerformance(req.user.companyId, vendorId); }

  @Post(':vendorId/users')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async inviteVendorUser(@Request() req: any, @Param('vendorId') vendorId: string, @Body() body: { userId: string; role?: string }) { return this.vendorService.inviteVendorUser(req.user.companyId, vendorId, body, req.user.id); }

  @Get(':vendorId/users')
  async getVendorUsers(@Request() req: any, @Param('vendorId') vendorId: string) { return this.vendorService.getVendorUsers(req.user.companyId, vendorId); }
}
