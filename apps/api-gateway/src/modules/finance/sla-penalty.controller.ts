import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SLAPenaltyService } from './sla-penalty.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('sla')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class SLAPenaltyController {
  constructor(private readonly slaService: SLAPenaltyService) {}

  @Post('penalty')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createPenalty(@Request() req: any, @Body() body: { vendorId: string; period: string; slaMetric: string; targetValue: number; actualValue: number; penaltyAmount?: number; notes?: string }) {
    return this.slaService.createPenalty(req.user.companyId, body, req.user.id);
  }

  @Get('penalties')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getPenalties(@Request() req: any, @Query('vendorId') vendorId?: string, @Query('slaMetric') slaMetric?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.slaService.getPenalties(req.user.companyId, { vendorId, slaMetric, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('penalty/:penaltyId/approve')
  @Roles('COMPANY_ADMIN')
  async approvePenalty(@Request() req: any, @Param('penaltyId') penaltyId: string) {
    return this.slaService.approvePenalty(req.user.companyId, penaltyId, req.user.id);
  }

  @Get('vendor/:vendorId/summary')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getVendorSummary(@Request() req: any, @Param('vendorId') vendorId: string, @Query('fiscalYear') fiscalYear: string) {
    return this.slaService.getVendorSLASummary(req.user.companyId, vendorId, fiscalYear);
  }
}
