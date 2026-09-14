import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ReportEngine } from './report-engine.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';

@Injectable()
export class ScheduledReportExecutor {
  private readonly logger = new Logger(ScheduledReportExecutor.name);

  constructor(
    private prisma: PrismaService,
    private reportEngine: ReportEngine,
    private notificationChannels: NotificationChannelsService
  ) {}

  async checkAndExecuteDueReports() {
    const now = new Date();
    const dueReports = await (this.prisma as any).scheduledReport.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { nextRunAt: { lte: now } },
          { nextRunAt: null },
        ],
      },
    });

    for (const report of dueReports) {
      try {
        await this.executeReport(report);
        await this.updateNextRun(report);
      } catch (error: any) {
        this.logger.error(`Scheduled report ${report.id} failed: ${error.message}`);
      }
    }
  }

  private async executeReport(report: any) {
    const params: Record<string, any> = {
      from: report.parameters?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: report.parameters?.to || new Date(),
    };

    const data = await this.reportEngine.generateReport(report.reportId, report.companyId, params);
    const reportDef = this.reportEngine.listReports().find(r => r.id === report.reportId);

    const summary = `Report: ${reportDef?.name || report.reportId}\nGenerated: ${new Date().toISOString()}\nRecords: ${data.length}`;

    await (this.prisma as any).reportExecution.create({
      data: {
        companyId: report.companyId,
        reportId: report.reportId,
        parameters: params,
        resultCount: data.length,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    if (report.notifyEmail) {
      await this.notificationChannels.send({
        companyId: report.companyId,
        channel: 'EMAIL',
        eventType: 'report.completed',
        title: `Report Ready: ${reportDef?.name || report.reportId}`,
        body: summary,
        recipientEmail: report.notifyEmail,
      });
    }
  }

  private async updateNextRun(report: any) {
    const next = this.calculateNextRun(report.cronExpression || '0 9 * * 1');
    await (this.prisma as any).scheduledReport.update({
      where: { id: report.id },
      data: { nextRunAt: next, lastRunAt: new Date() },
    });
  }

  private calculateNextRun(cron: string): Date {
    const now = new Date();
    if (cron.includes('daily') || cron === '0 9 * * *') {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      return next;
    }
    if (cron.includes('weekly') || cron === '0 9 * * 1') {
      const next = new Date(now);
      next.setDate(next.getDate() + (7 - next.getDay() + 1));
      next.setHours(9, 0, 0, 0);
      return next;
    }
    if (cron.includes('monthly') || cron === '0 9 1 * *') {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(9, 0, 0, 0);
      return next;
    }
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }
}
