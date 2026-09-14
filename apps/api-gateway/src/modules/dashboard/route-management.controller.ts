import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { RouteManagementService } from './route-management.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/routes')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class RouteManagementController {
  constructor(private readonly routeService: RouteManagementService) {}

  @Post()
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createRoute(@Request() req: any, @Body() body: any) { return this.routeService.createRoute(req.user.companyId, body, req.user.id); }

  @Get()
  async getRoutes(@Request() req: any, @Query('routeType') routeType?: string, @Query('status') status?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.routeService.getRoutes(req.user.companyId, { routeType, status, search, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Put(':routeId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async updateRoute(@Request() req: any, @Param('routeId') routeId: string, @Body() body: any) { return this.routeService.updateRoute(req.user.companyId, routeId, body, req.user.id); }

  @Delete(':routeId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async deleteRoute(@Request() req: any, @Param('routeId') routeId: string) { return this.routeService.deleteRoute(req.user.companyId, routeId, req.user.id); }

  @Post('nodal')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createNodalPoint(@Request() req: any, @Body() body: any) { return this.routeService.createNodalPoint(req.user.companyId, body, req.user.id); }

  @Get('nodal')
  async getNodalPoints(@Request() req: any, @Query('isActive') isActive?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.routeService.getNodalPoints(req.user.companyId, { isActive, search, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Put('nodal/:nodalId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async updateNodalPoint(@Request() req: any, @Param('nodalId') nodalId: string, @Body() body: any) { return this.routeService.updateNodalPoint(req.user.companyId, nodalId, body, req.user.id); }

  @Post('shuttle')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createShuttleRoute(@Request() req: any, @Body() body: any) { return this.routeService.createShuttleRoute(req.user.companyId, body, req.user.id); }

  @Get('shuttle')
  async getShuttleRoutes(@Request() req: any, @Query('isActive') isActive?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.routeService.getShuttleRoutes(req.user.companyId, { isActive, search, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Put('shuttle/:shuttleId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async updateShuttleRoute(@Request() req: any, @Param('shuttleId') shuttleId: string, @Body() body: any) { return this.routeService.updateShuttleRoute(req.user.companyId, shuttleId, body, req.user.id); }

  @Post('location')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createOfficeLocation(@Request() req: any, @Body() body: any) { return this.routeService.createOfficeLocation(req.user.companyId, body, req.user.id); }

  @Get('location')
  async getOfficeLocations(@Request() req: any) { return this.routeService.getOfficeLocations(req.user.companyId); }

  @Put('location/:locationId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async updateOfficeLocation(@Request() req: any, @Param('locationId') locationId: string, @Body() body: any) { return this.routeService.updateOfficeLocation(req.user.companyId, locationId, body, req.user.id); }
}
