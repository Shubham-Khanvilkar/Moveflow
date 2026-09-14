import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller';
import { VendorManagementService } from './vendor-management.service';
import { VendorManagementController } from './vendor-management.controller';
import { DriverManagementService } from './driver-management.service';
import { DriverManagementController } from './driver-management.controller';
import { VehicleManagementService } from './vehicle-management.service';
import { VehicleManagementController } from './vehicle-management.controller';
import { RouteManagementService } from './route-management.service';
import { RouteManagementController } from './route-management.controller';
import { EmployeeImportService } from './employee-import.service';
import { EmployeeImportController } from './employee-import.controller';
import { NoShowPolicyService } from './no-show-policy.service';
import { NoShowPolicyController } from './no-show-policy.controller';
import { BanManagementService } from './ban-management.service';
import { BanManagementController } from './ban-management.controller';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalWorkflowController } from './approval-workflow.controller';
import { EmergencyBuzzerService } from './emergency-buzzer.service';
import { EmergencyBuzzerController } from './emergency-buzzer.controller';
import { CompanyComplianceService } from './company-compliance.service';
import { CompanyComplianceController } from './company-compliance.controller';
import { SuperComplianceService } from './super-compliance.service';
import { SuperComplianceController } from './super-compliance.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEngineService } from './analytics-engine.service';
import { EnterpriseDashboardService } from './enterprise-dashboard.service';
import { EnterpriseDashboardController } from './enterprise-dashboard.controller';
import { DashboardRegistryService } from './dashboard-registry.service';
import { KPIAggregationService } from './kpi-aggregation.service';
import { PortalController } from './portal.controller';
import { DashboardKpiController } from './dashboard-kpi.controller';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    AccessControlService,
    VendorManagementService,
    DriverManagementService,
    VehicleManagementService,
    RouteManagementService,
    EmployeeImportService,
    NoShowPolicyService,
    BanManagementService,
    ApprovalWorkflowService,
    EmergencyBuzzerService,
    CompanyComplianceService,
    SuperComplianceService,
    AnalyticsService,
    AnalyticsEngineService,
    EnterpriseDashboardService,
    DashboardRegistryService,
    KPIAggregationService,
    AuditService,
  ],
  controllers: [
    AccessControlController,
    VendorManagementController,
    DriverManagementController,
    VehicleManagementController,
    RouteManagementController,
    EmployeeImportController,
    NoShowPolicyController,
    BanManagementController,
    ApprovalWorkflowController,
    EmergencyBuzzerController,
    CompanyComplianceController,
    SuperComplianceController,
    AnalyticsController,
    EnterpriseDashboardController,
    PortalController,
    DashboardKpiController,
  ],
  exports: [
    AccessControlService,
    VendorManagementService,
    DriverManagementService,
    VehicleManagementService,
    RouteManagementService,
    EmployeeImportService,
    NoShowPolicyService,
    BanManagementService,
    ApprovalWorkflowService,
    EmergencyBuzzerService,
    CompanyComplianceService,
    SuperComplianceService,
    AnalyticsService,
    AnalyticsEngineService,
    DashboardRegistryService,
    KPIAggregationService,
  ],
})
export class DashboardModule {}
