import { Module } from '@nestjs/common';
import { BudgetAllocationService } from './budget-allocation.service';
import { BudgetAllocationController } from './budget-allocation.controller';
import { SLAPenaltyService } from './sla-penalty.service';
import { SLAPenaltyController } from './sla-penalty.controller';
import { InvoiceReconciliationService } from './invoice-reconciliation.service';
import { InvoiceReconciliationController } from './invoice-reconciliation.controller';
import { BillingForensicsService } from './billing-forensics.service';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [BudgetAllocationService, SLAPenaltyService, InvoiceReconciliationService, BillingForensicsService, AuditService],
  controllers: [BudgetAllocationController, SLAPenaltyController, InvoiceReconciliationController],
  exports: [BudgetAllocationService, SLAPenaltyService, InvoiceReconciliationService, BillingForensicsService],
})
export class FinanceModule {}
