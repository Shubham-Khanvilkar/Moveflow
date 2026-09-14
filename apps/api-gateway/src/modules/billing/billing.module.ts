import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database.module';
import { BillingService } from './billing.service';
import { BillingEngineService } from './billing-engine.service';
import { UnifiedBillingService } from './unified-billing.service';
import { SaaSBillingService } from './saas-billing.service';
import { PricingRulesService } from './pricing-rules.service';
import { SubscriptionService } from './subscription.service';
import { WebhookService, PlanLimitsService, WhiteLabelService } from './webhook-plan.service';
import { BillingController } from './billing.controller';
import { PricingRulesController, TaxRulesController, FxRatesController } from './pricing-rules.controller';
import { AuditService } from '../../common/audit.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    BillingService, BillingEngineService, UnifiedBillingService, SaaSBillingService,
    PricingRulesService, SubscriptionService, WebhookService, PlanLimitsService,
    WhiteLabelService, AuditService,
  ],
  controllers: [BillingController, PricingRulesController, TaxRulesController, FxRatesController],
  exports: [
    BillingService, BillingEngineService, UnifiedBillingService, SaaSBillingService,
    PricingRulesService, SubscriptionService, WebhookService, PlanLimitsService, WhiteLabelService,
  ],
})
export class BillingModule {}
