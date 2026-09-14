import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { EmployeeManagementService } from './employee-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, TenantGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'HR_ADMIN')
export class EmployeeManagementController {
  constructor(private readonly employeeService: EmployeeManagementService) {}

  @Get()
  async getEmployees(@Request() req: any, @Query() query: any) {
    return this.employeeService.getEmployees(
      req.user.companyId,
      {
        siteId: query.siteId, lobId: query.lobId, processId: query.processId, shiftId: query.shiftId,
        search: query.search, transportEligibility: query.transportEligibility,
        page: query.page ? parseInt(query.page) : undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
      },
      req.tenant?.accessScopes,
    );
  }

  @Get(':userId')
  async getEmployeeById(@Request() req: any, @Param('userId') userId: string) {
    return this.employeeService.getEmployeeById(req.user.companyId, userId);
  }

  @Put(':userId/profile')
  async updateEmployeeProfile(@Request() req: any, @Param('userId') userId: string, @Body() body: any) {
    return this.employeeService.updateEmployeeProfile(req.user.companyId, userId, body, req.user.sub);
  }

  // Org Assignments
  @Get(':userId/org-assignments')
  async getOrgAssignments(@Request() req: any, @Param('userId') userId: string) {
    return this.employeeService.getEmployeeById(req.user.companyId, userId);
  }

  @Post(':userId/org-assignments')
  async assignOrg(@Request() req: any, @Param('userId') userId: string, @Body() body: any) {
    return this.employeeService.assignEmployeeOrg(req.user.companyId, userId, body, req.user.sub);
  }

  @Put('org-assignments/:assignmentId')
  async updateOrgAssignment(@Request() req: any, @Param('assignmentId') assignmentId: string, @Body() body: any) {
    return this.employeeService.updateEmployeeOrgAssignment(req.user.companyId, assignmentId, body, req.user.sub);
  }

  @Delete('org-assignments/:assignmentId')
  async removeOrgAssignment(@Request() req: any, @Param('assignmentId') assignmentId: string) {
    return this.employeeService.removeEmployeeOrgAssignment(req.user.companyId, assignmentId, req.user.sub);
  }

  // Manager Hierarchy
  @Get('manager/:managerId/hierarchy')
  async getManagerHierarchy(@Request() req: any, @Param('managerId') managerId: string) {
    return this.employeeService.getManagerHierarchy(req.user.companyId, managerId);
  }

  @Get(':userId/direct-reports')
  async getDirectReports(@Request() req: any, @Param('userId') userId: string) {
    return this.employeeService.getDirectReports(req.user.companyId, userId);
  }

  @Post('manager-relationships')
  async assignManager(@Request() req: any, @Body() body: any) {
    return this.employeeService.assignManager(req.user.companyId, body, req.user.sub);
  }

  @Delete('manager-relationships/:id')
  async removeManagerRelationship(@Request() req: any, @Param('id') id: string) {
    return this.employeeService.removeManagerRelationship(req.user.companyId, id, req.user.sub);
  }

  // Bulk Import
  @Post('bulk-import')
  async bulkImport(@Request() req: any, @Body() body: { employees: any[] }) {
    return this.employeeService.bulkImportEmployees(req.user.companyId, body.employees, req.user.sub);
  }
}
