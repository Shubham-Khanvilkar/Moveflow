import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { RouteMatchService } from './route-match.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('route-match')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class RouteMatchController {
  constructor(private readonly routeMatchService: RouteMatchService) {}

  @Get('find/:tripId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DRIVER')
  async findMatch(@Request() req: any, @Param('tripId') tripId: string) {
    return this.routeMatchService.findRouteMatch(req.user.companyId, tripId);
  }

  @Post('offer')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DRIVER')
  async offerMatch(@Request() req: any, @Body() body: { tripId: string; bookingId: string }) {
    return this.routeMatchService.offerMatch(req.user.companyId, body.tripId, body.bookingId);
  }

  @Post(':candidateId/accept')
  @Roles('DRIVER')
  async acceptMatch(@Request() req: any, @Param('candidateId') candidateId: string) {
    return this.routeMatchService.acceptMatch(req.user.companyId, candidateId);
  }

  @Post(':candidateId/decline')
  @Roles('DRIVER')
  async declineMatch(@Request() req: any, @Param('candidateId') candidateId: string, @Body() body: { reason?: string }) {
    return this.routeMatchService.declineMatch(req.user.companyId, candidateId, body.reason);
  }
}
