import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/approvals')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class ApprovalWorkflowController {
  constructor(private readonly approvalService: ApprovalWorkflowService) {}

  @Post()
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DISPATCHER')
  async createApprovalRequest(@Request() req: any, @Body() body: { workflowType: string; entityType: string; entityId: string; requestReason: string; priority?: string; metadata?: any }) {
    return this.approvalService.createApprovalRequest(req.user.companyId, body, req.user.id);
  }

  @Get('pending')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR', 'TEAM_LEADER')
  async getPendingApprovals(@Request() req: any, @Query('approverRole') approverRole?: string) {
    return this.approvalService.getPendingApprovals(req.user.companyId, approverRole);
  }

  @Get('my-requests')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR', 'TEAM_LEADER', 'EMPLOYEE')
  async getMyRequests(@Request() req: any) { return this.approvalService.getMyRequests(req.user.companyId, req.user.id); }

  @Post(':approvalId/decide')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR', 'TEAM_LEADER')
  async approveRequest(@Request() req: any, @Param('approvalId') approvalId: string, @Body() body: { decision: string; reason?: string }) {
    return this.approvalService.approveRequest(req.user.companyId, approvalId, body.decision, req.user.id, body.reason);
  }

  @Post(':approvalId/escalate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR', 'TEAM_LEADER')
  async escalateRequest(@Request() req: any, @Param('approvalId') approvalId: string) {
    return this.approvalService.escalateRequest(req.user.companyId, approvalId);
  }

  @Post(':approvalId/cancel')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR', 'TEAM_LEADER', 'EMPLOYEE')
  async cancelRequest(@Request() req: any, @Param('approvalId') approvalId: string) {
    return this.approvalService.cancelRequest(req.user.companyId, approvalId, req.user.id);
  }

  @Get('stats')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR')
  async getApprovalStats(@Request() req: any) { return this.approvalService.getApprovalStats(req.user.companyId); }

  @Get('history')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR')
  async getWorkflowHistory(@Request() req: any, @Query('workflowType') workflowType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.approvalService.getWorkflowHistory(req.user.companyId, { workflowType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }
}
