import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { NoShowPolicyService } from './no-show-policy.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/no-show')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class NoShowPolicyController {
  constructor(private readonly policyService: NoShowPolicyService) {}

  @Post('policies')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createPolicy(@Request() req: any, @Body() body: any) { return this.policyService.createPolicy(req.user.companyId, body, req.user.id); }

  @Get('policies')
  async getPolicies(@Request() req: any) { return this.policyService.getPolicies(req.user.companyId); }

  @Put('policies/:policyId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async updatePolicy(@Request() req: any, @Param('policyId') policyId: string, @Body() body: any) { return this.policyService.updatePolicy(req.user.companyId, policyId, body, req.user.id); }

  @Post('record')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async recordNoShow(@Request() req: any, @Body() body: { userId: string; bookingId?: string }) { return this.policyService.recordNoShow(req.user.companyId, body.userId, body.bookingId); }

  @Get('records')
  async getNoShowRecords(@Request() req: any, @Query('userId') userId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.policyService.getNoShowRecords(req.user.companyId, { userId, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('records/:recordId/appeal')
  async appealNoShow(@Request() req: any, @Param('recordId') recordId: string, @Body() body: { reason: string }) {
    return this.policyService.appealNoShow(req.user.companyId, recordId, body.reason, req.user.id);
  }

  @Post('records/:recordId/decide')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'MANAGER')
  async decideAppeal(@Request() req: any, @Param('recordId') recordId: string, @Body() body: { decision: string }) {
    return this.policyService.decideAppeal(req.user.companyId, recordId, body.decision, req.user.id);
  }
}
