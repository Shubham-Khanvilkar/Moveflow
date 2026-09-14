import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthCheckService } from '../../common/health-check.service';

@Module({
  controllers: [HealthController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthModule {}
