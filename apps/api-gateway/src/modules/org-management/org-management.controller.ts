import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrgManagementService } from './org-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('org')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
export class OrgManagementController {
  constructor(private readonly orgService: OrgManagementService) {}

  // Regions
  @Get('regions')
  async getRegions(@Request() req: any) {
    return this.orgService.getRegions(req.user.companyId);
  }

  @Post('regions')
  async createRegion(@Request() req: any, @Body() body: { regionCode: string; regionName: string; description?: string }) {
    return this.orgService.createRegion(req.user.companyId, body, req.user.sub);
  }

  @Put('regions/:id')
  async updateRegion(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.orgService.updateRegion(req.user.companyId, id, body, req.user.sub);
  }

  // Sites
  @Get('sites')
  async getSites(@Request() req: any) {
    return this.orgService.getSites(req.user.companyId);
  }

  @Post('sites')
  async createSite(@Request() req: any, @Body() body: any) {
    return this.orgService.createSite(req.user.companyId, body, req.user.sub);
  }

  @Put('sites/:id')
  async updateSite(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.orgService.updateSite(req.user.companyId, id, body, req.user.sub);
  }

  @Delete('sites/:id')
  async deleteSite(@Request() req: any, @Param('id') id: string) {
    return this.orgService.deleteSite(req.user.companyId, id, req.user.sub);
  }

  // LOBs
  @Get('lobs')
  async getLOBs(@Request() req: any, @Query('siteId') siteId?: string) {
    return this.orgService.getLOBs(req.user.companyId, siteId);
  }

  @Post('lobs')
  async createLOB(@Request() req: any, @Body() body: any) {
    return this.orgService.createLOB(req.user.companyId, body, req.user.sub);
  }

  @Put('lobs/:id')
  async updateLOB(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.orgService.updateLOB(req.user.companyId, id, body, req.user.sub);
  }

  @Delete('lobs/:id')
  async deleteLOB(@Request() req: any, @Param('id') id: string) {
    return this.orgService.deleteLOB(req.user.companyId, id, req.user.sub);
  }

  // Processes
  @Get('processes')
  async getProcesses(@Request() req: any, @Query('lobId') lobId?: string) {
    return this.orgService.getProcesses(req.user.companyId, lobId);
  }

  @Post('processes')
  async createProcess(@Request() req: any, @Body() body: any) {
    return this.orgService.createProcess(req.user.companyId, body, req.user.sub);
  }

  @Put('processes/:id')
  async updateProcess(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.orgService.updateProcess(req.user.companyId, id, body, req.user.sub);
  }

  @Delete('processes/:id')
  async deleteProcess(@Request() req: any, @Param('id') id: string) {
    return this.orgService.deleteProcess(req.user.companyId, id, req.user.sub);
  }


  // Shifts
  @Get('shifts')
  async getShifts(@Request() req: any) {
    return this.orgService.getShifts(req.user.companyId);
  }

  @Post('shifts')
  async createShift(@Request() req: any, @Body() body: { name: string; startTime: string; endTime: string; description?: string }) {
    return this.orgService.createShift(req.user.companyId, body, req.user.sub);
  }

  @Put('shifts/:id')
  async updateShift(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.orgService.updateShift(req.user.companyId, id, body, req.user.sub);
  }

  @Delete('shifts/:id')
  async deleteShift(@Request() req: any, @Param('id') id: string) {
    return this.orgService.deleteShift(req.user.companyId, id, req.user.sub);
  }

  // Org Tree
  @Get('tree')
  async getOrgTree(@Request() req: any) {
    return this.orgService.getOrgTree(req.user.companyId);
  }

  // Employee Org Assignments
  @Get('employees/:userId/assignments')
  async getEmployeeOrgAssignments(@Request() req: any, @Param('userId') userId: string) {
    return this.orgService.getEmployeeOrgAssignments(req.user.companyId, userId);
  }

  @Post('employees/:userId/assignments')
  async assignEmployeeToOrg(@Request() req: any, @Param('userId') userId: string, @Body() body: any) {
    return this.orgService.assignEmployeeToOrg(req.user.companyId, userId, body, req.user.sub);
  }

  @Delete('assignments/:id')
  async removeEmployeeOrgAssignment(@Request() req: any, @Param('id') id: string) {
    return this.orgService.removeEmployeeOrgAssignment(req.user.companyId, id, req.user.sub);
  }

  // Access Scopes
  @Get('users/:userId/access-scopes')
  async getUserAccessScopes(@Request() req: any, @Param('userId') userId: string) {
    return this.orgService.getUserAccessScopes(req.user.companyId, userId);
  }

  @Post('users/:userId/access-scopes')
  async grantAccessScope(@Request() req: any, @Param('userId') userId: string, @Body() body: any) {
    return this.orgService.grantAccessScope(req.user.companyId, userId, body, req.user.sub);
  }

  @Delete('access-scopes/:id')
  async revokeAccessScope(@Request() req: any, @Param('id') id: string) {
    return this.orgService.revokeAccessScope(req.user.companyId, id, req.user.sub);
  }

  @Get('users/:userId/effective-access')
  async getEffectiveAccess(@Request() req: any, @Param('userId') userId: string) {
    return this.orgService.getEffectiveAccess(req.user.companyId, userId);
  }

  // Transport Access Roles
  @Get('transport-roles')
  async getTransportAccessRoles(@Request() req: any) {
    return this.orgService.getTransportAccessRoles(req.user.companyId);
  }

  @Post('transport-roles')
  async createTransportAccessRole(@Request() req: any, @Body() body: any) {
    return this.orgService.createTransportAccessRole(req.user.companyId, body, req.user.sub);
  }

  @Put('transport-roles/:id')
  async updateTransportAccessRole(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.orgService.updateTransportAccessRole(req.user.companyId, id, body, req.user.sub);
  }

  @Delete('transport-roles/:id')
  async deleteTransportAccessRole(@Request() req: any, @Param('id') id: string) {
    return this.orgService.deleteTransportAccessRole(req.user.companyId, id, req.user.sub);
  }

  // Transport Access Assignments
  @Get('transport-assignments')
  async getTransportAccessAssignments(@Request() req: any) {
    return this.orgService.getTransportAccessAssignments(req.user.companyId);
  }

  @Post('transport-assignments')
  async assignTransportAccessRole(@Request() req: any, @Body() body: any) {
    return this.orgService.assignTransportAccessRole(req.user.companyId, body, req.user.sub);
  }

  @Delete('transport-assignments/:id')
  async revokeTransportAccessRole(@Request() req: any, @Param('id') id: string) {
    return this.orgService.revokeTransportAccessRole(req.user.companyId, id, req.user.sub);
  }

  // Permission Definitions
  @Get('permissions')
  async getPermissionDefinitions(@Request() req: any) {
    return this.orgService.getPermissionDefinitions(req.user.companyId);
  }

  @Post('permissions')
  async createPermissionDefinition(@Request() req: any, @Body() body: any) {
    return this.orgService.createPermissionDefinition(req.user.companyId, body, req.user.sub);
  }

  // Role-Permission Config
  @Get('role-permissions')
  async getRolePermissionConfigs(@Request() req: any, @Query('roleId') roleId?: string) {
    return this.orgService.getRolePermissionConfigs(req.user.companyId, roleId);
  }

  @Post('role-permissions')
  async setRolePermissionConfig(@Request() req: any, @Body() body: { roleId: string; permissionId: string; enabled: boolean }) {
    return this.orgService.setRolePermissionConfig(req.user.companyId, body.roleId, body.permissionId, body.enabled, req.user.sub);
  }

  @Post('role-permissions/bulk')
  async bulkSetRolePermissions(@Request() req: any, @Body() body: { roleId: string; permissionIds: string[]; enabled: boolean }) {
    return this.orgService.bulkSetRolePermissions(req.user.companyId, body.roleId, body.permissionIds, body.enabled, req.user.sub);
  }
}
