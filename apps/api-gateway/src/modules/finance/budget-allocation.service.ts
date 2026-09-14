import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class BudgetAllocationService {
  private readonly logger = new Logger(BudgetAllocationService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createAllocation(companyId: string, data: {
    level: string;
    levelId: string;
    fiscalYear: string;
    fiscalMonth?: string;
    allocatedBudget: number;
    status?: string;
  }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const allocation = await this.prisma.budgetAllocation.create({
      data: {
        companyId,
        level: data.level.toUpperCase(),
        levelId: data.levelId,
        fiscalYear: data.fiscalYear,
        fiscalMonth: data.fiscalMonth,
        allocatedBudget: data.allocatedBudget,
        status: data.status || 'ACTIVE',
      },
    });

    await this.audit.log({ companyId, userId: createdBy, action: 'BUDGET_CREATED', entity: 'BudgetAllocation', entityId: allocation.id, newValue: { level: data.level, budget: data.allocatedBudget } });
    return allocation;
  }

  async getAllocations(companyId: string, params?: { level?: string; fiscalYear?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (params?.level) where.level = params.level.toUpperCase();
    if (params?.fiscalYear) where.fiscalYear = params.fiscalYear;

    const [allocations, total] = await Promise.all([
      this.prisma.budgetAllocation.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.budgetAllocation.count({ where }),
    ]);

    return { data: allocations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getAllocationById(companyId: string, allocationId: string) {
    if (!this.prisma.isConnected()) return null;
    return this.prisma.budgetAllocation.findFirst({ where: { id: allocationId, companyId } });
  }

  async checkBudget(companyId: string, levelId: string, amount: number): Promise<{ withinBudget: boolean; remaining: number; utilizationPercent: number; }> {
    if (!this.prisma.isConnected()) return { withinBudget: true, remaining: 100000, utilizationPercent: 0 };

    const now = new Date();
    const fiscalYear = `${now.getFullYear()}`;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fiscalMonth = `${fiscalYear}-${month}`;

    const allocation = await this.prisma.budgetAllocation.findFirst({
      where: { companyId, levelId, fiscalYear, fiscalMonth },
    });

    if (!allocation) return { withinBudget: true, remaining: Infinity, utilizationPercent: 0 };

    const remaining = allocation.allocatedBudget - allocation.spentAmount - amount;
    const utilizationPercent = ((allocation.spentAmount + amount) / allocation.allocatedBudget) * 100;

    return {
      withinBudget: remaining >= 0,
      remaining: Math.max(0, remaining),
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    };
  }

  async recordSpend(companyId: string, allocationId: string, amount: number, referenceType: string, referenceId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const allocation = await this.prisma.budgetAllocation.findUnique({ where: { id: allocationId } });
    if (!allocation) throw new BadRequestException('Allocation not found');

    const newSpent = allocation.spentAmount + amount;
    await this.prisma.budgetAllocation.update({ where: { id: allocationId }, data: { spentAmount: newSpent } });

    return { recorded: true, spent: newSpent };
  }
}
