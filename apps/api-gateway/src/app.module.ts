import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './common/database.module';
import { CommonServicesModule } from './common/common-services.module';
import { QueueModule } from './common/queue.module';
import { RedisCacheModule } from './common/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { TripsModule } from './modules/trips/trips.module';
import { HealthModule } from './modules/health/health.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { CompanyAdminModule } from './modules/company-admin/company-admin.module';
import { DriverPreferencesModule } from './modules/driver-preferences/driver-preferences.module';
import { EnterpriseOpsModule } from './modules/enterprise-ops/enterprise-ops.module';
import { NoShowEvidenceModule } from './modules/no-show-evidence/no-show-evidence.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { SafetyModule } from './modules/safety/safety.module';
import { Phase4AModule } from './modules/phase4a/phase4a.module';
import { CommunicationModule } from './modules/communications/communication.module';
import { SecurityModule } from './modules/security/security.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StorageModule } from './modules/storage/storage.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { BillingModule } from './modules/billing/billing.module';
import { OrgManagementModule } from './modules/org-management/org-management.module';
import { EmployeeManagementModule } from './modules/employee-management/employee-management.module';
import { AdvancedFeaturesModule } from './modules/dashboard/advanced-features.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { CompanyContactsModule } from './modules/company-contacts/company-contacts.module';
import { ImpersonationModule } from './modules/impersonation/impersonation.module';
import { ReleaseManagementModule } from './modules/release-management/release-management.module';
import { DocumentManagementModule } from './modules/document-management/document-management.module';
import { PassengerOperationsModule } from './modules/passenger-operations/passenger-operations.module';
import { ReportingEngineModule } from './modules/reporting-engine/reporting-engine.module';
import { DualBillingModule } from './modules/dual-billing/dual-billing.module';
import { GPSTrackingModule } from './modules/gps-tracking/gps-tracking.module';
import { VehicleQRModule } from './modules/vehicle-qr/vehicle-qr.module';
import { NotificationCenterModule } from './modules/notification-center/notification-center.module';
import { EmployeeSchedulingModule } from './modules/employee-scheduling/employee-scheduling.module';
import { AdditionalPickupDropModule } from './modules/additional-pickup-drop/additional-pickup-drop.module';
import { EmployeeAddressModule } from './modules/employee-addresses/employee-address.module';
import { EmployeeTeamsModule } from './modules/employee-teams/employee-teams.module';
import { NodalPointsModule } from './modules/nodal-points/nodal-points.module';
import { ScheduleImportExportModule } from './modules/schedule-import-export/schedule-import-export.module';
import { VehicleTypeModule } from './modules/vehicle-type/vehicle-type.module';
import { LiveStatusModule } from './modules/live-status/live-status.module';
import { EmployeeHistoryModule } from './modules/employee-history/employee-history.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { PolicyModule } from './modules/policy/policy.module';
import { TransportScheduleConfigModule } from './modules/transport-schedule-config/transport-schedule-config.module';
import { SchedulerService } from './common/scheduler.service';
import { FeatureFlagService } from './common/feature-flag.service';
import { EventsGateway } from './common/events.gateway';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { PlanLimitsGuard } from './common/guards/plan-limits.guard';
import { FeatureGateInterceptor } from './common/interceptors/feature-gate.interceptor';
import { UsageMeteringInterceptor } from './common/interceptors/usage-metering.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot({
      ttl: 60000,
      limit: 100,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonServicesModule,
    RedisCacheModule,
    QueueModule,
    AuthModule,
    TripsModule,
    HealthModule,
    EmployeesModule,
    CompanyAdminModule,
    DriverPreferencesModule,
    EnterpriseOpsModule,
    NoShowEvidenceModule,
    FleetModule,
    SafetyModule,
    Phase4AModule,
    CommunicationModule,
    SecurityModule,
    FinanceModule,
    DashboardModule,
    StorageModule,
    NotificationModule,
    BillingModule,
    OrgManagementModule,
    EmployeeManagementModule,
    AdvancedFeaturesModule,
    PlatformAdminModule,
    CompanyContactsModule,
    ImpersonationModule,
    ReleaseManagementModule,
    DocumentManagementModule,
    PassengerOperationsModule,
    ReportingEngineModule,
    DualBillingModule,
    GPSTrackingModule,
    VehicleQRModule,
    NotificationCenterModule,
    EmployeeSchedulingModule,
    AdditionalPickupDropModule,
    EmployeeAddressModule,
    EmployeeTeamsModule,
    NodalPointsModule,
    ScheduleImportExportModule,
    VehicleTypeModule,
    LiveStatusModule,
    EmployeeHistoryModule,
    AnalyticsModule,
    IntelligenceModule,
    TrackingModule,
    ReportsModule,
    MetricsModule,
    PolicyModule,
    TransportScheduleConfigModule,
  ],
  providers: [
    SchedulerService,
    FeatureFlagService,
    EventsGateway,
    { provide: 'APP_GUARD', useClass: SubscriptionGuard },
    { provide: 'APP_GUARD', useClass: PlanLimitsGuard },
    { provide: 'APP_INTERCEPTOR', useClass: FeatureGateInterceptor },
    { provide: 'APP_INTERCEPTOR', useClass: UsageMeteringInterceptor },
  ],
  exports: [FeatureFlagService, EventsGateway],
})
export class AppModule {}
