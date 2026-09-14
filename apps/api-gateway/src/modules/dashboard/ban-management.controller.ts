import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { BanManagementService } from './ban-management.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/bans')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class BanManagementController {
  constructor(private readonly banService: BanManagementService) {}

  @Post()
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createBan(@Request() req: any, @Body() body: { userId: string; banType: string; reason: string; banEndDate?: string; isPermanent?: boolean }) {
    return this.banService.createBan(req.user.companyId, body, req.user.id);
  }

  @Get()
  async getBans(@Request() req: any, @Query('status') status?: string, @Query('userId') userId?: string, @Query('banType') banType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.banService.getBans(req.user.companyId, { status, userId, banType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post(':banId/request-removal')
  async requestBanRemoval(@Request() req: any, @Param('banId') banId: string, @Body() body: { reason: string }) {
    return this.banService.requestBanRemoval(req.user.companyId, banId, body.reason, req.user.id);
  }

  @Post(':banId/approve-removal')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'MANAGER', 'DIRECTOR')
  async approveBanRemoval(@Request() req: any, @Param('banId') banId: string, @Body() body: { decision: string; reason?: string }) {
    return this.banService.approveBanRemoval(req.user.companyId, banId, body.decision, req.user.id, body.reason);
  }

  @Get('history/:userId')
  async getBanHistory(@Request() req: any, @Param('userId') userId: string) {
    return this.banService.getBanHistory(req.user.companyId, userId);
  }

  @Get('check/:userId')
  async isUserBanned(@Request() req: any, @Param('userId') userId: string) {
    return this.banService.isUserBanned(req.user.companyId, userId);
  }

  @Get('stats')
  async getBanStats(@Request() req: any) { return this.banService.getBanStats(req.user.companyId); }
}
