import { Module } from '@nestjs/common';
import { SafetyOptimizationService } from './safety-optimization.service';
import { SafetyIncidentService } from './safety-incident.service';
import { SafetyController } from './safety.controller';
import { EmergencyEvacuationService } from './emergency-evacuation.service';
import { EmergencyEvacuationController } from './emergency-evacuation.controller';
import { SafetyReachService } from './safety-reach.service';
import { SOSCascadeService } from './sos-cascade.service';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SafetyOptimizationService, SafetyIncidentService, EmergencyEvacuationService, SafetyReachService, SOSCascadeService, AuditService],
  controllers: [SafetyController, EmergencyEvacuationController],
  exports: [SafetyOptimizationService, SafetyIncidentService, EmergencyEvacuationService, SafetyReachService],
})
export class SafetyModule {}
