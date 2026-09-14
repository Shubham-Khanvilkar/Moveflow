import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard, ACCESSSCOPE_KEY } from '../../common/guards/access-scope.guard';
import { Reflector } from '@nestjs/core';
import { DispatchEngineService } from '../trips/dispatch-engine.service';
import { RouteCacheService } from '../trips/route-cache.service';
import { NodalEngineService } from '../trips/nodal-engine.service';
import { GPSAlertService } from '../trips/gps-alert.service';
import { AppealService } from '../no-show-evidence/appeal.service';
import { SOSCascadeService } from '../safety/sos-cascade.service';
import { SafetyAdvancedService } from '../safety/safety-advanced.service';
import { QRVehicleService } from '../fleet/qr-vehicle.service';
import { GuardComplianceService } from '../fleet/guard-compliance.service';
import { GSTService, BillingModelService } from '../billing/gst-billing.service';
import { WebhookService, PlanLimitsService } from '../billing/webhook-plan.service';
import { ExpenseStateMachineService, ApprovalLimitsService, ExpenseAnalyticsService } from '../phase4a/expense-advanced.service';
import { NotificationTemplateService } from '../notifications/notification-advanced.service';
import { ConsentService, DataRetentionService, BreakGlassService } from '../security/privacy-consent.service';
import { BackupService, BackupObservabilityService } from '../health/backup-observability.service';
import { CarpoolService, WorkplaceService, EVService, GeospatialService } from '../enterprise-ops/additional-features.service';
import { EnterpriseOpsForensicsService, RouteOptimizationService, DriverExperienceService } from '../enterprise-ops/billing-route-driver.service';
import { PrismaService } from '../../common/prisma.service';

@Controller('advanced')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class AdvancedFeaturesController {
  constructor(
    private dispatch: DispatchEngineService,
    private routeCache: RouteCacheService,
    private nodal: NodalEngineService,
    private gpsAlert: GPSAlertService,
    private appeal: AppealService,
    private sosCascade: SOSCascadeService,
    private safetyAdv: SafetyAdvancedService,
    private qrVehicle: QRVehicleService,
    private guardCompliance: GuardComplianceService,
    private gst: GSTService,
    private billingModel: BillingModelService,
    private webhook: WebhookService,
    private planLimits: PlanLimitsService,
    private expenseSM: ExpenseStateMachineService,
    private approvalLimits: ApprovalLimitsService,
    private expenseAnalytics: ExpenseAnalyticsService,
    private notifTemplate: NotificationTemplateService,
    private consent: ConsentService,
    private dataRetention: DataRetentionService,
    private breakGlass: BreakGlassService,
    private backup: BackupService,
    private observability: BackupObservabilityService,
    private carpool: CarpoolService,
    private workplace: WorkplaceService,
    private ev: EVService,
    private geo: GeospatialService,
    private billingForensics: EnterpriseOpsForensicsService,
    private routeOpt: RouteOptimizationService,
    private driverExp: DriverExperienceService,
    private prisma: PrismaService,
  ) {}

  @Post('dispatch/auto')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async autoDispatch(@Request() req: any, @Body() body: { bookingId: string }) {
    return this.dispatch.autoDispatch(req.user.companyId, body.bookingId);
  }

  @Post('dispatch/manual')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async manualDispatch(@Request() req: any, @Body() body: { tripId: string; driverId: string; vehicleId: string }) {
    return this.dispatch.manualDispatch(req.user.companyId, body.tripId, body.driverId, body.vehicleId, req.user.sub);
  }

  @Get('dispatch/sla')
  async getDispatchSLA(@Request() req: any) {
    return this.dispatch.getDispatchSLA(req.user.companyId);
  }

  @Get('dispatch/factors')
  async getDispatchFactors(@Request() req: any) {
    return this.dispatch.dispatchFactors(req.user.companyId);
  }

  @Post('dispatch/override')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async dispatchOverride(@Request() req: any, @Body() body: { tripId: string; reason: string }) {
    return this.dispatch.dispatchOverrideAudit(req.user.companyId, body.tripId, req.user.sub, body.reason);
  }

  @Get('route/cache/stats')
  async getRouteCacheStats() {
    return this.routeCache.getStats();
  }

  @Post('route/compute')
  async computeRoute(@Body() body: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }) {
    return this.routeCache.computeRoute(body.origin, body.destination);
  }

  @Post('nodal/find')
  async findNodalPoints(@Request() req: any, @Body() body: { siteId?: string; shiftId?: string }) {
    return this.nodal.findNodalPoints(req.user.companyId, body);
  }

  @Post('nodal/optimize')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async optimizeNodal(@Request() req: any) {
    return this.nodal.optimizeNodalPoints(req.user.companyId);
  }

  @Post('gps/ping')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'DRIVER')
  async gpsPing(@Request() req: any, @Body() body: any) {
    return this.gpsAlert.processLocationPing({ companyId: req.user.companyId, ...body });
  }

  @Post('gps/batch')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'DRIVER')
  async gpsBatch(@Request() req: any, @Body() body: { pings: any[] }) {
    return this.gpsAlert.batchProcessPings(body.pings.map(p => ({ companyId: req.user.companyId, ...p })));
  }

  @Get('gps/alerts')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'DRIVER')
  async getGPSAlerts(@Request() req: any) {
    return this.gpsAlert.getOverspeedingAlerts(req.user.companyId, {});
  }

  @Get('gps/alert-stats')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'DRIVER')
  async getGPSAlertStats(@Request() req: any) {
    return this.gpsAlert.getAlertStats(req.user.companyId);
  }

  @Post('appeal/submit')
  async submitAppeal(@Request() req: any, @Body() body: { noShowId: string; reason: string; evidence?: string }) {
    return this.appeal.submitAppeal(req.user.companyId, { userId: req.user.sub, ...body });
  }

  @Post('appeal/:id/escalate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async escalateAppeal(@Request() req: any, @Param('id') id: string) {
    return this.appeal.escalateAppeal(req.user.companyId, id, req.user.sub);
  }

  @Post('appeal/:id/decide')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async decideAppeal(@Request() req: any, @Param('id') id: string, @Body() body: { decision: 'UPHELD' | 'OVERTURNED'; reason?: string }) {
    return this.appeal.decideAppeal(req.user.companyId, id, body.decision, req.user.sub, body.reason);
  }

  @Get('appeals')
  async getAppeals(@Request() req: any, @Query() query: { status?: string; page?: number }) {
    return this.appeal.getAppeals(req.user.companyId, query);
  }

  @Get('appeals/sla')
  async getAppealSLA(@Request() req: any) {
    return this.appeal.checkSLA(req.user.companyId);
  }

  @Post('sos/trigger')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'EMPLOYEE')
  async triggerSOS(@Request() req: any, @Body() body: { tripId?: string; latitude?: number; longitude?: number; severity?: string; message?: string }) {
    return this.sosCascade.triggerSOS(req.user.companyId, { userId: req.user.sub, ...body });
  }

  @Post('sos/:id/acknowledge')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'EMPLOYEE')
  async acknowledgeSOS(@Request() req: any, @Param('id') id: string) {
    return this.sosCascade.acknowledgeSOS(req.user.companyId, id, req.user.sub);
  }

  @Post('sos/:id/resolve')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'EMPLOYEE')
  async resolveSOS(@Request() req: any, @Param('id') id: string, @Body() body: { resolution: string }) {
    return this.sosCascade.resolveSOS(req.user.companyId, id, req.user.sub, body.resolution);
  }

  @Get('sos/active')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'EMPLOYEE')
  async getActiveSOS(@Request() req: any) {
    return this.sosCascade.getActiveSOSAlerts(req.user.companyId);
  }

  @Post('safety/safe-reach')
  async safeReachVerification(@Request() req: any, @Body() body: { tripId: string; method: string; confirmed: boolean }) {
    return this.safetyAdv.safeReachVerification(req.user.companyId, { userId: req.user.sub, ...body });
  }

  @Get('safety/safe-reach/:tripId')
  async getSafeReachStatus(@Request() req: any, @Param('tripId') tripId: string) {
    return this.safetyAdv.getSafeReachStatus(req.user.companyId, tripId);
  }

  @Post('safety/marshal/assign')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async assignMarshal(@Request() req: any, @Body() body: { nightShiftId: string; femaleEmployeeIds: string[]; marshalUserId: string }) {
    return this.safetyAdv.assignMarshal(req.user.companyId, body);
  }

  @Get('safety/score')
  async getSafetyScore(@Request() req: any) {
    return this.safetyAdv.getSafetyScore(req.user.companyId);
  }

  @Post('vehicle/qr/generate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async generateQR(@Request() req: any, @Body() body: { vehicleId: string }) {
    return this.qrVehicle.generateQR(req.user.companyId, body.vehicleId, req.user.userId || req.user.sub, {});
  }

  @Post('vehicle/qr/verify')
  async verifyQR(@Request() req: any, @Body() body: { vehicleId: string; qrCode: string }) {
    return this.qrVehicle.verifyQR(req.user.companyId, body.qrCode);
  }

  @Get('guard/compliance/:guardId')
  async checkGuardCompliance(@Request() req: any, @Param('guardId') guardId: string) {
    return this.guardCompliance.checkGuardCompliance(req.user.companyId, guardId);
  }

  @Post('guard/compliance/block')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async blockNonCompliant(@Request() req: any, @Body() body: { guardId: string }) {
    return this.guardCompliance.blockGuardIfNonCompliant(req.user.companyId, body.guardId);
  }

  @Post('billing/gst/calculate')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
  async calculateGST(@Body() body: { amount: number; gstRate?: number }) {
    return this.gst.calculateGST('company', body.amount, body.gstRate);
  }

  @Get('billing/gst/summary')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
  async getGSTSummary(@Request() req: any) {
    return this.gst.getGSTSummary(req.user.companyId, {});
  }

  @Get('billing/models')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
  async getBillingModels() {
    return this.billingModel.getBillingModels();
  }

  @Post('billing/calculate')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
  async calculateTripCost(@Body() body: { model: string; [key: string]: any }) {
    return this.billingModel.calculateTripCost('company', body.model, body);
  }

  @Get('billing/budget-vs-actual')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
  async getBudgetVsActual(@Request() req: any) {
    return this.billingModel.getBudgetVsActual(req.user.companyId);
  }

  @Post('billing/anomalies')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
  async detectBillingAnomalies(@Request() req: any) {
    return this.billingForensics.detectAnomalies(req.user.companyId);
  }

  @Get('billing/forensic-report')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
  async getForensicReport(@Request() req: any) {
    return this.billingForensics.generateForensicReport(req.user.companyId);
  }

  @Post('webhook/create')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createWebhook(@Request() req: any, @Body() body: { url: string; events: string[] }) {
    return this.webhook.createWebhook(req.user.companyId, body);
  }

  @Get('webhooks')
  async listWebhooks(@Request() req: any) {
    return this.webhook.listWebhooks(req.user.companyId);
  }

  @Get('plan/limits')
  async getPlanLimits(@Request() req: any) {
    return this.planLimits.getPlanLimits(req.user.companyId);
  }

  @Post('expense/transition')
  async transitionExpense(@Request() req: any, @Body() body: { expenseId: string; action: string; notes?: string }) {
    return this.expenseSM.transitionExpense(req.user.companyId, body.expenseId, body.action, req.user.sub, body.notes);
  }

  @Get('expense/states')
  async getExpenseStates() {
    return this.expenseSM.getExpenseStates();
  }

  @Get('expense/approval-limits')
  async getApprovalLimits(@Request() req: any) {
    return this.approvalLimits.getLimits(req.user.companyId);
  }

  @Post('expense/check-approval')
  async checkApproval(@Request() req: any, @Body() body: { amount: number }) {
    return this.approvalLimits.canApprove(req.user.companyId, req.user.sub, body.amount);
  }

  @Get('notification/templates')
  async listNotifTemplates() {
    return this.notifTemplate.listTemplates();
  }

  @Post('notification/render')
  async renderNotifTemplate(@Body() body: { templateKey: string; variables: Record<string, string> }) {
    return this.notifTemplate.renderTemplate(body.templateKey, body.variables);
  }

  @Post('consent/record')
  async recordConsent(@Request() req: any, @Body() body: { consentType: string; granted: boolean }) {
    return this.consent.recordConsent(req.user.companyId, req.user.sub, body);
  }

  @Get('consent/status')
  async getConsentStatus(@Request() req: any) {
    return this.consent.getConsentStatus(req.user.companyId, req.user.sub);
  }

  @Post('data-retention/enforce')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR')
  async enforceRetention(@Body() body: { entityType: string; retentionDays: number }) {
    return this.dataRetention.enforceRetentionPolicy('global', body.entityType, body.retentionDays);
  }

  @Get('data-retention/policies')
  async getRetentionPolicies(@Request() req: any) {
    return this.dataRetention.getRetentionPolicies(req.user.companyId);
  }

  @Post('break-glass')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async executeBreakGlass(@Request() req: any, @Body() body: { reason: string; targetUserId?: string }) {
    return this.breakGlass.breakGlassAccess(req.user.companyId, req.user.sub, body);
  }

  @Get('backup/status')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getBackupStatus() {
    return this.backup.getBackupStatus();
  }

  @Post('backup/initiate')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR')
  async initiateBackup(@Request() req: any, @Body() body: { type?: string }) {
    return this.backup.initiateBackup(req.user.companyId, (body.type as any) || 'INCREMENTAL');
  }

  @Get('backup/recovery-plan')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getRecoveryPlan(@Request() req: any) {
    return this.backup.getRecoveryPlan(req.user.companyId);
  }

  @Get('observability/metrics')
  @Roles('COMPANY_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async getMetrics() {
    return this.observability.getMetrics();
  }

  @Get('observability/health')
  async getHealthChecks() {
    return this.observability.getHealthChecks();
  }

  @Post('carpool/find-matches')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'EMPLOYEE')
  async findCarpoolMatches(@Request() req: any, @Body() body: { originLat: number; originLng: number; destLat: number; destLng: number; date: string }) {
    return this.carpool.findCarpoolMatches(req.user.companyId, { ...body, date: new Date(body.date) } as any);
  }

  @Post('carpool/create-ride')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'EMPLOYEE')
  async createCarpoolRide(@Request() req: any, @Body() body: any) {
    return this.carpool.createCarpoolRide(req.user.companyId, req.user.sub, body);
  }

  @Post('carpool/:rideId/join')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'EMPLOYEE')
  async joinCarpool(@Request() req: any, @Param('rideId') rideId: string) {
    return this.carpool.joinCarpool(req.user.companyId, rideId, req.user.sub);
  }

  @Get('carpool/:rideId/cost-sharing')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'EMPLOYEE')
  async getCostSharing(@Request() req: any, @Param('rideId') rideId: string) {
    return this.carpool.calculateCostSharing(req.user.companyId, rideId);
  }

  @Get('workplace/utilization')
  async getWorkplaceUtilization(@Request() req: any) {
    return this.workplace.getSpaceUtilization(req.user.companyId);
  }

  @Get('ev/dashboard')
  async getEVDashboard(@Request() req: any) {
    return this.ev.getEVDashboard(req.user.companyId);
  }

  @Get('ev/carbon-footprint')
  async getCarbonFootprint(@Request() req: any) {
    return this.ev.getCarbonFootprint(req.user.companyId, {});
  }

  @Post('geospatial/geohash')
  async computeGeohash(@Body() body: { lat: number; lng: number; precision?: number }) {
    return this.geo.computeGeohash(body.lat, body.lng, body.precision);
  }

  @Get('geospatial/heatmap')
  async getHeatmap(@Request() req: any) {
    return this.geo.getEmployeeDensityHeatmap(req.user.companyId);
  }

  @Post('geospatial/spatial-filter')
  async spatialFilter(@Request() req: any, @Body() body: { north: number; south: number; east: number; west: number }) {
    return this.geo.spatialFilter(req.user.companyId, body);
  }

  @Get('route/dead-mileage')
  async getDeadMileage(@Request() req: any) {
    return this.routeOpt.getDeadMileage(req.user.companyId);
  }

  @Post('route/steadfct')
  async steadfctScore(@Body() body: any) {
    return this.routeOpt.steadfctScore(body);
  }

  @Post('route/reroute')
  async dynamicReroute(@Request() req: any, @Body() body: { tripId: string; reason: string }) {
    return this.routeOpt.dynamicReroute(req.user.companyId, body.tripId, body.reason);
  }

  @Get('driver/:driverId/wellness')
  async getDriverWellness(@Request() req: any, @Param('driverId') driverId: string) {
    return this.driverExp.getDriverWellness(req.user.companyId, driverId);
  }

  @Get('driver/:driverId/earnings')
  async getDriverEarnings(@Request() req: any, @Param('driverId') driverId: string) {
    return this.driverExp.getDriverEarnings(req.user.companyId, driverId);
  }

  @Get('driver/:driverId/incentives')
  async getDriverIncentives(@Request() req: any, @Param('driverId') driverId: string) {
    return this.driverExp.getDriverIncentives(req.user.companyId, driverId);
  }
}
