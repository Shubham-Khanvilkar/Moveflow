import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { NoShowEvidenceService } from './no-show-evidence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('no-show')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class NoShowEvidenceController {
  constructor(private readonly nseService: NoShowEvidenceService) {}

  // --- Policy ---
  @Get('policy')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getPolicy(@Request() req: any) {
    return this.nseService.getNoShowPolicy(req.user.companyId);
  }

  @Put('policy')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async updatePolicy(@Request() req: any, @Body() body: any) {
    return this.nseService.updateNoShowPolicy(req.user.companyId, req.user.sub, body);
  }

  // --- Call Attempts ---
  @Post('trips/:tripId/passengers/:passengerId/contact')
  @Roles('DRIVER', 'COMPANY_ADMIN')
  async createCallAttempt(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
    @Body() body: { method?: string; callResult?: string; notes?: string; deviceTimestamp?: string },
  ) {
    return this.nseService.createCallAttempt(req.user.companyId, req.user.sub, tripId, passengerId, body);
  }

  @Get('trips/:tripId/passengers/:passengerId/contact-attempts')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async getContactAttempts(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
  ) {
    return this.nseService.getContactAttempts(req.user.companyId, tripId, passengerId);
  }

  // --- Evidence Upload ---
  @Post('trips/:tripId/passengers/:passengerId/contact/:attemptId/evidence')
  @Roles('DRIVER', 'COMPANY_ADMIN')
  async uploadEvidence(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
    @Param('attemptId') attemptId: string,
    @Body() body: { mimeType?: string; fileName?: string; fileSize?: number; idempotencyKey?: string },
  ) {
    return this.nseService.uploadEvidence(req.user.companyId, req.user.sub, tripId, passengerId, attemptId, body);
  }

  // --- No-Show Validation & Finalization ---
  @Post('trips/:tripId/passengers/:passengerId/no-show/validate')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async validateNoShow(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
  ) {
    return this.nseService.validateNoShow(req.user.companyId, tripId, passengerId);
  }

  @Post('trips/:tripId/passengers/:passengerId/no-show/finalize')
  @Roles('DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async finalizeNoShow(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
    @Body() body?: { confirmationMethod?: string },
  ) {
    return this.nseService.finalizeNoShow(req.user.companyId, req.user.sub, tripId, passengerId, body);
  }

  // --- Evidence Access (restricted) ---
  @Get('trips/:tripId/passengers/:passengerId/no-show-evidence')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN', 'CONTROL_ROOM_USER')
  async getEvidence(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
  ) {
    return this.nseService.getNoShowEvidence(req.user.companyId, tripId, passengerId, req.user.role);
  }
}
