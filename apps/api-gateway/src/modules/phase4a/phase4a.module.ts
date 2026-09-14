import { Module } from '@nestjs/common';
import { BulkImportService } from './bulk-import.service';
import { TransportExpenseService } from './transport-expense.service';
import { Phase4AController } from './phase4a.controller';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [Phase4AController],
  providers: [BulkImportService, TransportExpenseService, AuditService],
  exports: [BulkImportService, TransportExpenseService],
})
export class Phase4AModule {}
