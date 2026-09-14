import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { DriverService } from './driver.service';
import { VehicleService } from './vehicle.service';
import { ComplianceService } from './compliance.service';
import { QRVehicleService } from './qr-vehicle.service';
import { DriverOnboardingService } from './driver-onboarding.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
export class FleetController {
  constructor(
    private driverService: DriverService,
    private vehicleService: VehicleService,
    private complianceService: ComplianceService,
    private qrService: QRVehicleService,
    private onboardingService: DriverOnboardingService,
  ) {}

  // ============================================================
  // DRIVER ENDPOINTS
  // ============================================================

  @Get('drivers')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'VENDOR_ADMIN')
  async listDrivers(@Tenant() companyId: string, @Query() query: any) {
    return this.driverService.listDrivers(companyId, query);
  }

  @Post('drivers')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createDriver(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.driverService.createDriver(companyId, req.user.userId, body);
  }

  @Get('drivers/:id')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'VENDOR_ADMIN', 'MAINTENANCE_USER', 'CONTROL_ROOM_USER')
  async getDriver(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.getDriver(companyId, id);
  }

  @Patch('drivers/:id')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async updateDriver(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.driverService.updateDriver(companyId, req.user.userId, id, body);
  }

  @Post('drivers/:id/verify')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async verifyDriver(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.driverService.verifyDriver(companyId, req.user.userId, id);
  }

  @Post('drivers/:id/suspend')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async suspendDriver(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.driverService.suspendDriver(companyId, req.user.userId, id, body.reason);
  }

  @Post('drivers/:id/activate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async activateDriver(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.driverService.activateDriver(companyId, req.user.userId, id);
  }

  // Driver Documents
  @Get('drivers/:id/documents')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'MAINTENANCE_USER')
  async listDriverDocuments(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.listDocuments(companyId, id);
  }

  @Post('drivers/:id/documents')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DRIVER')
  async uploadDriverDocument(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.driverService.uploadDocument(companyId, req.user.userId, id, body);
  }

  @Post('drivers/:id/documents/:documentId/verify')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async verifyDriverDocument(@Tenant() companyId: string, @Req() req: any, @Param('documentId') documentId: string) {
    return this.driverService.verifyDocument(companyId, req.user.userId, documentId);
  }

  @Post('drivers/:id/documents/:documentId/reject')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async rejectDriverDocument(@Tenant() companyId: string, @Req() req: any, @Param('documentId') documentId: string, @Body() body: any) {
    return this.driverService.rejectDocument(companyId, req.user.userId, documentId, body.reason);
  }

  // Driver Compliance
  @Get('drivers/:id/compliance')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'MAINTENANCE_USER', 'CONTROL_ROOM_USER')
  async getDriverCompliance(@Tenant() companyId: string, @Param('id') id: string) {
    return this.complianceService.checkDriverCompliance(companyId, id);
  }

  // Driver Check-in/Check-out/Break
  @Post('drivers/:id/check-in')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async driverCheckIn(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.checkIn(companyId, id);
  }

  @Post('drivers/:id/check-out')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async driverCheckOut(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.checkOut(companyId, id);
  }

  @Post('drivers/:id/break/start')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async startBreak(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.startBreak(companyId, id);
  }

  @Post('drivers/:id/break/end')
  @Roles('DRIVER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async endBreak(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.endBreak(companyId, id);
  }

  // Driver Shifts
  @Get('drivers/:id/shifts')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DRIVER')
  async listDriverShifts(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.listShifts(companyId, id);
  }

  @Post('drivers/:id/shifts')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createDriverShift(@Tenant() companyId: string, @Param('id') id: string, @Body() body: any) {
    return this.driverService.createShift(companyId, id, body);
  }

  // Driver Vehicle Assignments
  @Get('drivers/:id/vehicle-assignments')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async listVehicleAssignments(@Tenant() companyId: string, @Param('id') id: string) {
    return this.driverService.listVehicleAssignments(companyId, id);
  }

  @Post('drivers/:id/vehicle-assignments')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async assignVehicle(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.driverService.assignVehicle(companyId, req.user.userId, id, body.vehicleId, body.assignmentType);
  }

  // ============================================================
  // VEHICLE ENDPOINTS
  // ============================================================

  @Get('vehicles')
  @RequirePermissions({ module: 'vehicle', action: 'view' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'VENDOR_ADMIN', 'MAINTENANCE_USER')
  async listVehicles(@Tenant() companyId: string, @Query() query: any) {
    return this.vehicleService.listVehicles(companyId, query);
  }

  @Post('vehicles')
  @RequirePermissions({ module: 'vehicle', action: 'create' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createVehicle(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.vehicleService.createVehicle(companyId, req.user.userId, body);
  }

  @Get('vehicles/import/template')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getVehicleImportTemplate() {
    return { template: this.vehicleService.getVehicleImportTemplate() };
  }

  @Post('vehicles/bulk-import')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async bulkImportVehicles(@Tenant() companyId: string, @Req() req: any, @Body() body: { csvContent: string; dryRun?: boolean }) {
    return this.vehicleService.bulkImportVehicles(companyId, req.user.userId, body.csvContent, body.dryRun);
  }

  @Get('vehicles/:id')
  @RequirePermissions({ module: 'vehicle', action: 'view' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'VENDOR_ADMIN', 'MAINTENANCE_USER', 'CONTROL_ROOM_USER')
  async getVehicle(@Tenant() companyId: string, @Param('id') id: string) {
    return this.vehicleService.getVehicle(companyId, id);
  }

  @Patch('vehicles/:id')
  @RequirePermissions({ module: 'vehicle', action: 'edit' })
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async updateVehicle(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vehicleService.updateVehicle(companyId, req.user.userId, id, body);
  }

  @Delete('vehicles/:id')
  @RequirePermissions({ module: 'vehicle', action: 'edit' })
  @Roles('COMPANY_ADMIN')
  async deleteVehicle(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.vehicleService.deleteVehicle(companyId, req.user.userId, id);
  }

  @Post('vehicles/:id/verify')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async verifyVehicle(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.vehicleService.verifyVehicle(companyId, req.user.userId, id);
  }

  @Post('vehicles/:id/block')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async blockVehicle(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vehicleService.blockVehicle(companyId, req.user.userId, id, body.reason);
  }

  @Post('vehicles/:id/unblock')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async unblockVehicle(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.vehicleService.unblockVehicle(companyId, req.user.userId, id);
  }

  @Post('vehicles/:id/retire')
  @Roles('COMPANY_ADMIN')
  async retireVehicle(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.vehicleService.retireVehicle(companyId, req.user.userId, id);
  }

  // Vehicle Documents
  @Get('vehicles/:id/documents')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'MAINTENANCE_USER')
  async listVehicleDocuments(@Tenant() companyId: string, @Param('id') id: string) {
    return this.vehicleService.listDocuments(companyId, id);
  }

  @Post('vehicles/:id/documents')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MAINTENANCE_USER')
  async uploadVehicleDocument(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vehicleService.uploadDocument(companyId, req.user.userId, id, body);
  }

  @Post('vehicles/:id/documents/:documentId/verify')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async verifyVehicleDocument(@Tenant() companyId: string, @Req() req: any, @Param('documentId') documentId: string) {
    return this.vehicleService.verifyDocument(companyId, req.user.userId, documentId);
  }

  @Post('vehicles/:id/documents/:documentId/reject')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async rejectVehicleDocument(@Tenant() companyId: string, @Req() req: any, @Param('documentId') documentId: string, @Body() body: any) {
    return this.vehicleService.rejectDocument(companyId, req.user.userId, documentId, body.reason);
  }

  // Vehicle Compliance
  @Get('vehicles/:id/compliance')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'MAINTENANCE_USER')
  async getVehicleCompliance(@Tenant() companyId: string, @Param('id') id: string) {
    return this.complianceService.checkVehicleCompliance(companyId, id);
  }

  // Combined Compliance
  @Post('compliance/check')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async checkCombinedCompliance(@Tenant() companyId: string, @Body() body: { driverId: string; vehicleId: string }) {
    return this.complianceService.checkDriverVehicleEligibility(companyId, body.driverId, body.vehicleId);
  }

  // Expiring Documents
  @Get('compliance/expiring')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MAINTENANCE_USER')
  async getExpiringDocuments(@Tenant() companyId: string, @Query('days') days?: string) {
    return this.complianceService.getExpiringDocuments(companyId, days ? parseInt(days) : 60);
  }

  // Vehicle Inspections
  @Get('vehicles/:id/inspections')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'MAINTENANCE_USER', 'DRIVER')
  async listInspections(@Tenant() companyId: string, @Param('id') id: string) {
    return this.vehicleService.listInspections(companyId, id);
  }

  @Post('vehicles/:id/inspections')
  @Roles('DRIVER', 'MAINTENANCE_USER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createInspection(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vehicleService.createInspection(companyId, req.user.userId, id, body);
  }

  // Vehicle Maintenance
  @Get('vehicles/:id/maintenance')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MAINTENANCE_USER')
  async listMaintenance(@Tenant() companyId: string, @Param('id') id: string) {
    return this.vehicleService.listMaintenance(companyId, id);
  }

  @Post('vehicles/:id/maintenance')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MAINTENANCE_USER')
  async createMaintenance(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vehicleService.createMaintenance(companyId, req.user.userId, id, body);
  }

  @Post('vehicles/maintenance/:maintenanceId/start')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MAINTENANCE_USER')
  async startMaintenance(@Tenant() companyId: string, @Req() req: any, @Param('maintenanceId') maintenanceId: string) {
    return this.vehicleService.startMaintenance(companyId, req.user.userId, maintenanceId);
  }

  @Post('vehicles/maintenance/:maintenanceId/complete')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MAINTENANCE_USER')
  async completeMaintenance(@Tenant() companyId: string, @Req() req: any, @Param('maintenanceId') maintenanceId: string, @Body() body: any) {
    return this.vehicleService.completeMaintenance(companyId, req.user.userId, maintenanceId, body);
  }

  // Breakdown
  @Post('vehicles/:id/breakdown')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async reportBreakdown(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.vehicleService.reportBreakdown(companyId, req.user.userId, id, body);
  }

  // ============================================================
  // VEHICLE QR ENDPOINTS
  // ============================================================

  @Post('vehicles/:id/qr/generate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async generateQR(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.qrService.generateQR(companyId, id, req.user.userId, body);
  }

  @Post('qr/:qrId/revoke')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async revokeQR(@Tenant() companyId: string, @Req() req: any, @Param('qrId') qrId: string, @Body() body: any) {
    return this.qrService.revokeQR(companyId, qrId, req.user.userId, body.reason);
  }

  @Post('qr/:qrId/regenerate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async regenerateQR(@Tenant() companyId: string, @Req() req: any, @Param('qrId') qrId: string, @Body() body: any) {
    return this.qrService.regenerateQR(companyId, qrId, req.user.userId, body);
  }

  @Post('qr/verify')
  async verifyQR(@Tenant() companyId: string, @Body() body: { qrCode: string }) {
    return this.qrService.verifyQR(companyId, body.qrCode);
  }

  @Get('vehicles/:id/qr/history')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async listQRHistory(@Tenant() companyId: string, @Param('id') id: string) {
    return this.qrService.listQRHistory(companyId, id);
  }

  @Get('qr')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async listAllQR(@Tenant() companyId: string, @Query() query: any) {
    return this.qrService.listAllQR(companyId, query);
  }

  @Get('qr/stats')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getQRStats(@Tenant() companyId: string) {
    return this.qrService.getQRStats(companyId);
  }

  // ============================================================
  // DRIVER ONBOARDING ENDPOINTS
  // ============================================================

  @Post('drivers/invite')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async inviteDriver(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.onboardingService.inviteDriver(companyId, req.user.userId, body);
  }

  @Get('drivers/onboarding/pending')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async listPendingOnboardings(@Tenant() companyId: string) {
    return this.onboardingService.listPendingOnboardings(companyId);
  }

  @Post('drivers/:id/onboarding/verify')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async verifyOnboarding(@Tenant() companyId: string, @Req() req: any, @Param('id') driverId: string) {
    return this.onboardingService.verifyOnboarding(companyId, req.user.userId, driverId);
  }

  @Post('drivers/:id/onboarding/reject')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async rejectOnboarding(@Tenant() companyId: string, @Req() req: any, @Param('id') driverId: string, @Body() body: { reason: string }) {
    return this.onboardingService.rejectOnboarding(companyId, req.user.userId, driverId, body.reason);
  }

  // Token-based endpoints (no auth - driver uses invite token)
  @Get('driver/onboard/:token')
  async getOnboardingByToken(@Param('token') token: string) {
    return this.onboardingService.getOnboardingByToken(token);
  }

  @Post('driver/onboard/:token/documents')
  async uploadOnboardingDocument(@Param('token') token: string, @Body() body: any) {
    return this.onboardingService.uploadDocument(token, body);
  }

  @Post('driver/onboard/:token/submit')
  async submitOnboardingForReview(@Param('token') token: string) {
    return this.onboardingService.submitForReview(token);
  }
}
