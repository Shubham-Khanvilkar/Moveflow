import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { EmployeeHistoryQueryDto, CreateEmployeeHistoryDto } from './dto/employee-history.dto';

@Injectable()
export class EmployeeHistoryService {
  constructor(private prisma: PrismaService) {}

  async record(
    companyId: string,
    dto: CreateEmployeeHistoryDto,
    actorId?: string,
  ) {
    return this.prisma.employeeHistory.create({
      data: {
        companyId,
        userId: dto.userId,
        actorId: actorId ?? dto.correlationId,
        action: dto.action ?? 'OTHER',
        oldValue: dto.oldValue ?? null,
        newValue: dto.newValue ?? null,
        reason: dto.reason ?? null,
        correlationId: dto.correlationId ?? null,
      },
    });
  }

  async getTimeline(
    userId: string,
    companyId: string,
    query?: EmployeeHistoryQueryDto,
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      action,
      startDate,
      endDate,
    } = query ?? ({} as any);
    const skip = (page - 1) * limit;

    const where: any = { userId, companyId };

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.employeeHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.employeeHistory.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
