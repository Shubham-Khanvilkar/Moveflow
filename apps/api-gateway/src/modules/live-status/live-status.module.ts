import { Module } from '@nestjs/common';
import { LiveStatusService } from './live-status.service';
import { LiveStatusController } from './live-status.controller';

@Module({
  controllers: [LiveStatusController],
  providers: [LiveStatusService],
  exports: [LiveStatusService],
})
export class LiveStatusModule {}
