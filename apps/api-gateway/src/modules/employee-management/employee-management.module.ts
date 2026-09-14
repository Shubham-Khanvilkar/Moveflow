import { Module } from '@nestjs/common';
import { EmployeeManagementService } from './employee-management.service';
import { EmployeeManagementController } from './employee-management.controller';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EmployeeManagementController],
  providers: [EmployeeManagementService, AuditService],
  exports: [EmployeeManagementService],
})
export class EmployeeManagementModule {}
