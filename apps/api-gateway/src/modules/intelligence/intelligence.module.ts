import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { DigitalTwinService } from './digital-twin.service';
import { CostLeakDetectorService } from './cost-leak-detector.service';
import { VendorTruthService } from './vendor-truth.service';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { CapacityExchangeService } from './capacity-exchange.service';
import { CXOAnalyticsService } from './cxo-analytics.service';
import { CarbonIntelligenceService } from './carbon-intelligence.service';
import { SLAComplianceService } from './sla-compliance.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [IntelligenceController],
  providers: [
    DigitalTwinService,
    CostLeakDetectorService,
    VendorTruthService,
    PredictiveAnalyticsService,
    CapacityExchangeService,
    CXOAnalyticsService,
    CarbonIntelligenceService,
    SLAComplianceService,
    PrismaService,
    AuditService,
  ],
  exports: [
    DigitalTwinService,
    CostLeakDetectorService,
    VendorTruthService,
    PredictiveAnalyticsService,
    CapacityExchangeService,
    CXOAnalyticsService,
    CarbonIntelligenceService,
    SLAComplianceService,
  ],
})
export class IntelligenceModule {}
