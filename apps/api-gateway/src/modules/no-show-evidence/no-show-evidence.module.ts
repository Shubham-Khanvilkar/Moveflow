import { Module } from '@nestjs/common';
import { NoShowEvidenceService } from './no-show-evidence.service';
import { NoShowEvidenceController } from './no-show-evidence.controller';
import { NoShowWorkflowService } from './no-show-workflow.service';
import { CallingProviderService } from './calling-provider.service';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NoShowEvidenceController],
  providers: [NoShowEvidenceService, NoShowWorkflowService, CallingProviderService, AuditService],
  exports: [NoShowEvidenceService, NoShowWorkflowService, CallingProviderService],
})
export class NoShowEvidenceModule {}
