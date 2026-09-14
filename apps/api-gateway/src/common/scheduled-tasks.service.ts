import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Scheduled tasks service for background maintenance jobs.
 * Run via NestJS @Cron decorator or manual trigger.
 *
 * Phase 0 requirement: temporary access must auto-deactivate when expired.
 */
@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Deactivate expired transport access assignments and access scopes.
   * Should be called every hour via @Cron('0 * * * *').
   */
  async deactivateExpiredAccess(): Promise<{ deactivatedAssignments: number; deactivatedScopes: number }> {
    const now = new Date();

    const [assignResult, scopeResult] = await Promise.all([
      this.prisma.transportAccessAssignment.updateMany({
        where: { isActive: true, expiresAt: { lt: now } },
        data: { isActive: false },
      }),
      this.prisma.accessScope.updateMany({
        where: { isActive: true, expiresAt: { lt: now } },
        data: { isActive: false },
      }),
    ]);

    if (assignResult.count > 0 || scopeResult.count > 0) {
      this.logger.log(
        'Deactivated ' + assignResult.count + ' expired access assignments, ' +
        scopeResult.count + ' expired access scopes'
      );
    }

    return {
      deactivatedAssignments: assignResult.count,
      deactivatedScopes: scopeResult.count,
    };
  }

  /**
   * Deactivate expired approval requests.
   * Should be called every hour.
   */
  async deactivateExpiredApprovals(): Promise<{ deactivated: number }> {
    const result = await this.prisma.approvalRequest.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log('Deactivated ' + result.count + ' expired approval requests');
    }

    return { deactivated: result.count };
  }

  /**
   * Expire permission overrides (GRANTED -> EXPIRED when effectiveUntil has passed).
   * Should be called every 5 minutes.
   */
  async expirePermissionOverrides(): Promise<{ expired: number }> {
    const now = new Date();
    const result = await this.prisma.userAccessOverride.updateMany({
      where: { status: 'GRANTED' as any, effectiveUntil: { lt: now } },
      data: { status: 'EXPIRED' as any, isGranted: false },
    });

    if (result.count > 0) {
      this.logger.log('Expired ' + result.count + ' permission overrides');
    }

    return { expired: result.count };
  }

  /**
   * Run all scheduled tasks (for manual trigger or testing).
   */
  async runAll(): Promise<void> {
    this.logger.log('Running all scheduled tasks...');
    const [access, approvals, permExpiry, waitAll] = await Promise.all([
      this.deactivateExpiredAccess(),
      this.deactivateExpiredApprovals(),
      this.expirePermissionOverrides(),
      this.processWaitAllDepartures(),
    ]);
    this.logger.log(
      'Scheduled tasks complete: ' + access.deactivatedAssignments + ' assignments, ' +
      access.deactivatedScopes + ' scopes, ' + approvals.deactivated + ' approvals, ' +
      permExpiry.expired + ' permission overrides expired, ' +
      waitAll.departed + ' WAIT_ALL departures processed'
    );
  }

  /**
   * Process WAIT_ALL departure mode trips.
   * For trips with departureMode='WAIT_ALL', check if:
   * 1. All passengers have boarded → depart immediately
   * 2. Wait timeout has expired → depart with available passengers, mark rest as NO_SHOW
   * Should be called every 1-2 minutes via cron (every 2 minutes).
   */
  async processWaitAllDepartures(): Promise<{ departed: number; errors: number }> {
    const now = new Date();
    let departed = 0;
    let errors = 0;

    // Find trips in BOARDING status with WAIT_ALL departure mode
    const waitAllTrips = await this.prisma.trip.findMany({
      where: {
        status: 'BOARDING',
        departureMode: 'WAIT_ALL',
        departureTriggered: false,
      },
      include: {
        TripPassenger: true,
        Booking: true,
      },
    });

    for (const trip of waitAllTrips) {
      try {
        const expectedCount = trip.passengerCount;
        const boardedPassengers = trip.TripPassenger.filter(
          (p) => p.boardingStatus === 'PICKED_UP' || p.boardingStatus === 'IN_TRANSIT'
        );
        const boardedCount = boardedPassengers.length;

        // Check if timeout has been reached
        const scheduledDropTime = trip.scheduledDropTime || trip.scheduledPickupTime;
        const waitDeadline = new Date(scheduledDropTime.getTime() + trip.waitTimeoutMinutes * 60 * 1000);
        const isTimeoutReached = now >= waitDeadline;

        // Check if all passengers have boarded
        const allBoarded = boardedCount >= expectedCount;

        if (allBoarded || isTimeoutReached) {
          // Mark remaining non-boarded passengers as NO_SHOW
          if (!allBoarded && isTimeoutReached) {
            const nonBoardedPassengers = trip.TripPassenger.filter(
              (p) => p.boardingStatus === 'SCHEDULED' || p.boardingStatus === 'EN_ROUTE_TO_PICKUP'
            );

            for (const passenger of nonBoardedPassengers) {
              await this.prisma.tripPassenger.update({
                where: { id: passenger.id },
                data: { boardingStatus: 'NO_SHOW' },
              });
            }

            // Update no-show count on trip
            await this.prisma.trip.update({
              where: { id: trip.id },
              data: {
                noShowCount: { increment: nonBoardedPassengers.length },
              },
            });
          }

          // Trigger departure: move trip to IN_TRANSIT
          await this.prisma.trip.update({
            where: { id: trip.id },
            data: {
              status: 'IN_TRANSIT',
              departureTriggered: true,
              boardedCount,
            },
          });

          departed++;
          this.logger.log(
            `WAIT_ALL departure triggered for trip ${trip.tripCode}: ` +
            `${boardedCount}/${expectedCount} boarded, ` +
            `${allBoarded ? 'all boarded' : 'timeout reached'}`
          );
        }
      } catch (err) {
        errors++;
        this.logger.error(`Failed to process WAIT_ALL departure for trip ${trip.tripCode}: ${err.message}`);
      }
    }

    return { departed, errors };
  }
}
