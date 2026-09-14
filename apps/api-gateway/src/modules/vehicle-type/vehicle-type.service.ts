import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, VehicleTypeQueryDto } from './dto/vehicle-type.dto';

@Injectable()
export class VehicleTypeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleTypeDto, companyId: string) {
    const existing = await this.prisma.vehicleTypeRecord.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Vehicle type with name "${dto.name}" already exists`);
    }

    return this.prisma.vehicleTypeRecord.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        usageType: dto.usageType,
        totalCapacity: dto.totalCapacity,
        fuelType: dto.fuelType,
        status: dto.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, dto: UpdateVehicleTypeDto, companyId: string) {
    const vehicleType = await this.prisma.vehicleTypeRecord.findFirst({ where: { id, companyId } });
    if (!vehicleType) throw new NotFoundException('Vehicle type not found');

    if (dto.name) {
      const dup = await this.prisma.vehicleTypeRecord.findFirst({
        where: { companyId, name: dto.name, id: { not: id } },
      });
      if (dup) throw new ConflictException(`Vehicle type with name "${dto.name}" already exists`);
    }

    return this.prisma.vehicleTypeRecord.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, companyId: string) {
    const vehicleType = await this.prisma.vehicleTypeRecord.findFirst({ where: { id, companyId } });
    if (!vehicleType) throw new NotFoundException('Vehicle type not found');

    return this.prisma.vehicleTypeRecord.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async getAll(companyId: string, query?: VehicleTypeQueryDto & PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query ?? ({} as any);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters.usageType) where.usageType = filters.usageType;
    if (filters.status) where.status = filters.status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicleTypeRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.vehicleTypeRecord.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, companyId: string) {
    const vehicleType = await this.prisma.vehicleTypeRecord.findFirst({
      where: { id, companyId },
    });
    if (!vehicleType) throw new NotFoundException('Vehicle type not found');
    return vehicleType;
  }
}
