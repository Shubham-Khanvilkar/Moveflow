import { Module, Global } from '@nestjs/common';
import { PermissionComposerService } from './services/permission-composer.service';
import { ApprovalWorkflowService } from './services/approval-workflow.service';
import { AuditService } from './audit.service';
import { AuditLoggingService } from './audit-logging';
import { PrismaService } from './prisma.service';
import { HealthCheckService } from './health-check.service';
import { AlertingService } from './alerting.service';
import { StructuredLogger } from './structured-logger';
import { TemplateEngine } from './template-engine';
import { PIIMaskingService } from './pii-masking';
import { RateLimiterService } from './rate-limiter';
import { TwilioSmsProvider } from './sms-provider';
import { GoogleMapsProvider } from './maps/google-maps.provider';
import { GeofenceEngine } from './maps/geofence-engine';
import { RouteDeviationDetector } from './maps/route-deviation';

@Global()
@Module({
  providers: [
    PermissionComposerService,
    ApprovalWorkflowService,
    AuditService,
    AuditLoggingService,
    PrismaService,
    HealthCheckService,
    AlertingService,
    StructuredLogger,
    TemplateEngine,
    PIIMaskingService,
    RateLimiterService,
    TwilioSmsProvider,
    GoogleMapsProvider,
    GeofenceEngine,
    RouteDeviationDetector,
  ],
  exports: [
    PermissionComposerService,
    ApprovalWorkflowService,
    AuditService,
    AuditLoggingService,
    PrismaService,
    HealthCheckService,
    AlertingService,
    StructuredLogger,
    TemplateEngine,
    PIIMaskingService,
    RateLimiterService,
    TwilioSmsProvider,
    GoogleMapsProvider,
    GeofenceEngine,
    RouteDeviationDetector,
  ],
})
export class CommonServicesModule {}
