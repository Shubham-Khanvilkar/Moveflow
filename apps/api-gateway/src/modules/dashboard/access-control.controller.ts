import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/access')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class AccessControlController {
  constructor(private readonly accessService: AccessControlService) {}

  @Get('roles')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async getRoles(@Request() req: any) { return this.accessService.getRoles(req.user.companyId); }

  @Post('roles')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createRole(@Request() req: any, @Body() body: { roleName: string; displayName: string; description?: string; hierarchyLevel?: number; permissions: Record<string, boolean> }) {
    return this.accessService.createRole(req.user.companyId, body, req.user.id);
  }

  @Post('assign')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async assignRole(@Request() req: any, @Body() body: { userId: string; roleId: string }) {
    return this.accessService.assignRole(req.user.companyId, body.userId, body.roleId, req.user.id);
  }

  @Delete('revoke/:assignmentId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async revokeRole(@Request() req: any, @Param('assignmentId') assignmentId: string) {
    return this.accessService.revokeRole(req.user.companyId, assignmentId, req.user.id);
  }

  @Get('my-permissions')
  async getMyPermissions(@Request() req: any) { return this.accessService.getUserPermissions(req.user.companyId, req.user.id); }

  @Get('approval-levels/:workflowType')
  async getApprovalLevels(@Request() req: any, @Param('workflowType') workflowType: string) {
    return this.accessService.getApprovalLevels(req.user.companyId, workflowType);
  }

  @Post('approval-levels')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createApprovalLevel(@Request() req: any, @Body() body: { workflowType: string; level: number; approverRole: string; approverUserIds?: string; autoApprove?: boolean; autoApproveAfterMinutes?: number }) {
    return this.accessService.createApprovalLevel(req.user.companyId, body.workflowType, body, req.user.id);
  }
}
