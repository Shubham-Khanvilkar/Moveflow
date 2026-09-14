import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { EnterpriseOpsService } from './enterprise-ops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('enterprise')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class EnterpriseOpsController {
  constructor(private readonly opsService: EnterpriseOpsService) {}

  // --- Driver Compliance ---
  @Get('compliance/:driverId')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async checkCompliance(@Request() req: any, @Param('driverId') driverId: string) {
    return this.opsService.checkDriverCompliance(req.user.companyId, driverId);
  }

  @Put('compliance/:driverId/override')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async overrideCompliance(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { reason: string; expiryHours: number }) {
    return this.opsService.adminOverrideCompliance(req.user.companyId, req.user.sub, driverId, body);
  }

  @Put('compliance/:driverId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async updateCompliance(@Request() req: any, @Param('driverId') driverId: string, @Body() body: any) {
    return this.opsService.updateComplianceStatus(req.user.companyId, driverId, body);
  }

  // --- Boarding Verification ---
  @Post('boarding/create')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async createBoarding(@Request() req: any, @Body() body: { tripId: string; vehicleId: string; driverId: string; method?: string }) {
    return this.opsService.createBoardingVerification(req.user.companyId, body.tripId, body.vehicleId, body.driverId, body.method || 'MANUAL');
  }

  @Post('boarding/:verificationId/otp')
  @Roles('DRIVER')
  async generateOTP(@Request() req: any, @Param('verificationId') id: string) {
    return this.opsService.generateOTP(req.user.companyId, id);
  }

  @Post('boarding/:verificationId/verify-otp')
  @Roles('DRIVER')
  async verifyOTP(@Request() req: any, @Param('verificationId') id: string, @Body() body: { code: string }) {
    return this.opsService.verifyOTP(req.user.companyId, id, body.code);
  }

  @Post('boarding/:verificationId/board')
  @Roles('DRIVER', 'DISPATCHER')
  async boardPassenger(@Request() req: any, @Param('verificationId') id: string, @Body() body: { userId: string; seatNumber?: number; luggageCount?: number; accessibilityNeed?: boolean }) {
    return this.opsService.boardPassenger(req.user.companyId, id, body.userId, body);
  }

  @Post('boarding/:verificationId/no-show')
  @Roles('DRIVER', 'DISPATCHER')
  async markNoShow(@Request() req: any, @Param('verificationId') id: string, @Body() body: { userId: string }) {
    return this.opsService.markNoShow(req.user.companyId, id, body.userId);
  }

  @Post('boarding/:verificationId/complete')
  @Roles('DRIVER', 'DISPATCHER')
  async completeBoarding(@Request() req: any, @Param('verificationId') id: string) {
    return this.opsService.completeBoarding(req.user.companyId, id);
  }

  // --- Trip Changes ---
  @Post('trip-changes')
  async requestChange(@Request() req: any, @Body() body: any) {
    return this.opsService.requestTripChange(req.user.companyId, req.user.sub, req.user.role, body);
  }

  @Post('trip-changes/:id/approve')
  @Roles('MANAGER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async approveChange(@Request() req: any, @Param('id') id: string) {
    return this.opsService.approveTripChange(req.user.companyId, req.user.sub, id);
  }

  @Post('trip-changes/:id/reject')
  @Roles('MANAGER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async rejectChange(@Request() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.opsService.rejectTripChange(req.user.companyId, req.user.sub, id, body.reason);
  }

  // --- Re-dispatch ---
  @Post('redispatch')
  @Roles('DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async triggerRedispatch(@Request() req: any, @Body() body: { tripId: string; driverId: string; triggerType: string; vehicleId?: string }) {
    return this.opsService.triggerRedispatch(req.user.companyId, body.tripId, body.driverId, body.triggerType, body.vehicleId);
  }

  // --- Communication Gateway ---
  @Post('communication/send')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async sendCommunication(@Request() req: any, @Body() body: any) {
    return this.opsService.sendCommunication(req.user.companyId, body);
  }

  @Get('communication/logs')
  @Roles('DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async getCommLogs(@Request() req: any, @Query() query: any) {
    return this.opsService.getCommunicationLogs(req.user.companyId, {
      channel: query.channel,
      messageType: query.messageType,
      limit: parseInt(query.limit) || 50,
    });
  }

  // --- Emergency Operations ---
  @Post('emergency/broadcast')
  @Roles('DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async broadcastEmergency(@Request() req: any, @Body() body: any) {
    return this.opsService.broadcastEmergency(req.user.companyId, req.user.sub, body);
  }

  @Post('emergency/mass-cancel')
  @Roles('TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async massCancel(@Request() req: any, @Body() body: any) {
    return this.opsService.massCancel(req.user.companyId, req.user.sub, body);
  }

  // --- Driver Working Hours ---
  @Get('work-log/:driverId')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async getWorkLog(@Request() req: any, @Param('driverId') driverId: string, @Query('date') date?: string) {
    return this.opsService.getDriverWorkLog(req.user.companyId, driverId, date);
  }

  @Post('work-log/break/start')
  @Roles('DRIVER', 'COMPANY_ADMIN')
  async startBreak(@Request() req: any) {
    return this.opsService.startBreak(req.user.companyId, req.user.sub);
  }

  @Post('work-log/break/end')
  @Roles('DRIVER', 'COMPANY_ADMIN')
  async endBreak(@Request() req: any) {
    return this.opsService.endBreak(req.user.companyId, req.user.sub);
  }

  // --- Fuel & Odometer ---
  @Post('fuel')
  @Roles('DRIVER', 'COMPANY_ADMIN')
  async logFuel(@Request() req: any, @Body() body: any) {
    return this.opsService.logFuelEntry(req.user.companyId, req.user.sub, body);
  }

  @Post('odometer')
  @Roles('DRIVER', 'COMPANY_ADMIN')
  async logOdometer(@Request() req: any, @Body() body: any) {
    return this.opsService.logOdometerReading(req.user.companyId, req.user.sub, body);
  }

  // --- Trip Expenses ---
  @Post('expenses/:tripId')
  @Roles('DRIVER', 'COMPANY_ADMIN')
  async submitExpense(@Request() req: any, @Param('tripId') tripId: string, @Body() body: any) {
    return this.opsService.submitTripExpense(req.user.companyId, req.user.sub, tripId, body);
  }

  @Post('expenses/:expenseId/verify')
  @Roles('DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async verifyExpense(@Request() req: any, @Param('expenseId') expenseId: string, @Body() body: { approved: boolean; notes?: string }) {
    return this.opsService.verifyTripExpense(req.user.companyId, req.user.sub, expenseId, body.approved, body.notes);
  }
}
