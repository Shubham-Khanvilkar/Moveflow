import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateNodalPointDto, UpdateNodalPointDto, NodalPointQueryDto } from './dto/nodal-point.dto';

@Injectable()
export class NodalPointsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNodalPointDto, companyId: string) {
    const existing = await this.prisma.nodalPoint.findFirst({
      where: { companyId, nodalCode: dto.nodalCode },
    });
    if (existing) {
      throw new ConflictException(`Nodal point with code "${dto.nodalCode}" already exists`);
    }

    return this.prisma.nodalPoint.create({
      data: {
        companyId,
        nodalCode: dto.nodalCode,
        nodalName: dto.nodalName,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        city: dto.city,
        landmark: dto.landmark,
        radius: dto.radius ?? 500,
        billingZone: dto.billingZone,
        shuttleStopId: dto.shuttleStopId,
        siteId: dto.siteId,
        capacity: dto.capacity ?? 50,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        facilities: dto.facilities,
        zoneName: dto.zoneName,
        zoneId: dto.zoneId,
      },
    });
  }

  async update(id: string, dto: UpdateNodalPointDto, companyId: string) {
    const point = await this.prisma.nodalPoint.findFirst({ where: { id, companyId } });
    if (!point) throw new NotFoundException('Nodal point not found');

    if (dto.nodalCode) {
      const dup = await this.prisma.nodalPoint.findFirst({
        where: { companyId, nodalCode: dto.nodalCode, id: { not: id } },
      });
      if (dup) throw new ConflictException(`Nodal point with code "${dto.nodalCode}" already exists`);
    }

    return this.prisma.nodalPoint.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, companyId: string) {
    const point = await this.prisma.nodalPoint.findFirst({ where: { id, companyId } });
    if (!point) throw new NotFoundException('Nodal point not found');

    return this.prisma.nodalPoint.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getAll(companyId: string, query?: NodalPointQueryDto & PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query ?? ({} as any);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.billingZone) where.billingZone = filters.billingZone;

    const [data, total] = await Promise.all([
      this.prisma.nodalPoint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          site: { select: { id: true, name: true } },
        } as any,
      }),
      this.prisma.nodalPoint.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, companyId: string) {
    const point = await this.prisma.nodalPoint.findFirst({
      where: { id, companyId },
      include: {
        site: { select: { id: true, name: true } },
      } as any,
    });
    if (!point) throw new NotFoundException('Nodal point not found');
    return point;
  }

  async getBySite(siteId: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'nodalName', sortOrder = 'asc' } = query ?? {};
    const skip = (page - 1) * limit;

    const where: any = { companyId, siteId, isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.nodalPoint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.nodalPoint.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getNearby(latitude: number, longitude: number, radiusMeters?: number, companyId?: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'asc' } = query ?? {};
    const skip = (page - 1) * limit;

    const radius = radiusMeters ?? 5000;
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos((latitude * Math.PI) / 180));

    const where: any = {
      isActive: true,
      latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
      longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
    };
    if (companyId) where.companyId = companyId;

    const [data, total] = await Promise.all([
      this.prisma.nodalPoint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { site: { select: { id: true, name: true } } } as any,
      }),
      this.prisma.nodalPoint.count({ where }),
    ]);

    const paged = data
      .map((p) => ({
        ...p,
        distanceMeters: this._haversine(latitude, longitude, p.latitude, p.longitude),
      }))
      .filter((p) => p.distanceMeters <= radius)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      data: paged,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateOccupancy(id: string, delta: number, companyId: string) {
    const point = await this.prisma.nodalPoint.findFirst({ where: { id, companyId } });
    if (!point) throw new NotFoundException('Nodal point not found');

    const newOccupancy = point.currentOccupancy + delta;
    if (newOccupancy < 0) {
      throw new BadRequestException('Occupancy cannot go below zero');
    }

    return this.prisma.nodalPoint.update({
      where: { id },
      data: { currentOccupancy: newOccupancy },
    });
  }

  async getByBillingZone(billingZone: string, companyId: string) {
    return this.prisma.nodalPoint.findMany({
      where: { companyId, billingZone, isActive: true },
      orderBy: { nodalName: 'asc' },
    });
  }

  private _haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
