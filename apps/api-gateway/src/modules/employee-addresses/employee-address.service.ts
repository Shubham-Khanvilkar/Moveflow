import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateAddressDto, UpdateAddressDto, AddressQueryDto } from './dto/employee-address.dto';

@Injectable()
export class EmployeeAddressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAddressDto, companyId: string, userId: string) {
    if (dto.isDefault) {
      await this.prisma.employeeAddress.updateMany({
        where: { userId: dto.userId, companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.employeeAddress.create({
      data: {
        userId: dto.userId,
        companyId,
        label: dto.label,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country ?? 'IN',
        latitude: dto.latitude,
        longitude: dto.longitude,
        landmark: dto.landmark,
        addressType: dto.addressType ?? 'RESIDENTIAL',
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        isDefault: dto.isDefault ?? false,
        status: 'PENDING',
        createdBy: userId,
      } as any,
    });
  }

  async update(id: string, dto: UpdateAddressDto, companyId: string, userId: string) {
    await this.getById(id, companyId);

    return this.prisma.employeeAddress.update({
      where: { id },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.addressLine1 && { addressLine1: dto.addressLine1 }),
        ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
        ...(dto.city && { city: dto.city }),
        ...(dto.state && { state: dto.state }),
        ...(dto.pincode && { pincode: dto.pincode }),
        ...(dto.country && { country: dto.country }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.landmark !== undefined && { landmark: dto.landmark }),
        ...(dto.addressType && { addressType: dto.addressType }),
        ...(dto.effectiveFrom && { effectiveFrom: new Date(dto.effectiveFrom) }),
        ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        updatedBy: userId,
      } as any,
    });
  }

  async activate(id: string, companyId: string, userId: string) {
    await this.getById(id, companyId);

    return this.prisma.employeeAddress.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        effectiveFrom: new Date(),
        updatedBy: userId,
      } as any,
    });
  }

  async deactivate(id: string, companyId: string, userId: string) {
    await this.getById(id, companyId);

    return this.prisma.employeeAddress.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        effectiveTo: new Date(),
        updatedBy: userId,
      } as any,
    });
  }

  async setDefault(id: string, companyId: string, userId: string) {
    const address = await this.getById(id, companyId);

    await this.prisma.employeeAddress.updateMany({
      where: { userId: address.userId, companyId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.employeeAddress.update({
      where: { id },
      data: {
        isDefault: true,
        updatedBy: userId,
      } as any,
    });
  }

  async getByUser(userId: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query ?? {};
    const skip = (page - 1) * limit;

    const where: any = { userId, companyId };

    const [data, total] = await Promise.all([
      this.prisma.employeeAddress.findMany({
        where,
        skip,
        take: limit,
        orderBy: { isDefault: 'desc', [sortBy]: sortOrder },
      }),
      this.prisma.employeeAddress.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getActiveByUser(userId: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query ?? {};
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      companyId,
      status: 'ACTIVE',
    };

    const [data, total] = await Promise.all([
      this.prisma.employeeAddress.findMany({
        where,
        skip,
        take: limit,
        orderBy: { isDefault: 'desc', [sortBy]: sortOrder },
      }),
      this.prisma.employeeAddress.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAll(companyId: string, query?: PaginationDto & { search?: string; status?: string; addressType?: string }): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status, addressType, sortBy = 'createdAt', sortOrder = 'desc' } = query ?? {};
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (status) where.status = status;
    if (addressType) where.addressType = addressType;

    const [data, total] = await Promise.all([
      this.prisma.employeeAddress.findMany({
        where,
        skip,
        take: limit,
        orderBy: { isDefault: 'desc', [sortBy]: sortOrder },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.employeeAddress.count({ where }),
    ]);

    const mapped = data.map((addr: any) => ({
      ...addr,
      userName: addr.user?.name ?? 'Unknown',
    }));

    if (search) {
      const q = search.toLowerCase();
      const filtered = mapped.filter((a: any) => a.userName?.toLowerCase().includes(q) || a.label?.toLowerCase().includes(q));
      return { data: filtered, meta: { total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) } };
    }

    return { data: mapped, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, companyId: string) {
    const address = await this.prisma.employeeAddress.findFirst({
      where: { id, companyId },
    });

    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return address;
  }

  async verify(id: string, companyId: string, verifiedById: string) {
    await this.getById(id, companyId);

    return this.prisma.employeeAddress.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedById,
        verifiedAt: new Date(),
      } as any,
    });
  }

  async reject(id: string, companyId: string, reason: string) {
    await this.getById(id, companyId);

    return this.prisma.employeeAddress.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      } as any,
    });
  }

  async getExpiringAddresses(companyId: string, days: number = 30, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'effectiveTo', sortOrder = 'asc' } = query ?? {};
    const skip = (page - 1) * limit;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const where: any = {
      companyId,
      status: 'ACTIVE',
      effectiveTo: {
        not: null,
        lte: expiryDate,
        gte: new Date(),
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.employeeAddress.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.employeeAddress.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async validateAddressForScheduling(addressId: string, companyId: string) {
    const address = await this.getById(addressId, companyId);

    if (address.status !== 'ACTIVE') {
      throw new BadRequestException(
        'This address is currently inactive/expired. The address must be activated and made effective before it can be used for scheduling.',
      );
    }

    const now = new Date();
    if (address.effectiveFrom > now) {
      throw new BadRequestException(
        'This address is currently inactive/expired. The address must be activated and made effective before it can be used for scheduling.',
      );
    }

    if (address.effectiveTo && address.effectiveTo < now) {
      throw new BadRequestException(
        'This address is currently inactive/expired. The address must be activated and made effective before it can be used for scheduling.',
      );
    }

    return address;
  }
}
