import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreatePickupDropDto, UpdatePickupDropDto, PickupDropQueryDto } from './dto/additional-pickup-drop.dto';

@Injectable()
export class AdditionalPickupDropService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePickupDropDto, companyId: string, userId: string) {
    const pickupDrop = await this.prisma.additionalPickupDrop.create({
      data: {
        userId: dto.userId,
        companyId,
        date: new Date(dto.date),
        pickupDropType: dto.pickupDropType,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        time: dto.time,
        nodalPointId: dto.nodalPointId,
        billingZone: dto.billingZone,
        remarks: dto.remarks,
        sequenceOrder: dto.sequenceOrder,
        status: 'ACTIVE',
        createdBy: userId,
      },
    });

    await this.prisma.additionalPickupDropHistory.create({
      data: {
        pickupDropId: pickupDrop.id,
        action: 'CREATED',
        changedBy: userId,
        snapshot: JSON.parse(JSON.stringify(pickupDrop)),
      } as any,
    });

    return pickupDrop;
  }

  async update(id: string, dto: UpdatePickupDropDto, companyId: string, userId: string) {
    const existing = await this.getById(id, companyId);

    const updated = await this.prisma.additionalPickupDrop.update({
      where: { id },
      data: {
        ...(dto.userId && { userId: dto.userId }),
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.pickupDropType && { pickupDropType: dto.pickupDropType }),
        ...(dto.addressLine1 && { addressLine1: dto.addressLine1 }),
        ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.time && { time: dto.time }),
        ...(dto.nodalPointId !== undefined && { nodalPointId: dto.nodalPointId }),
        ...(dto.billingZone !== undefined && { billingZone: dto.billingZone }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
        ...(dto.sequenceOrder !== undefined && { sequenceOrder: dto.sequenceOrder }),
        updatedBy: userId,
      } as any,
    });

    await this.prisma.additionalPickupDropHistory.create({
      data: {
        pickupDropId: id,
        action: 'UPDATED',
        changedBy: userId,
        snapshot: JSON.parse(JSON.stringify(updated)),
      } as any,
    });

    return updated;
  }

  async cancel(id: string, companyId: string, userId: string, reason?: string) {
    const existing = await this.getById(id, companyId);

    const cancelled = await this.prisma.additionalPickupDrop.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedBy: userId,
      } as any,
    });

    await this.prisma.additionalPickupDropHistory.create({
      data: {
        pickupDropId: id,
        action: 'CANCELLED',
        changedBy: userId,
        reason,
        snapshot: JSON.parse(JSON.stringify(cancelled)),
      } as any,
    });

    return cancelled;
  }

  async getByUserAndDate(userId: string, date: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'sequenceOrder', sortOrder = 'asc' } = query ?? {};
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      companyId,
      date: new Date(date),
      status: { not: 'CANCELLED' },
    };

    const [data, total] = await Promise.all([
      this.prisma.additionalPickupDrop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.additionalPickupDrop.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getByDateRange(startDate: string, endDate: string, companyId: string, query?: PickupDropQueryDto & PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'date', sortOrder = 'asc', ...filters } = query ?? ({} as any);
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.pickupDropType && { pickupDropType: filters.pickupDropType }),
      status: { not: 'CANCELLED' },
    };

    const [data, total] = await Promise.all([
      this.prisma.additionalPickupDrop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.additionalPickupDrop.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, companyId: string) {
    const pickupDrop = await this.prisma.additionalPickupDrop.findFirst({
      where: { id, companyId },
    });

    if (!pickupDrop) {
      throw new NotFoundException(`Pickup/Drop with ID ${id} not found`);
    }

    return pickupDrop;
  }

  async getHistory(pickupDropId: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query ?? {};
    const skip = (page - 1) * limit;

    await this.getById(pickupDropId, companyId);

    const where: any = { pickupDropId };

    const [data, total] = await Promise.all([
      this.prisma.additionalPickupDropHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.additionalPickupDropHistory.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async reorder(id: string, sequenceOrder: number, companyId: string) {
    const existing = await this.getById(id, companyId);

    const reordered = await this.prisma.additionalPickupDrop.update({
      where: { id },
      data: { sequenceOrder },
    });

    await this.prisma.additionalPickupDropHistory.create({
      data: {
        pickupDropId: id,
        action: 'REORDERED',
        changedBy: existing.createdBy,
        snapshot: JSON.parse(JSON.stringify(reordered)),
      } as any,
    });

    return reordered;
  }
}
