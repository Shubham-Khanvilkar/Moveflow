import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class TransportScheduleService {
  private readonly logger = new Logger(TransportScheduleService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ============================================================
  // 41.18 TRANSPORT SCHEDULE BUILDER
  // ============================================================
  async createScheduleSlot(companyId: string, data: {
    siteId?: string; processId?: string; shiftId?: string;
    slotTime: string; transportType: string; vehicleType?: string;
    capacity: number; isAC?: boolean; vendorId?: string;
    availableFrom: string; availableUntil: string;
    bookingCutoff: string; cancellationCutoff: string;
  }, createdByUserId: string) {
    return (this.prisma as any).transportScheduleSlot.create({
      data: {
        companyId,
        siteId: data.siteId,
        processId: data.processId,
        shiftId: data.shiftId,
        slotTime: data.slotTime,
        transportType: data.transportType,
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        isAC: data.isAC ?? true,
        vendorId: data.vendorId,
        availableFrom: new Date(data.availableFrom),
        availableUntil: new Date(data.availableUntil),
        bookingCutoff: data.bookingCutoff,
        cancellationCutoff: data.cancellationCutoff,
        isActive: true,
        createdByUserId,
      },
    });
  }

  async listScheduleSlots(companyId: string, filters?: {
    siteId?: string; processId?: string; shiftId?: string; transportType?: string;
  }) {
    const where: any = { companyId, isActive: true };
    if (filters?.siteId) where.siteId = filters.siteId;
    if (filters?.processId) where.processId = filters.processId;
    if (filters?.shiftId) where.shiftId = filters.shiftId;
    if (filters?.transportType) where.transportType = filters.transportType;

    return (this.prisma as any).transportScheduleSlot.findMany({
      where,
      orderBy: { slotTime: 'asc' },
    });
  }

  async deleteScheduleSlot(companyId: string, slotId: string) {
    return (this.prisma as any).transportScheduleSlot.update({
      where: { id: slotId },
      data: { isActive: false },
    });
  }

  // Generate time slots from granularity
  generateTimeSlots(granularity: string, startTime: string, endTime: string): string[] {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const intervals: Record<string, number> = {
      FIFTEEN_MIN: 15, TWENTY_MIN: 20, THIRTY_MIN: 30,
      FORTY_FIVE_MIN: 45, SIXTY_MIN: 60,
    };
    const step = intervals[granularity] || 30;

    let totalMin = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    while (totalMin <= endTotal) {
      const h = Math.floor(totalMin / 60) % 24;
      const m = totalMin % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      totalMin += step;
    }
    return slots;
  }

  // ============================================================
  // 41.19 CAB AVAILABILITY
  // ============================================================
  async createCabAvailability(companyId: string, data: {
    siteId: string; processId?: string; shiftId?: string;
    date: string; timeSlot: string; transportType: string;
    vehicleType?: string; capacity: number; isAC?: boolean;
    vendorId?: string; maxBookings?: number;
  }) {
    return (this.prisma as any).cabAvailability.create({
      data: {
        companyId,
        siteId: data.siteId,
        processId: data.processId,
        shiftId: data.shiftId,
        date: new Date(data.date),
        timeSlot: data.timeSlot,
        transportType: data.transportType,
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        isAC: data.isAC ?? true,
        vendorId: data.vendorId,
        maxBookings: data.maxBookings || data.capacity,
        status: 'AVAILABLE',
        totalBookings: 0,
      },
    });
  }

  async listCabAvailability(companyId: string, siteId: string, date: string) {
    return (this.prisma as any).cabAvailability.findMany({
      where: { companyId, siteId, date: new Date(date) },
      orderBy: { timeSlot: 'asc' },
    });
  }

  async bookCabSlot(companyId: string, cabId: string) {
    const cab = await (this.prisma as any).cabAvailability.findFirst({ where: { id: cabId, companyId } });
    if (!cab) throw new NotFoundException('Cab slot not found');
    if (cab.status === 'FULL') throw new BadRequestException('Cab slot is full');
    if (cab.totalBookings >= (cab.maxBookings || cab.capacity)) {
      throw new BadRequestException('Cab slot is at maximum bookings');
    }

    const newCount = cab.totalBookings + 1;
    return (this.prisma as any).cabAvailability.update({
      where: { id: cabId },
      data: {
        totalBookings: newCount,
        status: newCount >= cab.capacity ? 'FULL' : 'BOOKED',
      },
    });
  }

  // ============================================================
  // 41.20 SHUTTLE AVAILABILITY
  // ============================================================
  async createShuttleAvailability(companyId: string, data: {
    routeId: string; departureTime: string; returnTime?: string;
    frequency?: number; stops: any[]; capacity: number;
    vehicleId?: string; driverId?: string;
    boardingWindow?: number; bookingRequired?: boolean;
  }) {
    return (this.prisma as any).shuttleAvailability.create({
      data: {
        companyId,
        routeId: data.routeId,
        departureTime: data.departureTime,
        returnTime: data.returnTime,
        frequency: data.frequency,
        stops: data.stops,
        capacity: data.capacity,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        boardingWindow: data.boardingWindow || 5,
        bookingRequired: data.bookingRequired ?? true,
        seatReservation: false,
        isActive: true,
      },
    });
  }

  // ============================================================
  // 43. CLUBBING CONFIG
  // ============================================================
  async setClubbingConfig(companyId: string, data: {
    siteId?: string; processId?: string;
    policy: string; allowedCombinations?: any[];
    billingSeparation?: boolean; safetyOverride?: boolean;
  }) {
    return (this.prisma as any).clubbingConfig.upsert({
      where: { companyId_siteId_processId: {
        companyId,
        siteId: data.siteId || null,
        processId: data.processId || null,
      }},
      update: {
        policy: data.policy,
        allowedCombinations: data.allowedCombinations,
        billingSeparation: data.billingSeparation ?? true,
        safetyOverride: data.safetyOverride ?? false,
      },
      create: {
        companyId,
        siteId: data.siteId,
        processId: data.processId,
        policy: data.policy,
        allowedCombinations: data.allowedCombinations,
        billingSeparation: data.billingSeparation ?? true,
        safetyOverride: data.safetyOverride ?? false,
        isActive: true,
      },
    });
  }

  async getClubbingConfig(companyId: string, siteId?: string, processId?: string) {
    // Resolve most-specific config
    if (processId && siteId) {
      const specific = await (this.prisma as any).clubbingConfig.findUnique({
        where: { companyId_siteId_processId: { companyId, siteId, processId } },
      });
      if (specific) return specific;
    }
    if (siteId) {
      const siteConfig = await (this.prisma as any).clubbingConfig.findFirst({
        where: { companyId, siteId, processId: null, isActive: true },
      });
      if (siteConfig) return siteConfig;
    }
    // Company default
    return (this.prisma as any).clubbingConfig.findFirst({
      where: { companyId, siteId: null, processId: null, isActive: true },
    });
  }
}
