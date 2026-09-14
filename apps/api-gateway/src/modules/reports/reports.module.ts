import { Module } from '@nestjs/common';
import { ReportEngine } from './report-engine.service';
import { ScheduledReportExecutor } from './scheduled-report-executor.service';
import { NotificationModule } from '../notifications/notification.module';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule, NotificationModule],
  providers: [ReportEngine, ScheduledReportExecutor],
  exports: [ReportEngine, ScheduledReportExecutor],
})
export class ReportsModule {}
