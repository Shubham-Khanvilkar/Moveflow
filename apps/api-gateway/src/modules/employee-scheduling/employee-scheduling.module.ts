import { Module } from '@nestjs/common';
import { EmployeeSchedulingService } from './employee-scheduling.service';
import { EmployeeSchedulingController } from './employee-scheduling.controller';

@Module({
  controllers: [EmployeeSchedulingController],
  providers: [EmployeeSchedulingService],
  exports: [EmployeeSchedulingService],
})
export class EmployeeSchedulingModule {}
