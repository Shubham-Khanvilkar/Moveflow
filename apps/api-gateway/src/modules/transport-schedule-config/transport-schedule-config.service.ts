import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CreatePickupDropTimingDto,
  UpdatePickupDropTimingDto,
  PickupDropTimingQueryDto,
} from './dto/pickup-drop-timing.dto';
import {
  CreateTransportScheduleSlotDto,
  UpdateTransportScheduleSlotDto,
  GenerateSlotsFromPatternDto,
  BulkCreateSlotsDto,
  SlotQueryDto,
} from './dto/transport-schedule-slot.dto';
import { UpdateTransportScheduleConfigDto } from './dto/transport-schedule-config.dto';

@Injectable()
export class TransportScheduleConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Shift Timings (PickupDropTiming) ────────────────────────

  async createShiftTiming(dto: CreatePickupDropTimingDto, companyId: string, userId: string) {
    const existing = await this.prisma.pickupDropTiming.findUnique({
      where: { companyId_shiftCode: { companyId, shiftCode: dto.shiftCode } },
    });

    if (existing) {
      throw new BadRequestException(`Shift timing with code "${dto.shiftCode}" already exists`);
    }

    this.validateTimeRange(dto.pickupStartTime, dto.pickupEndTime, 'pickup');
    this.validateTimeRange(dto.dropStartTime, dto.dropEndTime, 'drop');

    return this.prisma.pickupDropTiming.create({
      data: {
        companyId,
        shiftName: dto.shiftName,
        shiftCode: dto.shiftCode,
        pickupStartTime: dto.pickupStartTime,
        pickupEndTime: dto.pickupEndTime,
        dropStartTime: dto.dropStartTime,
        dropEndTime: dto.dropEndTime,
        lastBookingCutoffMinutes: dto.lastBookingCutoffMinutes ?? 30,
        earlyBookingWindowHours: dto.earlyBookingWindowHours ?? 24,
        isFlexible: dto.isFlexible ?? false,
        flexWindowMinutes: dto.flexWindowMinutes ?? 30,
        applicableDays: dto.applicableDays ?? 'MON,TUE,WED,THU,FRI',
        transportTypes: dto.transportTypes ?? 'CAB,SHUTTLE,BUS',
        slotIntervalMinutes: dto.slotIntervalMinutes ?? 60,
        earlyPickupEnabled: dto.earlyPickupEnabled ?? false,
        earlyPickupOffsetMinutes: dto.earlyPickupOffsetMinutes ?? 0,
        earlyPickupBufferMinutes: dto.earlyPickupBufferMinutes ?? 30,
        dropDepartureMode: dto.dropDepartureMode ?? 'FIXED',
        dropWaitTimeoutMinutes: dto.dropWaitTimeoutMinutes ?? 15,
        dropDepartureOffsetMinutes: dto.dropDepartureOffsetMinutes ?? 0,
        patternEnabled: dto.patternEnabled ?? false,
      },
    });
  }

  async listShiftTimings(companyId: string, query: PickupDropTimingQueryDto) {
    const where: any = { companyId, isActive: true };

    if (query.transportType) {
      where.transportTypes = { contains: query.transportType };
    }
    if (query.search) {
      where.OR = [
        { shiftName: { contains: query.search, mode: 'insensitive' } },
        { shiftCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.pickupDropTiming.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShiftTiming(id: string, companyId: string) {
    const record = await this.prisma.pickupDropTiming.findFirst({
      where: { id, companyId },
    });

    if (!record) {
      throw new NotFoundException('Shift timing not found');
    }

    return record;
  }

  async updateShiftTiming(id: string, dto: UpdatePickupDropTimingDto, companyId: string) {
    const existing = await this.getShiftTiming(id, companyId);

    if (dto.pickupStartTime || dto.pickupEndTime) {
      this.validateTimeRange(
        dto.pickupStartTime ?? existing.pickupStartTime,
        dto.pickupEndTime ?? existing.pickupEndTime,
        'pickup',
      );
    }

    if (dto.dropStartTime || dto.dropEndTime) {
      this.validateTimeRange(
        dto.dropStartTime ?? existing.dropStartTime,
        dto.dropEndTime ?? existing.dropEndTime,
        'drop',
      );
    }

    return this.prisma.pickupDropTiming.update({
      where: { id },
      data: {
        ...(dto.shiftName !== undefined && { shiftName: dto.shiftName }),
        ...(dto.shiftCode !== undefined && { shiftCode: dto.shiftCode }),
        ...(dto.pickupStartTime !== undefined && { pickupStartTime: dto.pickupStartTime }),
        ...(dto.pickupEndTime !== undefined && { pickupEndTime: dto.pickupEndTime }),
        ...(dto.dropStartTime !== undefined && { dropStartTime: dto.dropStartTime }),
        ...(dto.dropEndTime !== undefined && { dropEndTime: dto.dropEndTime }),
        ...(dto.lastBookingCutoffMinutes !== undefined && { lastBookingCutoffMinutes: dto.lastBookingCutoffMinutes }),
        ...(dto.earlyBookingWindowHours !== undefined && { earlyBookingWindowHours: dto.earlyBookingWindowHours }),
        ...(dto.isFlexible !== undefined && { isFlexible: dto.isFlexible }),
        ...(dto.flexWindowMinutes !== undefined && { flexWindowMinutes: dto.flexWindowMinutes }),
        ...(dto.applicableDays !== undefined && { applicableDays: dto.applicableDays }),
        ...(dto.transportTypes !== undefined && { transportTypes: dto.transportTypes }),
        ...(dto.slotIntervalMinutes !== undefined && { slotIntervalMinutes: dto.slotIntervalMinutes }),
        ...(dto.earlyPickupEnabled !== undefined && { earlyPickupEnabled: dto.earlyPickupEnabled }),
        ...(dto.earlyPickupOffsetMinutes !== undefined && { earlyPickupOffsetMinutes: dto.earlyPickupOffsetMinutes }),
        ...(dto.earlyPickupBufferMinutes !== undefined && { earlyPickupBufferMinutes: dto.earlyPickupBufferMinutes }),
        ...(dto.dropDepartureMode !== undefined && { dropDepartureMode: dto.dropDepartureMode }),
        ...(dto.dropWaitTimeoutMinutes !== undefined && { dropWaitTimeoutMinutes: dto.dropWaitTimeoutMinutes }),
        ...(dto.dropDepartureOffsetMinutes !== undefined && { dropDepartureOffsetMinutes: dto.dropDepartureOffsetMinutes }),
        ...(dto.patternEnabled !== undefined && { patternEnabled: dto.patternEnabled }),
      },
    });
  }

  async deleteShiftTiming(id: string, companyId: string) {
    await this.getShiftTiming(id, companyId);

    return this.prisma.pickupDropTiming.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Schedule Slots ──────────────────────────────────────────

  async createSlot(dto: CreateTransportScheduleSlotDto, companyId: string, userId: string) {
    const [startH, startM] = dto.slotTime.split(':').map(Number);
    const slotDate = new Date(dto.availableFrom);
    slotDate.setHours(startH, startM, 0, 0);

    const endH = startH;
    const endM = startM + (dto.capacity ?? 4);

    return this.prisma.transportScheduleSlot.create({
      data: {
        companyId,
        siteId: dto.siteId,
        processId: dto.processId,
        shiftId: dto.shiftId,
        shiftTimingId: dto.shiftTimingId,
        slotTime: dto.slotTime,
        transportType: dto.transportType,
        vehicleType: dto.vehicleType,
        capacity: dto.capacity ?? 4,
        isAC: dto.isAC ?? true,
        vendorId: dto.vendorId,
        driverPoolId: dto.driverPoolId,
        availableFrom: new Date(dto.availableFrom),
        availableUntil: new Date(dto.availableUntil),
        bookingCutoff: dto.bookingCutoff ?? '15',
        cancellationCutoff: dto.cancellationCutoff ?? '30',
        departureMode: dto.departureMode ?? 'FIXED',
        waitTimeoutMinutes: dto.waitTimeoutMinutes ?? 15,
        earlyPickupOffsetMinutes: dto.earlyPickupOffsetMinutes ?? 0,
        earlyPickupBufferMinutes: dto.earlyPickupBufferMinutes ?? 0,
        sequenceOrder: dto.sequenceOrder ?? 0,
        createdByUserId: userId,
      },
    });
  }

  async generateSlotsFromPattern(dto: GenerateSlotsFromPatternDto, companyId: string, userId: string) {
    const timing = await this.prisma.pickupDropTiming.findFirst({
      where: { id: dto.shiftTimingId, companyId, isActive: true },
    });

    if (!timing) {
      throw new NotFoundException('Shift timing not found');
    }

    if (!timing.patternEnabled) {
      throw new BadRequestException('Pattern generation is not enabled for this shift timing');
    }

    const interval = timing.slotIntervalMinutes;
    if (!interval || interval <= 0) {
      throw new BadRequestException('Invalid slot interval on shift timing');
    }

    const slots = this.generateTimeSlots(
      timing.pickupStartTime,
      timing.pickupEndTime,
      interval,
    );

    const createdSlots: any[] = [];
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();

      if (!dto.daysOfWeek.includes(dayOfWeek)) {
        continue;
      }

      for (let i = 0; i < slots.length; i++) {
        const slotTime = slots[i];

        const [h, m] = slotTime.split(':').map(Number);
        const slotAvailableFrom = new Date(d);
        slotAvailableFrom.setHours(h, m, 0, 0);

        const slotAvailableUntil = new Date(slotAvailableFrom);
        slotAvailableUntil.setMinutes(slotAvailableUntil.getMinutes() + interval);

        const slot = await this.prisma.transportScheduleSlot.create({
          data: {
            companyId,
            siteId: dto.siteId,
            processId: dto.processId,
            shiftTimingId: dto.shiftTimingId,
            slotTime,
            transportType: dto.transportType,
            capacity: dto.capacity ?? 4,
            vendorId: dto.vendorId,
            availableFrom: slotAvailableFrom,
            availableUntil: slotAvailableUntil,
            bookingCutoff: String(timing.lastBookingCutoffMinutes),
            cancellationCutoff: String(timing.lastBookingCutoffMinutes + 15),
            departureMode: timing.dropDepartureMode,
            waitTimeoutMinutes: timing.dropWaitTimeoutMinutes,
            earlyPickupOffsetMinutes: timing.earlyPickupOffsetMinutes,
            earlyPickupBufferMinutes: timing.earlyPickupBufferMinutes,
            sequenceOrder: i,
            generatedFromPattern: true,
            createdByUserId: userId,
          },
        });

        createdSlots.push(slot);
      }
    }

    return {
      generated: createdSlots.length,
      shiftTiming: timing.shiftName,
      interval,
      slots: createdSlots,
    };
  }

  async listSlots(companyId: string, query: SlotQueryDto) {
    const where: any = { companyId, isActive: true };

    if (query.shiftTimingId) where.shiftTimingId = query.shiftTimingId;
    if (query.transportType) where.transportType = query.transportType;
    if (query.siteId) where.siteId = query.siteId;

    if (query.date) {
      const date = new Date(query.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      where.availableFrom = { lt: nextDay };
      where.availableUntil = { gt: date };
    }

    return this.prisma.transportScheduleSlot.findMany({
      where,
      orderBy: [{ availableFrom: 'asc' }, { sequenceOrder: 'asc' }],
    });
  }

  async getSlot(id: string, companyId: string) {
    const slot = await this.prisma.transportScheduleSlot.findFirst({
      where: { id, companyId },
    });

    if (!slot) {
      throw new NotFoundException('Schedule slot not found');
    }

    return slot;
  }

  async updateSlot(id: string, dto: UpdateTransportScheduleSlotDto, companyId: string) {
    await this.getSlot(id, companyId);

    return this.prisma.transportScheduleSlot.update({
      where: { id },
      data: {
        ...(dto.siteId !== undefined && { siteId: dto.siteId }),
        ...(dto.processId !== undefined && { processId: dto.processId }),
        ...(dto.shiftId !== undefined && { shiftId: dto.shiftId }),
        ...(dto.shiftTimingId !== undefined && { shiftTimingId: dto.shiftTimingId }),
        ...(dto.slotTime !== undefined && { slotTime: dto.slotTime }),
        ...(dto.transportType !== undefined && { transportType: dto.transportType }),
        ...(dto.vehicleType !== undefined && { vehicleType: dto.vehicleType }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.isAC !== undefined && { isAC: dto.isAC }),
        ...(dto.vendorId !== undefined && { vendorId: dto.vendorId }),
        ...(dto.driverPoolId !== undefined && { driverPoolId: dto.driverPoolId }),
        ...(dto.availableFrom !== undefined && { availableFrom: new Date(dto.availableFrom) }),
        ...(dto.availableUntil !== undefined && { availableUntil: new Date(dto.availableUntil) }),
        ...(dto.bookingCutoff !== undefined && { bookingCutoff: dto.bookingCutoff }),
        ...(dto.cancellationCutoff !== undefined && { cancellationCutoff: dto.cancellationCutoff }),
        ...(dto.departureMode !== undefined && { departureMode: dto.departureMode }),
        ...(dto.waitTimeoutMinutes !== undefined && { waitTimeoutMinutes: dto.waitTimeoutMinutes }),
        ...(dto.earlyPickupOffsetMinutes !== undefined && { earlyPickupOffsetMinutes: dto.earlyPickupOffsetMinutes }),
        ...(dto.earlyPickupBufferMinutes !== undefined && { earlyPickupBufferMinutes: dto.earlyPickupBufferMinutes }),
        ...(dto.sequenceOrder !== undefined && { sequenceOrder: dto.sequenceOrder }),
      },
    });
  }

  async deleteSlot(id: string, companyId: string) {
    await this.getSlot(id, companyId);

    return this.prisma.transportScheduleSlot.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async bulkCreateSlots(dto: BulkCreateSlotsDto, companyId: string, userId: string) {
    const results: any[] = [];
    for (const slotDto of dto.slots) {
      const slot = await this.createSlot(slotDto, companyId, userId);
      results.push(slot);
    }
    return { created: results.length, slots: results };
  }

  // ─── Transport Schedule Config ───────────────────────────────

  async getConfig(companyId: string) {
    let config = await this.prisma.transportScheduleConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.transportScheduleConfig.create({
        data: { companyId },
      });
    }

    return config;
  }

  async updateConfig(companyId: string, dto: UpdateTransportScheduleConfigDto) {
    const existing = await this.getConfig(companyId);

    return this.prisma.transportScheduleConfig.update({
      where: { companyId },
      data: {
        ...(dto.allowMultipleAdditional !== undefined && { allowMultipleAdditional: dto.allowMultipleAdditional }),
        ...(dto.maxAdditionalMovementsPerDay !== undefined && { maxAdditionalMovementsPerDay: dto.maxAdditionalMovementsPerDay }),
        ...(dto.allowAdHocShifts !== undefined && { allowAdHocShifts: dto.allowAdHocShifts }),
        ...(dto.adHocShiftApprovalRequired !== undefined && { adHocShiftApprovalRequired: dto.adHocShiftApprovalRequired }),
        ...(dto.allowOvernightShifts !== undefined && { allowOvernightShifts: dto.allowOvernightShifts }),
        ...(dto.bookingCutoffMinutes !== undefined && { bookingCutoffMinutes: dto.bookingCutoffMinutes }),
        ...(dto.defaultSlotIntervalMinutes !== undefined && { defaultSlotIntervalMinutes: dto.defaultSlotIntervalMinutes }),
        ...(dto.defaultEarlyPickupOffsetMinutes !== undefined && { defaultEarlyPickupOffsetMinutes: dto.defaultEarlyPickupOffsetMinutes }),
        ...(dto.defaultEarlyPickupBufferMinutes !== undefined && { defaultEarlyPickupBufferMinutes: dto.defaultEarlyPickupBufferMinutes }),
        ...(dto.defaultDropDepartureMode !== undefined && { defaultDropDepartureMode: dto.defaultDropDepartureMode }),
        ...(dto.defaultDropWaitTimeoutMinutes !== undefined && { defaultDropWaitTimeoutMinutes: dto.defaultDropWaitTimeoutMinutes }),
      },
    });
  }

  // ─── Time Slots ───────────────────────────────────────────────

  async getTimeSlots(companyId: string): Promise<string[]> {
    const config = await this.prisma.transportScheduleConfig.findUnique({
      where: { companyId },
    });

    const interval = config?.defaultSlotIntervalMinutes ?? 30;
    return this.generateTimeSlots('00:00', '23:59', interval);
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight shifts (e.g., 22:00 to 06:00)
    const isOvernight = endMinutes <= currentMinutes;
    const effectiveEnd = isOvernight ? endMinutes + 24 * 60 : endMinutes;

    while (currentMinutes < effectiveEnd) {
      const h = Math.floor((currentMinutes % (24 * 60)) / 60);
      const m = currentMinutes % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      currentMinutes += intervalMinutes;
    }

    return slots;
  }

  private validateTimeRange(start: string, end: string, label: string) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes === endMinutes) {
      throw new BadRequestException(`${label} start and end time cannot be the same`);
    }
  }
}
