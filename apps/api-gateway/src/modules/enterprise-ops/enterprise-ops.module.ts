import { Module } from '@nestjs/common';
import { EnterpriseOpsService } from './enterprise-ops.service';
import { EnterpriseOpsController } from './enterprise-ops.controller';
import { CarpoolingService } from './carpooling.service';
import { GeospatialEngineService } from './geospatial-engine.service';
import { WorkplaceManagementService } from './workplace-management.service';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EnterpriseOpsController],
  providers: [EnterpriseOpsService, CarpoolingService, GeospatialEngineService, WorkplaceManagementService, AuditService],
  exports: [EnterpriseOpsService, CarpoolingService, GeospatialEngineService, WorkplaceManagementService],
})
export class EnterpriseOpsModule {}
