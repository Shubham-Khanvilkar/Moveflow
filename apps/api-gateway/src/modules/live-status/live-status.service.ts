import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LiveStatusQueryDto, LiveStatusFilter } from './dto/live-status.dto';

@Injectable()
export class LiveStatusService {
  private readonly BUFFER_MINUTES = 15;

  constructor(private prisma: PrismaService) {}

  async getMetrics(companyId: string, query: LiveStatusQueryDto) {
    const date = query.date ? new Date(query.date) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const scheduleWhere: any = {
      companyId,
      effectiveFrom: { lte: endOfDay },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: startOfDay } },
      ],
    };
    if (query.siteId) scheduleWhere.siteId = query.siteId;

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: scheduleWhere,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const tripWhere: any = {
      companyId,
      date: { gte: startOfDay, lte: endOfDay },
    };

    const trips = await this.prisma.trip.findMany({
      where: tripWhere,
      include: {
        TripPassenger: true,
      },
    });

    const now = new Date();
    let rostered = 0;
    let yetToStart = 0;
    let arrived = 0;
    const delayed = 0;
    let noShow = 0;
    let travelling = 0;
    let onTime = 0;

    for (const schedule of schedules) {
      rostered++;

      const loginTime = this.parseTime(schedule.loginTime, date);
      const bufferMs = (schedule.loginBuffer || this.BUFFER_MINUTES) * 60 * 1000;
      const lateThreshold = new Date(loginTime.getTime() + bufferMs);

      const employeeTrips = trips.filter((t) =>
        t.TripPassenger.some((b) => b.userId === schedule.userId),
      );
      const hasBoarded = employeeTrips.some((t) =>
        t.TripPassenger.some((b) => b.userId === schedule.userId && b.boardingStatus === 'PICKED_UP'),
      );
      const isTravelling = employeeTrips.some(
        (t) => t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED' || t.status === 'DRIVER_ACCEPTED' || t.status === 'EN_ROUTE_TO_PICKUP',
      );

      if (now < loginTime) {
        yetToStart++;
      } else if (isTravelling) {
        travelling++;
      } else if (hasBoarded) {
        const boardTime = employeeTrips
          .flatMap((t) => t.TripPassenger)
          .filter((b) => b.userId === schedule.userId && b.boardingStatus === 'PICKED_UP')
          .sort((a, b) => new Date(b.boardedImageAt || 0).getTime() - new Date(a.boardedImageAt || 0).getTime())[0];

        if (boardTime && boardTime.boardedImageAt && new Date(boardTime.boardedImageAt) <= lateThreshold) {
          onTime++;
        } else {
          arrived++;
        }
      } else if (now > lateThreshold) {
        noShow++;
      } else {
        yetToStart++;
      }
    }

    const noShowPct = rostered > 0 ? ((noShow / rostered) * 100).toFixed(1) : '0.0';

    return {
      rostered,
      yet_to_start: yetToStart,
      arrived,
      delayed,
      no_show: noShow,
      travelling,
      on_time: onTime,
      no_show_pct: parseFloat(noShowPct),
    };
  }

  async getTable(companyId: string, query: LiveStatusQueryDto) {
    const date = query.date ? new Date(query.date) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const scheduleWhere: any = {
      companyId,
      effectiveFrom: { lte: endOfDay },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: startOfDay } },
      ],
    };
    if (query.siteId) scheduleWhere.siteId = query.siteId;

    const schedules = await this.prisma.employeeSchedule.findMany({
      where: scheduleWhere,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        nodalPoint: {
          select: { id: true, nodalName: true },
        },
      },
    });

    const tripWhere: any = {
      companyId,
      date: { gte: startOfDay, lte: endOfDay },
    };

    const trips = await this.prisma.trip.findMany({
      where: tripWhere,
      include: {
        TripPassenger: true,
      },
    });

    const now = new Date();
    const rows = schedules.map((schedule) => {
      const loginTime = this.parseTime(schedule.loginTime, date);
      const bufferMs = (schedule.loginBuffer || this.BUFFER_MINUTES) * 60 * 1000;
      const lateThreshold = new Date(loginTime.getTime() + bufferMs);

      const employeeTrips = trips.filter((t) =>
        t.TripPassenger.some((b) => b.userId === schedule.userId),
      );
      const boardings = employeeTrips.flatMap((t) =>
        t.TripPassenger.filter((b) => b.userId === schedule.userId),
      );
      const hasBoarded = boardings.some((b) => b.boardingStatus === 'PICKED_UP');
      const isTravelling = employeeTrips.some(
        (t) => t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED' || t.status === 'DRIVER_ACCEPTED' || t.status === 'EN_ROUTE_TO_PICKUP',
      );
      const latestTrip = employeeTrips.sort(
        (a, b) => new Date(b.scheduledPickupTime).getTime() - new Date(a.scheduledPickupTime).getTime(),
      )[0];

      let status: string;
      if (now < loginTime) {
        status = 'YET_TO_START';
      } else if (isTravelling) {
        status = 'TRAVELLING';
      } else if (hasBoarded) {
        const boardTime = boardings
          .filter((b) => b.boardingStatus === 'PICKED_UP')
          .sort((a, b) => new Date(b.boardedImageAt || 0).getTime() - new Date(a.boardedImageAt || 0).getTime())[0];
        status = boardTime && boardTime.boardedImageAt && new Date(boardTime.boardedImageAt) <= lateThreshold ? 'ON_TIME' : 'ARRIVED';
      } else if (now > lateThreshold) {
        status = 'NO_SHOW';
      } else {
        status = 'YET_TO_START';
      }

      if (query.status && query.status !== LiveStatusFilter.ALL && status !== query.status) {
        return null;
      }

      return {
        userId: schedule.userId,
        employeeName: schedule.user?.name ?? 'Unknown',
        email: schedule.user?.email ?? '',
        loginTime: schedule.loginTime,
        logoutTime: schedule.logoutTime,
        nodalPoint: schedule.nodalPoint?.nodalName ?? null,
        vehicleRegistration: null,
        tripCode: latestTrip?.tripCode ?? null,
        status,
        boardedAt: boardings.find((b) => b.boardingStatus === 'PICKED_UP')?.boardedImageAt ?? null,
      };
    }).filter(Boolean);

    return rows;
  }

  async exportCsv(companyId: string, query: LiveStatusQueryDto): Promise<string> {
    const rows = await this.getTable(companyId, query);
    const headers = [
      'Employee ID',
      'Name',
      'Email',
      'Login Time',
      'Logout Time',
      'Nodal Point',
      'Vehicle',
      'Trip Code',
      'Status',
      'Boarded At',
    ];

    const csvRows = [
      headers.join(','),
      ...rows.map((row: any) => [
        row.userId,
        `"${row.employeeName}"`,
        row.email,
        row.loginTime,
        row.logoutTime,
        row.nodalPoint ?? '',
        row.vehicleRegistration ?? '',
        row.tripCode ?? '',
        row.status,
        row.boardedAt ? new Date(row.boardedAt).toISOString() : '',
      ].join(',')),
    ];

    return csvRows.join('\n');
  }

  private parseTime(timeStr: string, referenceDate: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(referenceDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}
