import { Module } from '@nestjs/common';
import { EmployeeTeamsService } from './employee-teams.service';
import { EmployeeTeamsController } from './employee-teams.controller';

@Module({
  controllers: [EmployeeTeamsController],
  providers: [EmployeeTeamsService],
  exports: [EmployeeTeamsService],
})
export class EmployeeTeamsModule {}
