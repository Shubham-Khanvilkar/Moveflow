import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ETAService } from './eta.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('eta')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class ETAController {
  constructor(private readonly etaService: ETAService) {}

  @Get(':tripId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'EMPLOYEE', 'DRIVER')
  async getETA(@Param('tripId') tripId: string) {
    return this.etaService.calculateETA(tripId);
  }

  @Post(':tripId/push')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DRIVER')
  async pushETA(@Param('tripId') tripId: string) {
    return this.etaService.pushETA(tripId);
  }
}
