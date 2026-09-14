import { Module } from '@nestjs/common';
import { AdvancedFeaturesController } from './advanced-features.controller';
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
import { AuditService } from '../../common/audit.service';
import { EventsGateway } from '../../common/events.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdvancedFeaturesController],
  providers: [
    DispatchEngineService,
    RouteCacheService,
    NodalEngineService,
    GPSAlertService,
    AppealService,
    SOSCascadeService,
    SafetyAdvancedService,
    QRVehicleService,
    GuardComplianceService,
    GSTService,
    BillingModelService,
    WebhookService,
    PlanLimitsService,
    ExpenseStateMachineService,
    ApprovalLimitsService,
    ExpenseAnalyticsService,
    NotificationTemplateService,
    ConsentService,
    DataRetentionService,
    BreakGlassService,
    BackupService,
    BackupObservabilityService,
    CarpoolService,
    WorkplaceService,
    EVService,
    GeospatialService,
    EnterpriseOpsForensicsService,
    RouteOptimizationService,
    DriverExperienceService,
    AuditService,
    EventsGateway,
  ],
  exports: [
    DispatchEngineService,
    RouteCacheService,
    NodalEngineService,
    GPSAlertService,
    AppealService,
    SOSCascadeService,
    SafetyAdvancedService,
    QRVehicleService,
    GuardComplianceService,
    GSTService,
    BillingModelService,
    WebhookService,
    PlanLimitsService,
    ExpenseStateMachineService,
    ApprovalLimitsService,
    ExpenseAnalyticsService,
    NotificationTemplateService,
    ConsentService,
    DataRetentionService,
    BreakGlassService,
    BackupService,
    BackupObservabilityService,
    CarpoolService,
    WorkplaceService,
    EVService,
    GeospatialService,
    EnterpriseOpsForensicsService,
    RouteOptimizationService,
    DriverExperienceService,
  ],
})
export class AdvancedFeaturesModule {}
