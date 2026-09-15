import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private consecutiveDbErrors = 0;
  private lastErrorTime = 0;
  private static readonly MAX_CONSECUTIVE_ERRORS = 3;
  private static readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown after repeated failures

  constructor(private prisma: PrismaService) {}

  private canRun(): boolean {
    if (!this.prisma.isConnected()) return false;
    // If too many consecutive DB errors, enter cooldown to avoid connection pool starvation
    if (this.consecutiveDbErrors >= SchedulerService.MAX_CONSECUTIVE_ERRORS) {
      const elapsed = Date.now() - this.lastErrorTime;
      if (elapsed < SchedulerService.COOLDOWN_MS) {
        this.logger.warn(`Scheduler in cooldown (${Math.ceil((SchedulerService.COOLDOWN_MS - elapsed) / 60000)}m remaining) - skipping to protect DB connection pool`);
        return false;
      }
      // Reset after cooldown
      this.consecutiveDbErrors = 0;
    }
    return true;
  }

  private recordError(err: any) {
    this.consecutiveDbErrors++;
    this.lastErrorTime = Date.now();
    if (this.consecutiveDbErrors >= SchedulerService.MAX_CONSECUTIVE_ERRORS) {
      this.logger.error(`Scheduler entering ${SchedulerService.COOLDOWN_MS / 60000}min cooldown after ${this.consecutiveDbErrors} consecutive DB errors`);
    }
  }

  private recordSuccess() {
    this.consecutiveDbErrors = 0;
  }

  @Cron('0 2 * * *')
  async handleComplianceCheck() {
    if (!this.canRun()) return;
    this.logger.log('Running daily compliance check...');
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringDrivers = await this.prisma.driverComplianceStatus.findMany({
        where: {
          OR: [
            { licenseExpiryDate: { lte: thirtyDaysFromNow } },
            { pucExpiryDate: { lte: thirtyDaysFromNow } },
            { insuranceExpiryDate: { lte: thirtyDaysFromNow } },
            { permitExpiryDate: { lte: thirtyDaysFromNow } },
            { fitnessExpiryDate: { lte: thirtyDaysFromNow } },
          ],
        },
      });

      for (const driver of expiringDrivers) {
        const alerts: string[] = [];
        if (driver.licenseExpiryDate && driver.licenseExpiryDate <= thirtyDaysFromNow) alerts.push('LICENSE');
        if (driver.pucExpiryDate && driver.pucExpiryDate <= thirtyDaysFromNow) alerts.push('PUC');
        if (driver.insuranceExpiryDate && driver.insuranceExpiryDate <= thirtyDaysFromNow) alerts.push('INSURANCE');
        if (driver.permitExpiryDate && driver.permitExpiryDate <= thirtyDaysFromNow) alerts.push('PERMIT');
        if (driver.fitnessExpiryDate && driver.fitnessExpiryDate <= thirtyDaysFromNow) alerts.push('FITNESS');

        for (const docType of alerts) {
          await this.prisma.complianceAlert.create({
            data: {
              companyId: driver.companyId,
              entityType: 'DRIVER',
              entityId: driver.driverId,
              alertType: 'DOCUMENT_EXPIRING',
              documentType: docType as any,
              severity: 'WARNING',
              title: `${docType} expiring soon`,
              message: `Driver document ${docType} is expiring within 30 days`,
              expiryDate: (driver as any)[`${docType.toLowerCase()}ExpiryDate`],
            },
          });
        }
      }
      this.recordSuccess();
      this.logger.log(`Compliance check completed. Found ${expiringDrivers.length} drivers with expiring documents.`);
    } catch (err: any) {
      this.recordError(err);
      this.logger.error(`Compliance check failed: ${err.message}`);
    }
  }

  @Cron('0 */6 * * *') // Changed from every hour to every 6 hours to reduce DB load
  async handleDemandSnapshot() {
    if (!this.canRun()) return;
    this.logger.log('Capturing demand pressure snapshot...');
    try {
      const pendingBookings = await this.prisma.booking.groupBy({
        by: ['pickupLatitude', 'pickupLongitude'],
        where: { status: { in: ['REQUESTED', 'PENDING_APPROVAL'] } },
        _count: { id: true },
      });

      for (const zone of pendingBookings) {
        await this.prisma.demandPressureSnapshot.create({
          data: {
            companyId: 'system',
            zoneName: `${zone.pickupLatitude},${zone.pickupLongitude}`,
            zoneLatitude: zone.pickupLatitude,
            zoneLongitude: zone.pickupLongitude,
            pendingBookings: zone._count.id,
            demandRatio: zone._count.id / 10,
          },
        });
      }
      this.recordSuccess();
      this.logger.log(`Demand snapshot captured for ${pendingBookings.length} zones.`);
    } catch (err: any) {
      this.recordError(err);
      this.logger.error(`Demand snapshot failed: ${err.message}`);
    }
  }

  @Interval(300000)
  async handlePendingReminders() {
    if (!this.canRun()) return;
    try {
      const now = new Date();
      const pendingReminders = await this.prisma.pickupReminder.findMany({
        where: { status: 'PENDING', scheduledAt: { lte: now } },
        take: 50,
      });

      for (const reminder of pendingReminders) {
        await this.prisma.pickupReminder.update({
          where: { id: reminder.id },
          data: { status: 'SENT', sentAt: now },
        });
      }

      if (pendingReminders.length > 0) {
        this.recordSuccess();
        this.logger.log(`Processed ${pendingReminders.length} pending reminders.`);
      }
    } catch (err: any) {
      this.recordError(err);
      this.logger.error(`Reminder processing failed: ${err.message}`);
    }
  }

  @Cron('0 * * * *')
  async handleExpiredAccess() {
    if (!this.canRun()) return;
    this.logger.log('Checking for expired access scopes and assignments...');
    try {
      const now = new Date();

      // Deactivate expired AccessScope records
      const expiredScopes = await this.prisma.accessScope.updateMany({
        where: {
          isActive: true,
          expiresAt: { lte: now },
        },
        data: { isActive: false },
      });

      // Deactivate expired TransportAccessAssignment records
      const expiredAssignments = await (this.prisma as any).transportAccessAssignment.updateMany({
        where: {
          isActive: true,
          expiresAt: { lte: now },
        },
        data: { isActive: false },
      });

      // Deactivate expired ApprovalRequests
      const expiredApprovals = await (this.prisma as any).approvalRequest.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: { lte: now },
        },
        data: { status: 'EXPIRED' },
      });

      const total = expiredScopes.count + expiredAssignments.count + expiredApprovals.count;
      if (total > 0) {
        this.recordSuccess();
        this.logger.log(
          `Expired access cleanup: ${expiredScopes.count} scopes, ` +
          `${expiredAssignments.count} assignments, ${expiredApprovals.count} approvals deactivated`,
        );
      }
    } catch (err: any) {
      this.recordError(err);
      this.logger.error(`Expired access cleanup failed: ${err.message}`);
    }
  }

  @Cron('0 0 * * *')
  async handleTrialExpiry() {
    if (!this.canRun()) return;
    this.logger.log('Checking for expired trials...');
    try {
      const now = new Date();
      const expiredTrials = await (this.prisma as any).subscription.findMany({
        where: { status: 'TRIAL', trialEndsAt: { lt: now } },
      });

      for (const sub of expiredTrials) {
        await (this.prisma as any).subscription.update({
          where: { id: sub.id },
          data: { status: 'SUSPENDED', suspensionReason: 'Trial expired' },
        });

        // Notify company admin
        try {
          const admin = await this.prisma.user.findFirst({
            where: {
              companyId: sub.companyId,
              memberships: { some: { role: 'COMPANY_ADMIN', status: 'ACTIVE' } },
            },
          });
          if (admin) {
            await (this.prisma as any).notification.create({
              data: {
                userId: admin.id,
                companyId: sub.companyId,
                type: 'TRIAL_EXPIRED',
                title: 'Trial Expired',
                message: 'Your 14-day trial has expired. Your account has been suspended. Please contact support to subscribe.',
                priority: 'HIGH',
                isRead: false,
              },
            }).catch(() => {});
          }
        } catch (e: any) { /* notification may not exist */ }

        this.logger.log(`Trial expired for company ${sub.companyId}, subscription ${sub.id}`);
      }

      if (expiredTrials.length > 0) {
        this.recordSuccess();
        this.logger.log(`Suspended ${expiredTrials.length} expired trials`);
      }
    } catch (err: any) {
      this.recordError(err);
      this.logger.error(`Trial expiry check failed: ${err.message}`);
    }
  }
}
