import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OwnerOnlyGuard } from '../../common/guards/owner-only.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OwnerOnly } from '../../common/decorators/owner-only.decorator';
import { PlatformAdminService } from './platform-admin.service';
import { LocationChangeService } from './location-change.service';
import { SecurityEventService } from '../security/security-event.service';

@Controller('platform')
@UseGuards(JwtAuthGuard, AccessScopeGuard, RolesGuard, OwnerOnlyGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
export class PlatformAdminController {
  constructor(
    private readonly svc: PlatformAdminService,
    private readonly locationChangeSvc: LocationChangeService,
    private readonly securityEventSvc: SecurityEventService,
  ) {}

  @Get('companies')
  listCompanies(@Query() q: any) { return this.svc.listCompanies(q); }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) { return this.svc.getCompany(id); }

  @Post('companies')
  createCompany(@Body() body: any) { return this.svc.createCompany(body); }

  @Patch('companies/:id')
  updateCompany(@Param('id') id: string, @Body() body: any) { return this.svc.updateCompany(id, body); }

  @Patch('companies/:id/status')
  setCompanyStatus(@Param('id') id: string, @Body() body: any) { return this.svc.updateCompanyStatus(id, body.status); }

  @Get('users')
  listUsers(@Query('companyId') companyId: string, @Query() q: any) { return this.svc.listUsers(companyId || '', q); }

  @Get('users/:id')
  getUser(@Param('id') id: string) { return this.svc.getUser(id); }

  @Get('users/:id/profile')
  getFullProfile(@Param('id') id: string) { return this.svc.getFullProfile(id); }

  @Patch('users/:id/role')
  assignRole(@Param('id') id: string, @Body() body: any) { return this.svc.updateUserRole(id, body.roleId, body.scope); }

  @Get('roles/:roleId/permissions-delta')
  getPermissionsDelta(@Param('roleId') roleId: string) { return this.svc.getRolePermissionsDelta(roleId); }

  @Post('users/:userId/change-role')
  changeRole(@Req() req: any, @Param('userId') userId: string, @Body() body: { newRoleId: string }) {
    return this.svc.changeUserRole(userId, body.newRoleId, req.user?.sub || 'system');
  }

  @Get('access-simulator/:userId')
  accessSimulator(@Param('userId') userId: string) { return this.svc.simulateAccess(userId); }

  @Get('roles')
  listRoles() { return this.svc.listRoles(); }

  @Get('permissions')
  listPermissions() { return this.svc.listPermissions(); }

  @Get('dashboard/kpi')
  async getDashboardKpi() { return this.svc.getDashboardKpi(); }

  @Get('access-toggles/:userId')
  getAccessToggles(@Param('userId') userId: string, @Query('companyId') companyId?: string) { return this.svc.getAccessToggles(userId, companyId); }

  @Get('access-toggles/:userId/history')
  getAccessToggleHistory(@Param('userId') userId: string, @Query('companyId') companyId?: string) {
    return this.svc.getPermissionOverrideHistory(userId, companyId);
  }

  @Post('access-toggles')
  setAccessToggle(@Req() req: any, @Body() body: any) {
    return this.svc.setAccessToggle(body.userId, body.permissionKey, body.isGranted, req.user?.sub || 'system', body.reason, body.companyId);
  }

  @Post('users/:userId/access/:permissionKey/grant')
  grantPermission(@Req() req: any, @Param('userId') userId: string, @Param('permissionKey') permissionKey: string, @Body() body: any) {
    return this.svc.setPermissionOverride({ ...body, userId, permissionKey, status: 'GRANTED', performedBy: req.user?.sub || 'system' });
  }

  @Post('users/:userId/access/:permissionKey/revoke')
  revokePermission(@Req() req: any, @Param('userId') userId: string, @Param('permissionKey') permissionKey: string, @Body() body: any) {
    return this.svc.setPermissionOverride({ ...body, userId, permissionKey, status: 'REVOKED', performedBy: req.user?.sub || 'system' });
  }

  @Post('users/:userId/access/:permissionKey/suspend')
  suspendPermission(@Req() req: any, @Param('userId') userId: string, @Param('permissionKey') permissionKey: string, @Body() body: any) {
    return this.svc.setPermissionOverride({ ...body, userId, permissionKey, status: 'SUSPENDED', performedBy: req.user?.sub || 'system', suspensionReason: body.reason });
  }

  @Post('users/:userId/access/:permissionKey/reactivate')
  reactivatePermission(@Req() req: any, @Param('userId') userId: string, @Param('permissionKey') permissionKey: string, @Body() body: any) {
    return this.svc.setPermissionOverride({ ...body, userId, permissionKey, status: 'GRANTED', performedBy: req.user?.sub || 'system' });
  }

  @Post('users/:userId/access/bulk')
  bulkPermissionChanges(@Req() req: any, @Param('userId') userId: string, @Body() body: any) {
    return this.svc.bulkPermissionOverrides({ ...body, userId, performedBy: req.user?.sub || 'system' });
  }

  @Get('owners')
  @OwnerOnly()
  listOwners() { return this.svc.listOwners(); }

  @Post('owners')
  @OwnerOnly()
  createOwner(@Req() req: any, @Body() body: any) {
    return this.svc.createOwner({ ...body, createdBy: req.user?.sub || 'system' });
  }

  @Patch('owners/:id/status')
  @OwnerOnly()
  setOwnerStatus(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.svc.setOwnerStatus(id, body.status, req.user?.sub || 'system');
  }

  @Get('owners/:id/audit')
  @OwnerOnly()
  getOwnerAudit(@Param('id') id: string) { return this.svc.getOwnerAudit(id); }

  // ─── SITE MANAGEMENT ──────────────────────────────────────
  @Get('sites')
  listSites(@Query('companyId') companyId: string) { return this.svc.listSites(companyId); }

  @Post('sites')
  createSite(@Body() body: any) { return this.svc.createSite(body); }

  @Patch('sites/:id')
  updateSite(@Param('id') id: string, @Body() body: any) { return this.svc.updateSite(id, body); }

  @Delete('sites/:id')
  deleteSite(@Param('id') id: string) { return this.svc.deleteSite(id); }

  // ─── LOB MANAGEMENT ───────────────────────────────────────
  @Get('lobs')
  listLobs(@Query('companyId') companyId: string) { return this.svc.listLobs(companyId); }

  @Post('lobs')
  createLob(@Body() body: any) { return this.svc.createLob(body); }

  @Patch('lobs/:id')
  updateLob(@Param('id') id: string, @Body() body: any) { return this.svc.updateLob(id, body); }

  @Delete('lobs/:id')
  deleteLob(@Param('id') id: string) { return this.svc.deleteLob(id); }

  // ─── PROCESS MANAGEMENT ───────────────────────────────────
  @Get('processes')
  listProcesses(@Query('companyId') companyId: string) { return this.svc.listProcesses(companyId); }

  @Post('processes')
  createProcess(@Body() body: any) { return this.svc.createProcess(body); }

  @Patch('processes/:id')
  updateProcess(@Param('id') id: string, @Body() body: any) { return this.svc.updateProcess(id, body); }

  @Delete('processes/:id')
  deleteProcess(@Param('id') id: string) { return this.svc.deleteProcess(id); }

  // ─── PERMISSION DEFINITIONS ───────────────────────────────
  @Get('permission-definitions')
  listPermissionDefinitions() { return this.svc.listPermissionDefinitions(); }

  @Post('permission-definitions')
  createPermissionDefinition(@Body() body: any) { return this.svc.createPermissionDefinition(body); }

  @Patch('permission-definitions/:id')
  updatePermissionDefinition(@Param('id') id: string, @Body() body: any) { return this.svc.updatePermissionDefinition(id, body); }

  // ─── EMPLOYEE ONBOARDING/OFFBOARDING ──────────────────────
  @Post('employees/onboard')
  onboardEmployee(@Body() body: any) { return this.svc.onboardEmployee(body); }

  @Post('employees/:id/offboard')
  offboardEmployee(@Param('id') id: string, @Body() body: any) { return this.svc.offboardEmployee(id, body); }

  @Post('employees/bulk-import')
  bulkImportEmployees(@Body() body: any) {
    return this.svc.bulkImportEmployees(body.companyId, body.rows || [], body.importedBy || 'system');
  }

  @Get('employees/:id/details')
  getEmployeeDetails(@Param('id') id: string) { return this.svc.getEmployeeDetails(id); }

  // ─── LOCATION CHANGE REQUESTS ─────────────────────────────
  @Get('location-changes')
  listLocationChanges(@Query('companyId') companyId: string, @Query() q: any) {
    return this.locationChangeSvc.listRequests(companyId, q);
  }

  @Get('location-changes/:id')
  getLocationChange(@Param('id') id: string) { return this.locationChangeSvc.getRequest(id); }

  @Post('location-changes')
  submitLocationChange(@Body() body: any, @Req() req: any) {
    return this.locationChangeSvc.submitRequest({ ...body, requestedBy: req.user?.sub || 'system' });
  }

  @Patch('location-changes/:id/decide')
  decideLocationChange(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.locationChangeSvc.decide({
      requestId: id,
      approvedBy: req.user?.sub || 'system',
      decision: body.decision,
      rejectionReason: body.rejectionReason,
      effectiveDate: body.effectiveDate,
    });
  }

  @Get('location-history/:employeeId')
  getLocationHistory(@Param('employeeId') employeeId: string) {
    return this.locationChangeSvc.getLocationHistory(employeeId);
  }

  @Patch('employees/:id/location')
  manualUpdateLocation(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.locationChangeSvc.manualUpdate(body.companyId, id, {
      latitude: body.latitude,
      longitude: body.longitude,
      address: body.address,
      updatedBy: req.user?.sub || 'system',
      reason: body.reason,
    });
  }

  // ─── SECURITY EVENTS ─────────────────────────────────────
  @Get('security/events')
  getSecurityEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('eventCode') eventCode?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.securityEventSvc.getSecurityEvents({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      eventCode,
      riskLevel,
      ipAddress,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get('security/summary')
  getSecuritySummary() {
    return this.securityEventSvc.getSecuritySummary();
  }
}
