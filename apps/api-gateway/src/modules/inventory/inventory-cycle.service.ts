import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class InventoryCycleService {
  private readonly logger = new Logger(InventoryCycleService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async startCycleCount(companyId: string, data: {
    warehouseId: string;
    items: Array<{ itemId: string; expectedQuantity: number }>;
    scheduledDate?: string;
    notes?: string;
  }, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const cycleCount = await (this.prisma as any).inventoryCycleCount.create({
      data: {
        companyId,
        warehouseId: data.warehouseId,
        status: 'IN_PROGRESS',
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
        notes: data.notes,
        startedBy: performedBy,
        startedAt: new Date(),
        totalItems: data.items.length,
        items: {
          create: data.items.map(item => ({
            itemId: item.itemId,
            expectedQuantity: item.expectedQuantity,
            countedQuantity: 0,
            variance: -item.expectedQuantity,
            status: 'PENDING',
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'CYCLE_COUNT_STARTED',
      entity: 'InventoryCycleCount', entityId: cycleCount.id,
      newValue: { warehouseId: data.warehouseId, totalItems: data.items.length },
    });

    return cycleCount;
  }

  async updateCycleCount(companyId: string, cycleCountId: string, itemId: string, data: {
    countedQuantity: number;
    notes?: string;
  }, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const cycleCount = await (this.prisma as any).inventoryCycleCount.findFirst({
      where: { id: cycleCountId, companyId },
    });
    if (!cycleCount) throw new NotFoundException('Cycle count not found');

    if (cycleCount.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cycle count is not in progress');
    }

    const cycleItem = await (this.prisma as any).inventoryCycleCountItem.findFirst({
      where: { cycleCountId, itemId },
    });
    if (!cycleItem) throw new NotFoundException('Item not found in cycle count');

    const variance = data.countedQuantity - cycleItem.expectedQuantity;
    const status = variance === 0 ? 'MATCHED' : 'DISCREPANCY';

    const updated = await (this.prisma as any).inventoryCycleCountItem.update({
      where: { id: cycleItem.id },
      data: {
        countedQuantity: data.countedQuantity,
        variance,
        status,
        notes: data.notes,
        countedBy: performedBy,
        countedAt: new Date(),
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'CYCLE_COUNT_ITEM_UPDATED',
      entity: 'InventoryCycleCountItem', entityId: updated.id,
      newValue: { itemId, countedQuantity: data.countedQuantity, variance },
    });

    return updated;
  }

  async completeCycleCount(companyId: string, cycleCountId: string, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const cycleCount = await (this.prisma as any).inventoryCycleCount.findFirst({
      where: { id: cycleCountId, companyId },
      include: { items: true },
    });
    if (!cycleCount) throw new NotFoundException('Cycle count not found');

    if (cycleCount.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cycle count is not in progress');
    }

    const pendingItems = cycleCount.items.filter((item: any) => item.status === 'PENDING');
    if (pendingItems.length > 0) {
      throw new BadRequestException(`${pendingItems.length} items are still pending count`);
    }

    const discrepancyCount = cycleCount.items.filter((item: any) => item.status === 'DISCREPANCY').length;

    const updated = await (this.prisma as any).inventoryCycleCount.update({
      where: { id: cycleCountId },
      data: {
        status: 'COMPLETED',
        completedBy: performedBy,
        completedAt: new Date(),
        discrepancyCount,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'CYCLE_COUNT_COMPLETED',
      entity: 'InventoryCycleCount', entityId: cycleCountId,
      newValue: { totalItems: cycleCount.items.length, discrepancyCount },
    });

    return updated;
  }

  async getOverdueCounts(companyId: string, params?: { page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const now = new Date();
    const where: any = {
      companyId,
      status: 'SCHEDULED',
      scheduledDate: { lt: now },
    };

    const [counts, total] = await Promise.all([
      (this.prisma as any).inventoryCycleCount.findMany({
        where, skip, take: limit,
        orderBy: { scheduledDate: 'asc' },
      }),
      (this.prisma as any).inventoryCycleCount.count({ where }),
    ]);

    return {
      data: counts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReconciliationSummary(companyId: string, params: { warehouseId?: string; from?: string; to?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const where: any = { companyId, status: 'COMPLETED' };
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.from || params.to) {
      where.completedAt = {};
      if (params.from) where.completedAt.gte = new Date(params.from);
      if (params.to) where.completedAt.lte = new Date(params.to);
    }

    const counts = await (this.prisma as any).inventoryCycleCount.findMany({
      where,
      include: { items: true },
      orderBy: { completedAt: 'desc' },
    });

    let totalItems = 0;
    let matchedItems = 0;
    let discrepancyItems = 0;
    let totalVariance = 0;

    for (const count of counts) {
      for (const item of count.items) {
        totalItems++;
        if (item.status === 'MATCHED') matchedItems++;
        if (item.status === 'DISCREPANCY') discrepancyItems++;
        totalVariance += Math.abs(item.variance || 0);
      }
    }

    const accuracyRate = totalItems > 0 ? Math.round((matchedItems / totalItems) * 100 * 100) / 100 : 0;

    return {
      totalCycleCounts: counts.length,
      totalItems,
      matchedItems,
      discrepancyItems,
      totalVariance,
      accuracyRate,
    };
  }
}
