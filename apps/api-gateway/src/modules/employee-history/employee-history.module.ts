import { Module } from '@nestjs/common';
import { EmployeeHistoryService } from './employee-history.service';
import { EmployeeHistoryController } from './employee-history.controller';

@Module({
  controllers: [EmployeeHistoryController],
  providers: [EmployeeHistoryService],
  exports: [EmployeeHistoryService],
})
export class EmployeeHistoryModule {}
