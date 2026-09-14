import { Module } from '@nestjs/common';
import { ScheduleImportExportService } from './schedule-import-export.service';
import { ScheduleImportExportController } from './schedule-import-export.controller';

@Module({
  controllers: [ScheduleImportExportController],
  providers: [ScheduleImportExportService],
  exports: [ScheduleImportExportService],
})
export class ScheduleImportExportModule {}
