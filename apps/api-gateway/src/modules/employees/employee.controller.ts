import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ============================================================
  // ADMIN: Employee CRUD
  // ============================================================

  @Post()
  @RequirePermissions({ module: 'employee', action: 'create' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async create(@Request() req: any, @Body() body: any) {
    return this.employeeService.createEmployee(req.user.companyId, req.user.sub, body);
  }

  @Get()
  @RequirePermissions({ module: 'employee', action: 'view' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'MANAGER', 'TEAM_LEADER', 'DIRECTOR', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async list(@Request() req: any, @Query() query: any) {
    return this.employeeService.listEmployees(req.user.companyId, {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
      search: query.search,
      departmentId: query.departmentId,
      status: query.status,
      transportEligibility: query.transportEligibility,
    });
  }

  @Get(':id')
  @RequirePermissions({ module: 'employee', action: 'view' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'TEAM_LEADER', 'DIRECTOR', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getOne(@Request() req: any, @Param('id') id: string) {
    // Enforce hierarchy access for managers/TLs
    const isCompanyAdmin = ['COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN'].includes(req.user.role);
    if (!isCompanyAdmin) {
      const canAccess = await this.employeeService.canAccessEmployee(req.user.companyId, req.user.sub, id);
      if (!canAccess) throw new ForbiddenException('You do not have access to this employee');
    }
    return this.employeeService.getEmployee(req.user.companyId, id);
  }

  @Put(':id')
  @RequirePermissions({ module: 'employee', action: 'edit' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.employeeService.updateEmployee(req.user.companyId, req.user.sub, id, body);
  }

  @Delete(':id')
  @RequirePermissions({ module: 'employee', action: 'offboard' })
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.employeeService.deleteEmployee(req.user.companyId, req.user.sub, id);
  }

  @Post('bulk-import')
  @RequirePermissions({ module: 'employee', action: 'import' })
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async bulkImport(@Request() req: any, @Body() body: { records: any[] }) {
    return this.employeeService.bulkImport(req.user.companyId, req.user.sub, body.records);
  }

  @Put(':id/transport-eligibility')
  @RequirePermissions({ module: 'employee', action: 'edit' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async updateEligibility(@Request() req: any, @Param('id') id: string, @Body() body: { status: string; reason: string }) {
    return this.employeeService.updateTransportEligibility(req.user.companyId, req.user.sub, id, body.status, body.reason);
  }

  // ============================================================
  // REPORTING HIERARCHY
  // ============================================================

  @Get('reportees/me')
  async myReportees(@Request() req: any, @Query('type') type?: string) {
    return this.employeeService.getMyReportees(req.user.companyId, req.user.sub, type);
  }

  @Post(':id/reassign-manager')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async reassignManager(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { newManagerId: string; relationshipType?: string },
  ) {
    return this.employeeService.reassignManager(
      req.user.companyId, req.user.sub, id, body.newManagerId, body.relationshipType,
    );
  }

  // ============================================================
  // EMPLOYEE SELF-SERVICE
  // ============================================================

  @Get('self/profile')
  async selfProfile(@Request() req: any) {
    return this.employeeService.getOwnProfile(req.user.companyId, req.user.sub);
  }

  @Put('self/profile')
  async selfUpdate(@Request() req: any, @Body() body: any) {
    return this.employeeService.updateOwnProfile(req.user.companyId, req.user.sub, body);
  }

  @Post('self/pickup-pin')
  async setPickupPin(@Request() req: any, @Body() body: any) {
    return this.employeeService.setPickupPin(req.user.companyId, req.user.sub, body);
  }

  @Get('self/locations')
  async getMyLocations(@Request() req: any) {
    return this.employeeService.getSavedLocations(req.user.sub);
  }

  @Delete('self/locations/:locationId')
  async deleteMyLocation(@Request() req: any, @Param('locationId') locationId: string) {
    return this.employeeService.deleteSavedLocation(req.user.companyId, req.user.sub, locationId);
  }

  @Get('self/trip-history')
  async myTripHistory(@Request() req: any, @Query() query: any) {
    return this.employeeService.getTripHistory(req.user.companyId, req.user.sub, {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20,
    });
  }

  @Post('self/recurring/:id/pause')
  async pauseRecurring(@Request() req: any, @Param('id') id: string) {
    return this.employeeService.pauseRecurringBooking(req.user.companyId, req.user.sub, id);
  }

  @Post('self/recurring/:id/resume')
  async resumeRecurring(@Request() req: any, @Param('id') id: string) {
    return this.employeeService.resumeRecurringBooking(req.user.companyId, req.user.sub, id);
  }

  // ============================================================
  // MANAGER / TL PORTAL
  // ============================================================

  @Get('manager/pending-approvals')
  @Roles('MANAGER', 'TEAM_LEADER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async pendingApprovals(@Request() req: any) {
    return this.employeeService.getPendingApprovals(req.user.companyId, req.user.sub);
  }

  @Post('manager/approve/:approvalId')
  @Roles('MANAGER', 'TEAM_LEADER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async approveRequest(
    @Request() req: any,
    @Param('approvalId') approvalId: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    return this.employeeService.approveRequest(
      req.user.companyId, req.user.sub, approvalId, body.decision, body.reason,
    );
  }

  @Get('manager/team-overview')
  @Roles('MANAGER', 'TEAM_LEADER', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async teamOverview(@Request() req: any) {
    return this.employeeService.getTeamTransportOverview(req.user.companyId, req.user.sub);
  }

  // ============================================================
  // DIRECTOR PORTAL
  // ============================================================

  @Get('director/escalated-approvals')
  @Roles('DIRECTOR', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async escalatedApprovals(@Request() req: any) {
    return this.employeeService.getEscalatedApprovals(req.user.companyId, req.user.sub);
  }

  @Get('director/org-exceptions')
  @Roles('DIRECTOR', 'COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async orgExceptions(@Request() req: any) {
    return this.employeeService.getOrgExceptions(req.user.companyId, req.user.sub);
  }
}
