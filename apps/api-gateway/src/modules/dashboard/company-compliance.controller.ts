import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { CompanyComplianceService } from './company-compliance.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/compliance')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class CompanyComplianceController {
  constructor(private readonly complianceService: CompanyComplianceService) {}

  @Get('team')
  async getComplianceTeam(@Request() req: any) { return this.complianceService.getComplianceTeam(req.user.companyId); }

  @Post('team')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async addTeamMember(@Request() req: any, @Body() body: any) { return this.complianceService.addTeamMember(req.user.companyId, body, req.user.id); }

  @Delete('team/:memberId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async removeTeamMember(@Request() req: any, @Param('memberId') memberId: string) { return this.complianceService.removeTeamMember(req.user.companyId, memberId, req.user.id); }

  @Get('document-types')
  async getDocumentTypes(@Request() req: any) { return this.complianceService.getDocumentTypes(req.user.companyId); }

  @Post('document-types')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createDocumentType(@Request() req: any, @Body() body: any) { return this.complianceService.createDocumentType(req.user.companyId, body, req.user.id); }

  @Post('documents/upload')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async uploadDocument(@Request() req: any, @Body() body: any) { return this.complianceService.uploadDocument(req.user.companyId, body, req.user.id); }

  @Get('documents')
  async getDocuments(@Request() req: any, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string, @Query('status') status?: string, @Query('documentType') documentType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.complianceService.getDocuments(req.user.companyId, { entityType, entityId, status, documentType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('documents/:docId/review')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async reviewDocument(@Request() req: any, @Param('docId') docId: string, @Body() body: { decision: string; notes?: string }) {
    return this.complianceService.reviewDocument(req.user.companyId, docId, body.decision, req.user.id, body.notes);
  }

  @Post('audits')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createAudit(@Request() req: any, @Body() body: any) { return this.complianceService.createAudit(req.user.companyId, body, req.user.id); }

  @Get('audits')
  async getAudits(@Request() req: any, @Query('status') status?: string, @Query('auditType') auditType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.complianceService.getAudits(req.user.companyId, { status, auditType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('audits/:auditId/complete')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async completeAudit(@Request() req: any, @Param('auditId') auditId: string, @Body() body: any) {
    return this.complianceService.completeAudit(req.user.companyId, auditId, body, req.user.id);
  }

  @Post('tasks')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createTask(@Request() req: any, @Body() body: any) { return this.complianceService.createTask(req.user.companyId, body, req.user.id); }

  @Post('tasks/:taskId/delegate')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async delegateTask(@Request() req: any, @Param('taskId') taskId: string, @Body() body: { assignTo: string }) {
    return this.complianceService.delegateTask(req.user.companyId, taskId, body.assignTo, req.user.id);
  }

  @Get('tasks')
  async getTasks(@Request() req: any, @Query('assignedTo') assignedTo?: string, @Query('status') status?: string, @Query('taskType') taskType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.complianceService.getTasks(req.user.companyId, { assignedTo, status, taskType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('tasks/:taskId/complete')
  async completeTask(@Request() req: any, @Param('taskId') taskId: string, @Body() body: { result: string; notes?: string }) {
    return this.complianceService.completeTask(req.user.companyId, taskId, body, req.user.id);
  }

  @Post('policies')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createPolicy(@Request() req: any, @Body() body: any) { return this.complianceService.createPolicy(req.user.companyId, body, req.user.id); }

  @Get('policies')
  async getPolicies(@Request() req: any) { return this.complianceService.getPolicies(req.user.companyId); }

  @Post('cab-approval')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async requestCabApproval(@Request() req: any, @Body() body: any) { return this.complianceService.requestCabApproval(req.user.companyId, body, req.user.id); }

  @Get('cab-approval')
  async getCabApprovals(@Request() req: any, @Query('status') status?: string, @Query('requestType') requestType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.complianceService.getCabApprovals(req.user.companyId, { status, requestType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('cab-approval/:approvalId/review')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async reviewCabApproval(@Request() req: any, @Param('approvalId') approvalId: string, @Body() body: { decision: string; complianceCheck?: boolean; documentsVerified?: boolean; vehicleInspected?: boolean; driverVerified?: boolean; reviewNotes?: string }) {
    return this.complianceService.reviewCabApproval(req.user.companyId, approvalId, body.decision, req.user.id, body);
  }

  @Get('standing')
  async getComplianceStanding(@Request() req: any) { return this.complianceService.getComplianceStanding(req.user.companyId); }

  @Post('standing/refresh')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async refreshComplianceScore(@Request() req: any) { return this.complianceService.refreshComplianceScore(req.user.companyId); }
}
