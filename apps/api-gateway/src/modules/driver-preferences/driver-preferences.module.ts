import { Module } from '@nestjs/common';
import { DriverPreferencesService } from './driver-preferences.service';
import { DriverPreferencesController } from './driver-preferences.controller';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [DriverPreferencesController],
  providers: [DriverPreferencesService, AuditService],
  exports: [DriverPreferencesService],
})
export class DriverPreferencesModule {}
