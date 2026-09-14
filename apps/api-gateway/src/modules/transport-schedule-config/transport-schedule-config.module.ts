import { Module } from '@nestjs/common';
import { TransportScheduleConfigService } from './transport-schedule-config.service';
import { TransportScheduleConfigController } from './transport-schedule-config.controller';

@Module({
  controllers: [TransportScheduleConfigController],
  providers: [TransportScheduleConfigService],
  exports: [TransportScheduleConfigService],
})
export class TransportScheduleConfigModule {}
