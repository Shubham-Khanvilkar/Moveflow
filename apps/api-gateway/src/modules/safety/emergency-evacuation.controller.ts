import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EmergencyEvacuationService, EvacuationStatus } from './emergency-evacuation.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('evacuation')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class EmergencyEvacuationController {
  constructor(private readonly evacuationService: EmergencyEvacuationService) {}

  @Post()
  @Roles('COMPANY_ADMIN', 'SAFETY_ADMIN')
  async createEvacuation(@Request() req: any, @Body() body: { title: string; description?: string; scope: string; zoneName?: string; officeIds?: string[]; effectiveFrom: string; effectiveTo?: string }) {
    return this.evacuationService.createEvacuation(req.user.companyId, body, req.user.id);
  }

  @Get()
  @Roles('COMPANY_ADMIN', 'SAFETY_ADMIN', 'TRANSPORT_ADMIN')
  async getEvacuations(@Request() req: any, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.evacuationService.getEvacuations(req.user.companyId, { status, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Get(':evacuationId')
  @Roles('COMPANY_ADMIN', 'SAFETY_ADMIN', 'TRANSPORT_ADMIN')
  async getEvacuationStatus(@Request() req: any, @Param('evacuationId') evacuationId: string) {
    return this.evacuationService.getEvacuationStatus(req.user.companyId, evacuationId);
  }

  @Post(':evacuationId/trigger')
  @Roles('COMPANY_ADMIN', 'SAFETY_ADMIN')
  async triggerEvacuation(@Request() req: any, @Param('evacuationId') evacuationId: string) {
    return this.evacuationService.triggerEvacuation(req.user.companyId, evacuationId, req.user.id);
  }

  @Post(':evacuationId/progress')
  @Roles('COMPANY_ADMIN', 'SAFETY_ADMIN', 'TRANSPORT_ADMIN')
  async recordProgress(@Request() req: any, @Param('evacuationId') evacuationId: string, @Body() body: { affectedTrips?: number; evacuatedCount?: number; safeCount?: number }) {
    return this.evacuationService.recordEvacuationProgress(req.user.companyId, evacuationId, body);
  }

  @Post(':evacuationId/status')
  @Roles('COMPANY_ADMIN', 'SAFETY_ADMIN')
  async updateStatus(@Request() req: any, @Param('evacuationId') evacuationId: string, @Body() body: { status: string }) {
    return this.evacuationService.updateStatus(req.user.companyId, evacuationId, body.status as EvacuationStatus, req.user.id);
  }
}
