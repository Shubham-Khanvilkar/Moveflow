import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { DigitalTwinService, SimulationScenario } from './digital-twin.service';
import { CostLeakDetectorService } from './cost-leak-detector.service';
import { VendorTruthService } from './vendor-truth.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { CapacityExchangeService } from './capacity-exchange.service';
import { CXOAnalyticsService } from './cxo-analytics.service';
import { CarbonIntelligenceService } from './carbon-intelligence.service';
import { SLAComplianceService } from './sla-compliance.service';

@ApiTags('Intelligence Layer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('v1/intelligence')
export class IntelligenceController {
  constructor(
    private readonly digitalTwin: DigitalTwinService,
    private readonly costLeaks: CostLeakDetectorService,
    private readonly vendorTruth: VendorTruthService,
    private readonly predictions: PredictiveAnalyticsService,
    private readonly capacityExchange: CapacityExchangeService,
    private readonly cxoAnalytics: CXOAnalyticsService,
    private readonly carbon: CarbonIntelligenceService,
    private readonly sla: SLAComplianceService,
  ) {}

  // ===== DIGITAL TWIN =====

  @Post('simulations')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Create a what-if simulation scenario' })
  async createSimulation(@Body() dto: SimulationScenario, @Request() req: any) {
    return this.digitalTwin.createSimulation(req.user.companyId, dto, req.user.id);
  }

  @Get('simulations')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'List all simulations' })
  async listSimulations(@Request() req: any) {
    return this.digitalTwin.listSimulations(req.user.companyId);
  }

  @Get('simulations/:id')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get simulation details' })
  async getSimulation(@Param('id') id: string, @Request() req: any) {
    return this.digitalTwin.getSimulation(req.user.companyId, id);
  }

  @Post('simulations/:id/apply')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Apply simulation changes' })
  async applySimulation(@Param('id') id: string, @Request() req: any) {
    return this.digitalTwin.applySimulation(req.user.companyId, id, req.user.id);
  }

  // ===== COST LEAK DETECTION =====

  @Get('cost-leaks')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get cost leak report' })
  async getCostLeaks(
    @Query('status') status: string,
    @Query('severity') severity: string,
    @Request() req: any,
  ) {
    return this.costLeaks.getLeaks(req.user.companyId, status, severity);
  }

  @Get('cost-leaks/summary')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get cost leak summary' })
  async getCostLeakSummary(@Request() req: any) {
    return this.costLeaks.getLeakSummary(req.user.companyId);
  }

  @Get('cost-leaks/:id')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get cost leak details' })
  async getCostLeakById(@Param('id') id: string, @Request() req: any) {
    return this.costLeaks.getLeakById(req.user.companyId, id);
  }

  @Post('cost-leaks/detect')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Run cost leak detection' })
  async detectCostLeaks(@Request() req: any) {
    return this.costLeaks.detectAllLeaks(req.user.companyId);
  }

  @Patch('cost-leaks/:id/acknowledge')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Acknowledge a cost leak' })
  async acknowledgeCostLeak(@Param('id') id: string, @Request() req: any) {
    return this.costLeaks.acknowledgeLeak(req.user.companyId, id, req.user.id);
  }

  @Patch('cost-leaks/:id/resolve')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Resolve a cost leak' })
  async resolveCostLeak(@Param('id') id: string, @Request() req: any) {
    return this.costLeaks.resolveLeak(req.user.companyId, id, req.user.id);
  }

  @Patch('cost-leaks/:id/dismiss')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Dismiss a cost leak' })
  async dismissCostLeak(@Param('id') id: string, @Request() req: any) {
    return this.costLeaks.dismissLeak(req.user.companyId, id, req.user.id);
  }

  // ===== VENDOR TRUTH ENGINE =====

  @Get('vendor-truth')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get all vendor truth summaries' })
  async getAllVendorTruth(@Request() req: any) {
    return this.vendorTruth.getAllVendorTruthSummaries(req.user.companyId);
  }

  @Get('vendor-truth/:vendorId')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get vendor truth report' })
  async getVendorTruth(
    @Param('vendorId') vendorId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.vendorTruth.getVendorTruthReport(
      req.user.companyId,
      vendorId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('vendor-truth/:vendorId/discrepancies')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get vendor discrepancies' })
  async getVendorDiscrepancies(@Param('vendorId') vendorId: string, @Request() req: any) {
    return this.vendorTruth.getVendorDiscrepancies(req.user.companyId, vendorId);
  }

  @Patch('vendor-truth/discrepancies/:id/review')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Review a vendor discrepancy' })
  async reviewDiscrepancy(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.vendorTruth.reviewDiscrepancy(req.user.companyId, id, req.user.id, status);
  }

  // ===== PREDICTIVE ANALYTICS =====

  @Get('predictions')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get all predictions' })
  async getPredictions(@Query('type') type: string, @Request() req: any) {
    return this.predictions.getPredictions(req.user.companyId, type);
  }

  @Get('predictions/summary')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get prediction summary' })
  async getPredictionSummary(@Request() req: any) {
    return this.predictions.getPredictionSummary(req.user.companyId);
  }

  @Get('predictions/no-show/:employeeId')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get no-show prediction for employee' })
  async predictNoShow(@Param('employeeId') employeeId: string, @Request() req: any) {
    return this.predictions.predictNoShow(req.user.companyId, employeeId);
  }

  @Get('predictions/breakdown/:vehicleId')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get breakdown risk prediction for vehicle' })
  async predictBreakdown(@Param('vehicleId') vehicleId: string, @Request() req: any) {
    return this.predictions.predictBreakdown(req.user.companyId, vehicleId);
  }

  @Get('predictions/sla/:tripId')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get SLA risk prediction for trip' })
  async predictSLARisk(@Param('tripId') tripId: string, @Request() req: any) {
    return this.predictions.predictSLARisk(req.user.companyId, tripId);
  }

  // ===== CAPACITY EXCHANGE =====

  @Get('capacity-opportunities')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get capacity exchange opportunities' })
  async getCapacityOpportunities(@Request() req: any) {
    return this.capacityExchange.getOpportunities(req.user.companyId);
  }

  @Get('capacity-opportunities/summary')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get capacity opportunity summary' })
  async getCapacitySummary(@Request() req: any) {
    return this.capacityExchange.getOpportunitySummary(req.user.companyId);
  }

  @Post('capacity-opportunities/detect')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Detect new capacity opportunities' })
  async detectCapacityOpportunities(@Request() req: any) {
    return this.capacityExchange.detectOpportunities(req.user.companyId);
  }

  @Post('capacity-opportunities/:id/accept')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Accept a capacity opportunity' })
  async acceptCapacityOpportunity(@Param('id') id: string, @Request() req: any) {
    return this.capacityExchange.acceptOpportunity(req.user.companyId, id, req.user.id);
  }

  @Post('capacity-opportunities/:id/decline')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Decline a capacity opportunity' })
  async declineCapacityOpportunity(@Param('id') id: string, @Request() req: any) {
    return this.capacityExchange.declineOpportunity(req.user.companyId, id, req.user.id);
  }

  // ===== CXO DRILL-DOWN =====

  @Get('cxo/drill-down')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'CXO drill-down by level (company/site/process/vendor)' })
  async cxoDrillDown(
    @Query('level') level: string,
    @Query('id') id: string,
    @Request() req: any,
  ) {
    return this.cxoAnalytics.drillDown(req.user.companyId, level || 'company', id);
  }

  @Get('cxo/health-score/:entityType/:entityId')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get transport health score' })
  async getHealthScore(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Request() req: any,
  ) {
    return this.cxoAnalytics.calculateHealthScore(req.user.companyId, entityType, entityId);
  }

  @Post('cxo/blast-radius')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Calculate operational blast radius for a change' })
  async calculateBlastRadius(
    @Body('changeType') changeType: string,
    @Body('changeParams') changeParams: any,
    @Request() req: any,
  ) {
    return this.cxoAnalytics.calculateBlastRadius(req.user.companyId, changeType, changeParams);
  }

  // ===== CARBON INTELLIGENCE =====

  @Get('carbon')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get carbon metrics' })
  async getCarbonMetrics(@Query('period') period: string, @Request() req: any) {
    return this.carbon.getCarbonMetrics(req.user.companyId, period);
  }

  @Get('carbon/optimization')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get carbon reduction opportunities' })
  async getCarbonOptimizations(@Request() req: any) {
    return this.carbon.getCarbonOptimizations(req.user.companyId);
  }

  @Post('carbon/optimization/:id/accept')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Accept carbon reduction opportunity' })
  async acceptCarbonOptimization(@Param('id') id: string, @Request() req: any) {
    return this.carbon.acceptOptimization(req.user.companyId, id, req.user.id);
  }

  // ===== SLA COMPLIANCE =====

  @Get('sla/definitions')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get SLA definitions' })
  async getSLADefinitions(@Request() req: any) {
    return this.sla.getDefinitions(req.user.companyId);
  }

  @Post('sla/definitions')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Create SLA definition' })
  async createSLADefinition(@Body() dto: any, @Request() req: any) {
    return this.sla.createDefinition(req.user.companyId, dto, req.user.id);
  }

  @Patch('sla/definitions/:id')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Update SLA definition' })
  async updateSLADefinition(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.sla.updateDefinition(req.user.companyId, id, dto, req.user.id);
  }

  @Delete('sla/definitions/:id')
  @RequirePermissions({ module: 'analytics', action: 'edit' })
  @ApiOperation({ summary: 'Delete SLA definition' })
  async deleteSLADefinition(@Param('id') id: string, @Request() req: any) {
    return this.sla.deleteDefinition(req.user.companyId, id, req.user.id);
  }

  @Get('sla/compliance')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get SLA compliance status' })
  async getSLACompliance(@Request() req: any) {
    return this.sla.getCompliance(req.user.companyId);
  }

  @Get('sla/breaches')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get SLA breaches' })
  async getSLABreaches(@Query('severity') severity: string, @Request() req: any) {
    return this.sla.getBreaches(req.user.companyId, severity);
  }

  @Get('sla/breaches/summary')
  @RequirePermissions({ module: 'analytics', action: 'view' })
  @ApiOperation({ summary: 'Get SLA breaches summary' })
  async getSLABreachSummary(@Request() req: any) {
    return this.sla.getBreachesSummary(req.user.companyId);
  }
}
