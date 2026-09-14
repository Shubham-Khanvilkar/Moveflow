import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  WeeklyGridQueryDto,
  SwapScheduleDto,
  BulkCreateScheduleDto,
  ScheduleHistoryQueryDto,
} from './dto/employee-scheduling.dto';

@Injectable()
export class EmployeeSchedulingService {
  constructor(private prisma: PrismaService) {}

  async createSchedule(
    dto: CreateScheduleDto,
    companyId: string,
    userId: string,
  ) {
    const employee = await this.prisma.user.findFirst({
      where: { id: dto.userId, companyId },
      select: { id: true, transportEligibility: true, status: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.transportEligibility !== 'ELIGIBLE') {
      throw new BadRequestException(
        `Employee is not transport eligible (current status: ${employee.transportEligibility})`,
      );
    }

    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException('Employee is not active');
    }

    const loginTimeStr = dto.loginTime;
    const logoutTimeStr = dto.logoutTime;
    const [loginH, loginM] = loginTimeStr.split(':').map(Number);
    const [logoutH, logoutM] = logoutTimeStr.split(':').map(Number);
    const loginMinutes = loginH * 60 + loginM;
    const logoutMinutes = logoutH * 60 + logoutM;

    let shiftType = 'REGULAR';
    const shiftOperatingDate = dto.effectiveFrom;

    if (logoutMinutes < loginMinutes) {
      shiftType = 'OVERNIGHT';
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    if (effectiveTo && effectiveFrom > effectiveTo) {
      throw new BadRequestException('effectiveFrom must be before effectiveTo');
    }

    const overlapping = await this.prisma.employeeSchedule.findFirst({
      where: {
        userId: dto.userId,
        companyId,
        status: 'ACTIVE',
        effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31') },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveFrom } },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Employee already has an active schedule for overlapping dates',
      );
    }

    const weeklyOffs = (dto.weeklyOffs as string[]) ?? [];
    const weeklyOffRecords = await this.prisma.employeeWeeklyOff.findMany({
      where: {
        userId: dto.userId,
        companyId,
        isActive: true,
        effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31') },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveFrom } },
        ],
      },
    });

    for (const wo of weeklyOffRecords) {
      if (weeklyOffs.length > 0) {
        const dayNames = [
          'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
        ];
        if (weeklyOffs.includes(dayNames[wo.dayOfWeek])) {
          throw new BadRequestException(
            `Weekly off conflict: employee has a ${wo.offType} on ${dayNames[wo.dayOfWeek]}`,
          );
        }
      }
    }

    const bufferPolicy = await this.getBufferPolicy(companyId, dto.siteId, undefined, undefined);
    const loginArrivalBuffer = dto.loginArrivalBuffer ?? bufferPolicy.loginArrivalBuffer;
    const logoutDepartureBuffer = dto.logoutDepartureBuffer ?? bufferPolicy.logoutDepartureBuffer;

    const schedule = await this.prisma.employeeSchedule.create({
      data: {
        userId: dto.userId,
        siteId: dto.siteId,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        loginTime: dto.loginTime,
        logoutTime: dto.logoutTime,
        loginBuffer: dto.loginBuffer ?? 15,
        logoutBuffer: dto.logoutBuffer ?? 15,
        loginArrivalBuffer,
        logoutDepartureBuffer,
        isRecurring: dto.isRecurring ?? true,
        recurringDays: dto.recurringDays ?? [],
        weeklyOffs: (dto.weeklyOffs as any) ?? [],
        nodalPointId: dto.nodalPointId,
        billingZone: dto.billingZone,
        routeId: dto.routeId,
        shiftTimingId: (dto as any).shiftTimingId,
        companyId,
        createdBy: userId,
        slotType: shiftType === 'OVERNIGHT' ? 'LOGOUT' : 'LOGIN',
      } as any,
    });

    await this.prisma.employeeScheduleHistory.create({
      data: {
        scheduleId: schedule.id,
        companyId,
        userId: dto.userId,
        changeType: 'CREATE',
        changedById: userId,
        oldValues: null,
        newValues: JSON.stringify(schedule),
        reason: null,
      },
    });

    await this.prisma.employeeHistory.create({
      data: {
        companyId,
        userId: dto.userId,
        action: 'SCHEDULE_CREATE',
        actorId: userId,
        oldValue: null,
        newValue: JSON.stringify(schedule),
        reason: null,
      },
    });

    return schedule;
  }

  async createAdHocShift(
    dto: {
      userId: string;
      siteId?: string;
      loginTime: string;
      logoutTime: string;
      adHocReason: string;
      effectiveFrom: string;
      effectiveTo?: string;
      loginArrivalBuffer?: number;
      logoutDepartureBuffer?: number;
      loginBuffer?: number;
      logoutBuffer?: number;
      nodalPointId?: string;
      billingZone?: string;
      routeId?: string;
    },
    companyId: string,
    userId: string,
  ) {
    const employee = await this.prisma.user.findFirst({
      where: { id: dto.userId, companyId },
      select: { id: true, transportEligibility: true, status: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.transportEligibility !== 'ELIGIBLE') {
      throw new BadRequestException(
        `Employee is not transport eligible (current status: ${employee.transportEligibility})`,
      );
    }

    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException('Employee is not active');
    }

    const bufferPolicy = await this.getBufferPolicy(companyId, dto.siteId, undefined, undefined);
    const loginArrivalBuffer = dto.loginArrivalBuffer ?? bufferPolicy.loginArrivalBuffer;
    const logoutDepartureBuffer = dto.logoutDepartureBuffer ?? bufferPolicy.logoutDepartureBuffer;

    const schedule = await this.prisma.employeeSchedule.create({
      data: {
        userId: dto.userId,
        siteId: dto.siteId,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        loginTime: dto.loginTime,
        logoutTime: dto.logoutTime,
        loginBuffer: dto.loginBuffer ?? 15,
        logoutBuffer: dto.logoutBuffer ?? 15,
        loginArrivalBuffer,
        logoutDepartureBuffer,
        isRecurring: false,
        recurringDays: [],
        weeklyOffs: [],
        nodalPointId: dto.nodalPointId,
        billingZone: dto.billingZone,
        routeId: dto.routeId,
        shiftTimingId: (dto as any).shiftTimingId,
        companyId,
        createdBy: userId,
        slotType: 'LOGIN',
        status: 'ACTIVE',
      } as any,
    });

    await this.prisma.employeeScheduleHistory.create({
      data: {
        scheduleId: schedule.id,
        companyId,
        userId: dto.userId,
        changeType: 'AD_HOC_CREATE',
        changedById: userId,
        oldValues: null,
        newValues: JSON.stringify(schedule),
        reason: dto.adHocReason,
      },
    });

    await this.prisma.employeeHistory.create({
      data: {
        companyId,
        userId: dto.userId,
        action: 'AD_HOC_SHIFT_CREATE',
        actorId: userId,
        oldValue: null,
        newValue: JSON.stringify({ ...schedule, adHocReason: dto.adHocReason, adHocStatus: 'PENDING' }),
        reason: dto.adHocReason,
      },
    });

    return { ...schedule, adHocReason: dto.adHocReason, adHocStatus: 'PENDING' };
  }

  async setWeeklyOff(
    userId: string,
    dayOfWeek: number,
    offType: string,
    effectiveFrom: string,
    effectiveTo: string | undefined,
    companyId: string,
    changedById: string,
  ) {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new BadRequestException('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
    }

    const existing = await this.prisma.employeeWeeklyOff.findUnique({
      where: {
        companyId_userId_dayOfWeek: {
          companyId,
          userId,
          dayOfWeek,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.employeeWeeklyOff.update({
        where: { id: existing.id },
        data: {
          offType: offType as any,
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          isActive: true,
        },
      });

      await this.prisma.employeeHistory.create({
        data: {
          companyId,
          userId,
          action: 'WEEKLY_OFF_UPDATE',
          actorId: changedById,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(updated),
          reason: null,
        },
      });

      return updated;
    }

    const created = await this.prisma.employeeWeeklyOff.create({
      data: {
        companyId,
        userId,
        dayOfWeek,
        offType: offType as any,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive: true,
        createdBy: changedById,
      },
    });

    await this.prisma.employeeHistory.create({
      data: {
        companyId,
        userId,
        action: 'WEEKLY_OFF_CREATE',
        actorId: changedById,
        oldValue: null,
        newValue: JSON.stringify(created),
        reason: null,
      },
    });

    return created;
  }

  async removeWeeklyOff(
    userId: string,
    dayOfWeek: number,
    companyId: string,
    changedById: string,
  ) {
    const existing = await this.prisma.employeeWeeklyOff.findUnique({
      where: {
        companyId_userId_dayOfWeek: {
          companyId,
          userId,
          dayOfWeek,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Weekly off not found for this day');
    }

    const updated = await this.prisma.employeeWeeklyOff.update({
      where: { id: existing.id },
      data: { isActive: false },
    });

    await this.prisma.employeeHistory.create({
      data: {
        companyId,
        userId,
        action: 'WEEKLY_OFF_REMOVE',
        actorId: changedById,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        reason: null,
      },
    });

    return updated;
  }

  async getWeeklyOffs(userId: string, companyId: string) {
    return this.prisma.employeeWeeklyOff.findMany({
      where: {
        userId,
        companyId,
        isActive: true,
      },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async checkScheduleImpact(scheduleId: string, companyId: string) {
    const schedule = await this.prisma.employeeSchedule.findFirst({
      where: { id: scheduleId, companyId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const affectedTrips = await this.prisma.trip.findMany({
      where: {
        companyId,
        date: { gte: today },
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
      select: {
        id: true,
        date: true,
        status: true,
        routeId: true,
        vehicleId: true,
      },
    });

    const routeIds = [...new Set(affectedTrips.map((t) => t.routeId).filter(Boolean))];
    const vehicleIds = [...new Set(affectedTrips.map((t) => t.vehicleId).filter(Boolean))];

    const warning =
      affectedTrips.length > 0
        ? `WARNING: Modifying this schedule may affect ${affectedTrips.length} active trip(s), ${routeIds.length} route(s), and ${vehicleIds.length} vehicle(s).`
        : 'No active trips will be affected.';

    return {
      affectedTrips: affectedTrips.length,
      affectedRoutes: routeIds.length,
      affectedVehicles: vehicleIds.length,
      tripIds: affectedTrips.map((t) => t.id),
      routeIds,
      vehicleIds,
      warning,
    };
  }

  async getWeeklyGrid(query: WeeklyGridQueryDto & PaginationDto, companyId: string) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', ...rest } = query;
    const skip = (page - 1) * limit;

    const weekStart = new Date(rest.weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const where: any = {
      companyId,
      effectiveFrom: { lte: weekEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: weekStart } }],
    };

    if (rest.siteId) where.siteId = rest.siteId;

    const [data, total] = await Promise.all([
      this.prisma.employeeSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: { select: { id: true, name: true, email: true } },
          site: { select: { id: true, name: true } },
        } as any,
      }),
      this.prisma.employeeSchedule.count({ where }),
    ]);

    const grid: Record<string, typeof data> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dayKey = date.toISOString().split('T')[0];
      grid[dayKey] = [];
    }

    for (const schedule of data) {
      const recurringDays = (schedule.recurringDays as number[]) ?? [];
      const weeklyOffs = (schedule.weeklyOffs as string[]) ?? [];
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];

      const loginTimeStr = schedule.loginTime;
      const logoutTimeStr = schedule.logoutTime;
      const [loginH, loginM] = loginTimeStr.split(':').map(Number);
      const [logoutH, logoutM] = logoutTimeStr.split(':').map(Number);
      const isOvernight = logoutH * 60 + logoutM < loginH * 60 + loginM;

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dayKey = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();

        if (weeklyOffs.includes(dayNames[dayOfWeek])) continue;

        if (!schedule.isRecurring || recurringDays.includes(dayOfWeek)) {
          if (!grid[dayKey]) grid[dayKey] = [];

          if (isOvernight) {
            const scheduleDate = new Date(schedule.effectiveFrom);
            scheduleDate.setHours(0, 0, 0, 0);
            const targetDate = new Date(dayKey);
            targetDate.setHours(0, 0, 0, 0);

            const diffDays = Math.floor(
              (targetDate.getTime() - scheduleDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            const isOperatingDay =
              scheduleDate.getDay() === dayOfWeek ||
              (diffDays >= 0 && diffDays % 7 === 0);

            if (isOperatingDay) {
              grid[dayKey].push(schedule);
            }
          } else {
            grid[dayKey].push(schedule);
          }
        }
      }
    }

    return {
      data: grid,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
    companyId: string,
    userId: string,
  ) {
    const existing = await this.prisma.employeeSchedule.findFirst({
      where: { id, companyId },
    });

    if (!existing) throw new Error('Schedule not found');

    if (dto.userId) {
      const employee = await this.prisma.user.findFirst({
        where: { id: dto.userId, companyId },
        select: { id: true, transportEligibility: true, status: true },
      });

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      if (employee.transportEligibility !== 'ELIGIBLE') {
        throw new BadRequestException(
          `Employee is not transport eligible (current status: ${employee.transportEligibility})`,
        );
      }
    }

    const targetUserId = dto.userId ?? existing.userId;
    const targetEffectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : existing.effectiveFrom;
    const targetEffectiveTo = dto.effectiveTo
      ? new Date(dto.effectiveTo)
      : existing.effectiveTo;

    const overlapping = await this.prisma.employeeSchedule.findFirst({
      where: {
        id: { not: id },
        userId: targetUserId,
        companyId,
        status: 'ACTIVE',
        effectiveFrom: { lte: targetEffectiveTo ?? new Date('9999-12-31') },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: targetEffectiveFrom } },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Employee already has an active schedule for overlapping dates',
      );
    }

    const loginTime = dto.loginTime ?? existing.loginTime;
    const logoutTime = dto.logoutTime ?? existing.logoutTime;
    const [loginH, loginM] = loginTime.split(':').map(Number);
    const [logoutH, logoutM] = logoutTime.split(':').map(Number);

    let shiftType = 'REGULAR';
    if (logoutH * 60 + logoutM < loginH * 60 + loginM) {
      shiftType = 'OVERNIGHT';
    }

    const updateData: any = {};
    if (dto.userId !== undefined) updateData.userId = dto.userId;
    if (dto.siteId !== undefined) updateData.siteId = dto.siteId;
    if (dto.effectiveFrom !== undefined)
      updateData.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined)
      updateData.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (dto.loginTime !== undefined) updateData.loginTime = dto.loginTime;
    if (dto.logoutTime !== undefined) updateData.logoutTime = dto.logoutTime;
    if (dto.loginBuffer !== undefined) updateData.loginBuffer = dto.loginBuffer;
    if (dto.logoutBuffer !== undefined)
      updateData.logoutBuffer = dto.logoutBuffer;
    if (dto.loginArrivalBuffer !== undefined)
      updateData.loginArrivalBuffer = dto.loginArrivalBuffer;
    if (dto.logoutDepartureBuffer !== undefined)
      updateData.logoutDepartureBuffer = dto.logoutDepartureBuffer;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.recurringDays !== undefined)
      updateData.recurringDays = dto.recurringDays;
    if (dto.weeklyOffs !== undefined) updateData.weeklyOffs = dto.weeklyOffs;
    if (dto.nodalPointId !== undefined)
      updateData.nodalPointId = dto.nodalPointId;
    if (dto.billingZone !== undefined) updateData.billingZone = dto.billingZone;
    if (dto.routeId !== undefined) updateData.routeId = dto.routeId;
    if (dto.shiftTimingId !== undefined) updateData.shiftTimingId = dto.shiftTimingId;
    if (shiftType === 'OVERNIGHT') {
      updateData.slotType = 'LOGOUT';
    } else {
      updateData.slotType = 'LOGIN';
    }

    const updated = await this.prisma.employeeSchedule.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.employeeScheduleHistory.create({
      data: {
        scheduleId: id,
        companyId,
        userId: updated.userId,
        changeType: 'UPDATE',
        changedById: userId,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(updated),
        reason: null,
      } as any,
    });

    await this.prisma.employeeHistory.create({
      data: {
        companyId,
        userId: updated.userId,
        action: 'SCHEDULE_UPDATE',
        actorId: userId,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        reason: null,
      },
    });

    return updated;
  }

  async cancelSchedule(
    id: string,
    companyId: string,
    userId: string,
    reason?: string,
  ) {
    const existing = await this.prisma.employeeSchedule.findFirst({
      where: { id, companyId },
    });

    if (!existing) throw new Error('Schedule not found');

    const updated = await this.prisma.employeeSchedule.update({
      where: { id },
      data: { effectiveTo: new Date() },
    });

    await this.prisma.employeeScheduleHistory.create({
      data: {
        scheduleId: id,
        companyId,
        userId: existing.userId,
        changeType: 'CANCEL',
        changedById: userId,
        oldValues: JSON.stringify(existing),
        newValues: JSON.stringify(updated),
        reason: reason ?? null,
      } as any,
    });

    await this.prisma.employeeHistory.create({
      data: {
        companyId,
        userId: existing.userId,
        action: 'SCHEDULE_CANCEL',
        actorId: userId,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        reason: reason ?? null,
      },
    });

    return updated;
  }

  async swapSchedules(
    dto: SwapScheduleDto,
    companyId: string,
    userId: string,
  ) {
    const schedule1 = await this.prisma.employeeSchedule.findFirst({
      where: { id: dto.scheduleId1, companyId },
    });
    const schedule2 = await this.prisma.employeeSchedule.findFirst({
      where: { id: dto.scheduleId2, companyId },
    });

    if (!schedule1 || !schedule2) throw new Error('One or both schedules not found');

    const swapped1 = await this.prisma.employeeSchedule.update({
      where: { id: dto.scheduleId1 },
      data: {
        userId: schedule2.userId,
        loginTime: schedule2.loginTime,
        logoutTime: schedule2.logoutTime,
        loginBuffer: schedule2.loginBuffer,
        logoutBuffer: schedule2.logoutBuffer,
        loginArrivalBuffer: schedule2.loginArrivalBuffer,
        logoutDepartureBuffer: schedule2.logoutDepartureBuffer,
      },
    });

    const swapped2 = await this.prisma.employeeSchedule.update({
      where: { id: dto.scheduleId2 },
      data: {
        userId: schedule1.userId,
        loginTime: schedule1.loginTime,
        logoutTime: schedule1.logoutTime,
        loginBuffer: schedule1.loginBuffer,
        logoutBuffer: schedule1.logoutBuffer,
        loginArrivalBuffer: schedule1.loginArrivalBuffer,
        logoutDepartureBuffer: schedule1.logoutDepartureBuffer,
      },
    });

    await this.prisma.employeeScheduleHistory.create({
      data: {
        scheduleId: dto.scheduleId1,
        companyId,
        userId: swapped1.userId,
        changeType: 'SWAP',
        changedById: userId,
        oldValues: JSON.stringify(schedule1),
        newValues: JSON.stringify(swapped1),
        reason: dto.reason ?? null,
      } as any,
    });

    await this.prisma.employeeScheduleHistory.create({
      data: {
        scheduleId: dto.scheduleId2,
        companyId,
        userId: swapped2.userId,
        changeType: 'SWAP',
        changedById: userId,
        oldValues: JSON.stringify(schedule2),
        newValues: JSON.stringify(swapped2),
        reason: dto.reason ?? null,
      } as any,
    });

    return { schedule1: swapped1, schedule2: swapped2 };
  }

  async bulkCreate(
    dto: BulkCreateScheduleDto,
    companyId: string,
    userId: string,
  ) {
    const results = [];
    for (const scheduleDto of dto.schedules) {
      const result = await this.createSchedule(scheduleDto, companyId, userId);
      results.push(result);
    }
    return results;
  }

  async getHistory(query: ScheduleHistoryQueryDto & PaginationDto, companyId: string): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', ...rest } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (rest.userId) where.userId = rest.userId;
    if (rest.changeType) where.changeType = rest.changeType;
    if (rest.startDate || rest.endDate) {
      where.createdAt = {};
      if (rest.startDate) where.createdAt.gte = new Date(rest.startDate);
      if (rest.endDate) where.createdAt.lte = new Date(rest.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.employeeScheduleHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.employeeScheduleHistory.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, companyId: string) {
    return this.prisma.employeeSchedule.findFirst({
      where: { id, companyId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true } },
      } as any,
    });
  }

  async getByUser(userId: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'effectiveFrom', sortOrder = 'desc' } = query ?? {};
    const skip = (page - 1) * limit;

    const where: any = { userId, companyId };

    const [data, total] = await Promise.all([
      this.prisma.employeeSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          site: { select: { id: true, name: true } },
        } as any,
      }),
      this.prisma.employeeSchedule.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async getBufferPolicy(
    companyId: string,
    siteId?: string,
    processId?: string,
    shiftId?: string,
  ): Promise<{ loginArrivalBuffer: number; logoutDepartureBuffer: number }> {
    const defaultPolicy = { loginArrivalBuffer: 15, logoutDepartureBuffer: 30 };

    const now = new Date();

    const findPolicy = async (where: any) => {
      return this.prisma.shiftBufferPolicy.findFirst({
        where: {
          ...where,
          effectiveFrom: { lte: now },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: now } },
          ],
        },
        orderBy: [
          { level: 'asc' },
        ],
      });
    };

    if (shiftId) {
      const policy = await findPolicy({ companyId, shiftId });
      if (policy) {
        return {
          loginArrivalBuffer: policy.loginArrivalBuffer,
          logoutDepartureBuffer: policy.logoutDepartureBuffer,
        };
      }
    }

    if (processId) {
      const policy = await findPolicy({ companyId, processId });
      if (policy) {
        return {
          loginArrivalBuffer: policy.loginArrivalBuffer,
          logoutDepartureBuffer: policy.logoutDepartureBuffer,
        };
      }
    }

    if (siteId) {
      const policy = await findPolicy({ companyId, siteId });
      if (policy) {
        return {
          loginArrivalBuffer: policy.loginArrivalBuffer,
          logoutDepartureBuffer: policy.logoutDepartureBuffer,
        };
      }
    }

    const companyPolicy = await findPolicy({ companyId });
    if (companyPolicy) {
      return {
        loginArrivalBuffer: companyPolicy.loginArrivalBuffer,
        logoutDepartureBuffer: companyPolicy.logoutDepartureBuffer,
      };
    }

    return defaultPolicy;
  }
}
