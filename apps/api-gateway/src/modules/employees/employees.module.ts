import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TripSharingService } from './trip-sharing.service';
import { TripSharingController } from './trip-sharing.controller';
import { AuditService } from '../../common/audit.service';

@Module({
  providers: [EmployeeService, TripSharingService, AuditService],
  controllers: [EmployeeController, TripSharingController],
  exports: [EmployeeService, TripSharingService],
})
export class EmployeesModule {}
