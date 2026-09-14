import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { CompanyAdminService } from './company-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
export class CompanyAdminController {
  constructor(private readonly adminService: CompanyAdminService) {}

  // ============================================================
  // POLICY
  // ============================================================

  @Get('policy')
  async getPolicy(@Request() req: any) {
    return this.adminService.getCompanyPolicy(req.user.companyId);
  }

  @Post('policy')
  async createPolicy(@Request() req: any, @Body() body: any) {
    return this.adminService.createCompanyPolicy(req.user.companyId, req.user.sub, body);
  }

  @Put('policy')
  async updatePolicy(@Request() req: any, @Body() body: any) {
    return this.adminService.updateCompanyPolicy(req.user.companyId, req.user.sub, body);
  }

  // ============================================================
  // DEPARTMENTS
  // ============================================================

  @Get('departments')
  async listDepartments(@Request() req: any) {
    return this.adminService.listDepartments(req.user.companyId);
  }

  @Post('departments')
  async createDepartment(@Request() req: any, @Body() body: any) {
    return this.adminService.createDepartment(req.user.companyId, req.user.sub, body);
  }

  @Put('departments/:id')
  async updateDepartment(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updateDepartment(req.user.companyId, req.user.sub, id, body);
  }

  @Delete('departments/:id')
  async deleteDepartment(@Request() req: any, @Param('id') id: string) {
    return this.adminService.deleteDepartment(req.user.companyId, req.user.sub, id);
  }

  // ============================================================
  // BUSINESS UNITS
  // ============================================================

  @Get('business-units')
  async listBusinessUnits(@Request() req: any) {
    return this.adminService.listBusinessUnits(req.user.companyId);
  }

  @Post('business-units')
  async createBusinessUnit(@Request() req: any, @Body() body: any) {
    return this.adminService.createBusinessUnit(req.user.companyId, req.user.sub, body);
  }

  // ============================================================
  // COST CENTERS
  // ============================================================

  @Get('cost-centers')
  async listCostCenters(@Request() req: any) {
    return this.adminService.listCostCenters(req.user.companyId);
  }

  @Post('cost-centers')
  async createCostCenter(@Request() req: any, @Body() body: any) {
    return this.adminService.createCostCenter(req.user.companyId, req.user.sub, body);
  }

  // ============================================================
  // LOCATIONS
  // ============================================================

  @Get('locations')
  async listLocations(@Request() req: any) {
    return this.adminService.listLocations(req.user.companyId);
  }

  @Post('locations')
  async createLocation(@Request() req: any, @Body() body: any) {
    return this.adminService.createLocation(req.user.companyId, req.user.sub, body);
  }

  @Put('locations/:id')
  async updateLocation(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updateLocation(req.user.companyId, req.user.sub, id, body);
  }

  @Delete('locations/:id')
  async deleteLocation(@Request() req: any, @Param('id') id: string) {
    return this.adminService.deleteLocation(req.user.companyId, req.user.sub, id);
  }

  // ============================================================
  // USERS
  // ============================================================

  @Get('users')
  async listUsers(@Request() req: any, @Query() query: any) {
    return this.adminService.listUsers(req.user.companyId, {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      role: query.role,
      search: query.search,
    });
  }

  @Put('users/:id/role')
  async updateUserRole(@Request() req: any, @Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.updateUserRole(req.user.companyId, req.user.sub, id, body.role);
  }

  @Post('users')
  async createUser(@Request() req: any, @Body() body: any) {
    return this.adminService.createUser(req.user.companyId, body, req.user.sub);
  }

  @Get('users/:id')
  async getUser(@Request() req: any, @Param('id') id: string) {
    return this.adminService.getUser(req.user.companyId, id);
  }

  @Patch('users/:id')
  async updateUser(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updateUser(req.user.companyId, id, body, req.user.sub);
  }

  @Post('users/:id/suspend')
  async suspendUser(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.adminService.suspendUser(req.user.companyId, req.user.sub, id, body.reason);
  }

  @Post('users/:id/reactivate')
  async reactivateUser(@Request() req: any, @Param('id') id: string) {
    return this.adminService.reactivateUser(req.user.companyId, req.user.sub, id);
  }

  @Post('users/:id/scope')
  async assignUserScope(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.assignUserScope(req.user.companyId, req.user.sub, id, body);
  }

  @Delete('users/:id/scope/:scopeId')
  async revokeUserScope(@Request() req: any, @Param('id') id: string, @Param('scopeId') scopeId: string) {
    return this.adminService.revokeUserScope(req.user.companyId, req.user.sub, id, scopeId);
  }

  @Get('users/:id/effective-access')
  async getUserEffectiveAccess(@Request() req: any, @Param('id') id: string) {
    return this.adminService.getUserEffectiveAccess(req.user.companyId, id);
  }

  // ============================================================
  // VENDORS
  // ============================================================

  @Get('vendors')
  async listVendors(@Request() req: any) {
    return this.adminService.listVendors(req.user.companyId);
  }

  @Post('vendors')
  async createVendor(@Request() req: any, @Body() body: any) {
    return this.adminService.createVendor(req.user.companyId, req.user.sub, body);
  }

  @Put('vendors/:id')
  async updateVendor(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.adminService.updateVendor(req.user.companyId, req.user.sub, id, body);
  }

  @Delete('vendors/:id')
  async deleteVendor(@Request() req: any, @Param('id') id: string) {
    return this.adminService.deleteVendor(req.user.companyId, req.user.sub, id);
  }

  // ============================================================
  // SHIFTS
  // ============================================================

  @Get('shifts')
  async listShifts(@Request() req: any) {
    return this.adminService.listShifts(req.user.companyId);
  }

  @Post('shifts')
  async createShift(@Request() req: any, @Body() body: any) {
    return this.adminService.createShift(req.user.companyId, req.user.sub, body);
  }

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  @Get('audit-logs')
  async getAuditLogs(@Request() req: any, @Query() query: any) {
    return this.adminService.getAuditLogs(req.user.companyId, {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 50,
      entity: query.entity,
      userId: query.userId,
    });
  }
}
