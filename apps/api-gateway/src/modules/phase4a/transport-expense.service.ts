import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

const EXPENSE_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['MANAGER_REVIEW', 'CANCELLED'],
  MANAGER_REVIEW: ['DIRECTOR_REVIEW', 'APPROVED', 'REJECTED'],
  DIRECTOR_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAYROLL_PENDING'],
  REJECTED: [],
  PAYROLL_PENDING: ['REIMBURSED'],
  REIMBURSED: [],
  CANCELLED: [],
};

@Injectable()
export class TransportExpenseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // EXPENSE CRUD
  // ============================================================

  async createExpense(companyId: string, employeeId: string, data: {
    provider: string;
    expenseDate: string;
    pickupAddress: string;
    dropAddress: string;
    distanceKm?: number;
    fareAmount: number;
    tollAmount?: number;
    parkingAmount?: number;
    waitingAmount?: number;
    otherAmount?: number;
    reason: string;
    reasonNotes?: string;
    bookingId?: string;
    tripId?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const totalAmount = data.fareAmount + (data.tollAmount || 0) + (data.parkingAmount || 0) + (data.waitingAmount || 0) + (data.otherAmount || 0);

    // Get employee info for cost center snapshot
    const employee = await this.prisma.user.findFirst({ where: { id: employeeId, companyId } });

    const expense = await this.prisma.transportExpense.create({
      data: {
        companyId,
        employeeId,
        employeeName: employee?.name,
        bookingId: data.bookingId || undefined,
        tripId: data.tripId || undefined,
        provider: data.provider,
        expenseDate: new Date(data.expenseDate),
        pickupAddress: data.pickupAddress,
        dropAddress: data.dropAddress,
        distanceKm: data.distanceKm,
        fareAmount: data.fareAmount,
        totalAmount,
        claimedAmount: totalAmount,
        reason: data.reason,
        reasonNotes: data.reasonNotes,
        status: 'DRAFT',
        department: employee?.departmentId || undefined,
      },
    });

    await this.audit.log({
      companyId, userId: employeeId, action: 'EXPENSE_CREATED',
      entity: 'TransportExpense', entityId: expense.id,
      newValue: { provider: data.provider, amount: totalAmount, reason: data.reason },
    });

    return expense;
  }

  async listExpenses(companyId: string, params: {
    employeeId?: string;
    status?: string;
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.expenseDate = {};
      if (params.from) where.expenseDate.gte = new Date(params.from);
      if (params.to) where.expenseDate.lte = new Date(params.to);
    }

    const [expenses, total] = await Promise.all([
      this.prisma.transportExpense.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transportExpense.count({ where }),
    ]);

    return {
      data: expenses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getExpense(companyId: string, expenseId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const expense = await this.prisma.transportExpense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async getMyExpenses(companyId: string, employeeId: string, params?: { status?: string; page?: number; limit?: number }) {
    return this.listExpenses(companyId, { ...params, employeeId });
  }

  async getPendingApprovals(companyId: string, managerId: string, params?: { page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Get reportees
    const reportees = await this.prisma.user.findMany({
      where: { OR: [{ managerId }, { teamLeaderId: managerId }] },
      select: { id: true },
    });
    const reporteeIds = reportees.map(r => r.id);

    if (reporteeIds.length === 0) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    return this.listExpenses(companyId, {
      ...params,
      status: 'MANAGER_REVIEW',
    });
  }

  // ============================================================
  // STATE TRANSITIONS
  // ============================================================

  async submitExpense(companyId: string, employeeId: string, expenseId: string) {
    return this._transition(companyId, employeeId, expenseId, 'SUBMITTED', { submittedAt: new Date() });
  }

  async approveExpense(companyId: string, reviewerId: string, expenseId: string, data?: {
    approvedAmount?: number;
    notes?: string;
  }) {
    const expense = await this.getExpense(companyId, expenseId);
    const approvedAmount = data?.approvedAmount ?? expense.claimedAmount;
    const isPartial = approvedAmount < expense.claimedAmount;

    const updateData: any = {
      status: 'APPROVED',
      approvedAmount,
      approvedById: reviewerId,
      approvedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: reviewerId,
    };

    if (isPartial) {
      updateData.rejectedAmount = expense.claimedAmount - approvedAmount;
      updateData.partialApprovalReason = data?.notes || 'PARTIAL_APPROVAL';
    }

    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const updated = await this.prisma.transportExpense.update({
      where: { id: expenseId },
      data: updateData,
    });

    await this.audit.log({
      companyId, userId: reviewerId, action: isPartial ? 'EXPENSE_PARTIAL_APPROVAL' : 'EXPENSE_APPROVED',
      entity: 'TransportExpense', entityId: expenseId,
      newValue: { approvedAmount, originalAmount: expense.claimedAmount },
    });

    return updated;
  }

  async rejectExpense(companyId: string, reviewerId: string, expenseId: string, reason: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const updated = await this.prisma.transportExpense.update({
      where: { id: expenseId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        rejectedAmount: undefined,
      },
    });

    await this.audit.log({
      companyId, userId: reviewerId, action: 'EXPENSE_REJECTED',
      entity: 'TransportExpense', entityId: expenseId,
      newValue: { reason },
    });

    return updated;
  }

  async disputeExpense(companyId: string, employeeId: string, expenseId: string, reason: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const dispute = await this.prisma.expenseDispute.create({
      data: {
        companyId,
        expenseId,
        employeeId,
        reason,
        status: 'OPEN',
      },
    });

    await this.audit.log({
      companyId, userId: employeeId, action: 'EXPENSE_DISPUTED',
      entity: 'ExpenseDispute', entityId: dispute.id,
      newValue: { expenseId, reason },
    });

    return dispute;
  }

  async uploadReceipt(companyId: string, employeeId: string, expenseId: string, data: {
    fileName: string;
    fileUrl: string;
    fileHash: string;
    fileSize?: number;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Check for duplicate receipt
    const existing = await this.prisma.transportExpense.findFirst({
      where: { companyId, receiptHash: data.fileHash, id: { not: expenseId } },
    });

    let isDuplicate = false;
    if (existing) {
      isDuplicate = true;
      await this.audit.log({
        companyId, userId: employeeId, action: 'POSSIBLE_DUPLICATE_EXPENSE',
        entity: 'TransportExpense', entityId: expenseId,
        newValue: { duplicateOfId: existing.id, receiptHash: data.fileHash },
      });
    }

    const updated = await this.prisma.transportExpense.update({
      where: { id: expenseId },
      data: {
        receiptUrl: data.fileUrl,
        receiptHash: data.fileHash,
        receiptFileName: data.fileName,
        isDuplicate,
      },
    });

    return { receiptUploaded: true, isDuplicate, expenseId };
  }

  // ============================================================
  // LIMITS
  // ============================================================

  async getTransportLimits(companyId: string, employeeId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const limits = await this.prisma.employeeTransportLimit.findFirst({
      where: { companyId, employeeId },
    });

    if (!limits) {
      return this._defaultLimits();
    }

    return limits;
  }

  async evaluateTransportLimit(companyId: string, employeeId: string, amount: number): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    limitType: string;
    currentUsage: number;
    requestedUsage: number;
    remainingLimit: number;
    blockingReason?: string;
  }> {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const limits = await this.prisma.employeeTransportLimit.findFirst({
      where: { companyId, employeeId },
    });

    if (!limits) {
      return { allowed: true, requiresApproval: false, limitType: 'NO_LIMIT_CONFIGURED', currentUsage: 0, requestedUsage: amount, remainingLimit: Infinity };
    }

    // Check monthly limit
    if (limits.maxSpendPerMonth) {
      const remaining = limits.maxSpendPerMonth - limits.spendThisMonth;
      if (limits.spendThisMonth + amount > limits.maxSpendPerMonth) {
        return {
          allowed: false,
          requiresApproval: limits.limitAction === 'REQUIRE_APPROVAL',
          limitType: 'MONTHLY_SPEND',
          currentUsage: limits.spendThisMonth,
          requestedUsage: amount,
          remainingLimit: remaining > 0 ? remaining : 0,
          blockingReason: 'MONTHLY_TRANSPORT_LIMIT_EXCEEDED',
        };
      }
    }

    // Check daily limit
    if (limits.maxSpendPerDay) {
      if (limits.spendToday + amount > limits.maxSpendPerDay) {
        return {
          allowed: false,
          requiresApproval: limits.limitAction === 'REQUIRE_APPROVAL',
          limitType: 'DAILY_SPEND',
          currentUsage: limits.spendToday,
          requestedUsage: amount,
          remainingLimit: Math.max(0, limits.maxSpendPerDay - limits.spendToday),
          blockingReason: 'DAILY_TRANSPORT_LIMIT_EXCEEDED',
        };
      }
    }

    // Check trip limits
    if (limits.maxTripsPerMonth && limits.tripsThisMonth >= limits.maxTripsPerMonth) {
      return {
        allowed: false,
        requiresApproval: limits.limitAction === 'REQUIRE_APPROVAL',
        limitType: 'MONTHLY_TRIPS',
        currentUsage: limits.tripsThisMonth,
        requestedUsage: 1,
        remainingLimit: 0,
        blockingReason: 'MONTHLY_TRIP_LIMIT_EXCEEDED',
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
      limitType: 'WITHIN_LIMITS',
      currentUsage: limits.spendThisMonth,
      requestedUsage: amount,
      remainingLimit: limits.maxSpendPerMonth ? limits.maxSpendPerMonth - limits.spendThisMonth : Infinity,
    };
  }

  async updateTransportLimits(companyId: string, performedBy: string, employeeId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.employeeTransportLimit.findFirst({
      where: { companyId, employeeId },
    });

    if (existing) {
      return this.prisma.employeeTransportLimit.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.employeeTransportLimit.create({
      data: { companyId, employeeId, ...data },
    });
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  async getExpenseAnalytics(companyId: string, params?: { from?: string; to?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const where: any = { companyId };
    if (params?.from || params?.to) {
      where.expenseDate = {};
      if (params.from) where.expenseDate.gte = new Date(params.from);
      if (params.to) where.expenseDate.lte = new Date(params.to);
    }

    const [totalExpenses, totalAmount, approvedAmount, pendingCount, byProvider] = await Promise.all([
      this.prisma.transportExpense.count({ where }),
      this.prisma.transportExpense.aggregate({ where, _sum: { totalAmount: true } }),
      this.prisma.transportExpense.aggregate({ where: { ...where, status: 'APPROVED' }, _sum: { approvedAmount: true } }),
      this.prisma.transportExpense.count({ where: { ...where, status: { in: ['SUBMITTED', 'MANAGER_REVIEW'] } } }),
      this.prisma.transportExpense.groupBy({
        by: ['provider'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalExpenses,
      totalClaimedAmount: totalAmount._sum.totalAmount || 0,
      totalApprovedAmount: approvedAmount._sum.approvedAmount || 0,
      pendingApprovals: pendingCount,
      byProvider: byProvider.map(p => ({
        provider: p.provider,
        count: p._count.id,
        totalAmount: p._sum.totalAmount || 0,
      })),
    };
  }

  // ============================================================
  // HELPER
  // ============================================================

  private async _transition(companyId: string, userId: string, expenseId: string, newStatus: string, extraData?: Record<string, any>) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const expense = await this.prisma.transportExpense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new NotFoundException('Expense not found');

    const allowed = EXPENSE_STATUS_TRANSITIONS[expense.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${expense.status} to ${newStatus}`);
    }

    const updated = await this.prisma.transportExpense.update({
      where: { id: expenseId },
      data: { status: newStatus, ...extraData } as any,
    });

    await this.audit.log({
      companyId, userId, action: `EXPENSE_${newStatus}`,
      entity: 'TransportExpense', entityId: expenseId,
      oldValue: { status: expense.status }, newValue: { status: newStatus },
    });

    return updated;
  }

  // ============================================================
  // DEMO DATA
  // ============================================================

  private _demoExpense(data: any) {
    return { id: `exp-${Date.now()}`, ...data, totalAmount: data.fareAmount, claimedAmount: data.fareAmount, status: 'DRAFT' };
  }

  private _demoExpenseList() {
    return {
      data: [
        { id: 'exp-001', employeeId: 'emp-001', employeeName: 'John Smith', provider: 'UBER', expenseDate: new Date('2025-08-30'), pickupAddress: '123 Main St', dropAddress: 'Office Park', fareAmount: 650, totalAmount: 650, status: 'APPROVED', reason: 'COMPANY_CAB_UNAVAILABLE', approvedAmount: 650 },
        { id: 'exp-002', employeeId: 'emp-002', employeeName: 'Jane Doe', provider: 'OLA', expenseDate: new Date('2025-08-29'), pickupAddress: '789 Lake Rd', dropAddress: 'Tech Park', fareAmount: 480, totalAmount: 480, status: 'MANAGER_REVIEW', reason: 'EMERGENCY' },
        { id: 'exp-003', employeeId: 'emp-001', employeeName: 'John Smith', provider: 'RAPIDO', expenseDate: new Date('2025-08-28'), pickupAddress: 'Station Road', dropAddress: 'Office', fareAmount: 320, totalAmount: 320, status: 'PAYROLL_PENDING', reason: 'LATE_SHIFT' },
      ],
      pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
    };
  }

  private _demoExpenseDetail(expenseId: string) {
    return { id: expenseId, employeeId: '', employeeName: '', provider: '', expenseDate: new Date(), pickupAddress: '', dropAddress: '', fareAmount: 0, tollAmount: 0, parkingAmount: 0, totalAmount: 0, claimedAmount: 0, approvedAmount: 0, status: 'DRAFT', reason: '', receiptFileName: '' };
  }

  private _demoPendingApprovals() {
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  private _demoTransportLimits() {
    return { maxSpendPerMonth: 5000, tripsThisMonth: 8, spendThisMonth: 3800, maxTripsPerMonth: 20, limitAction: 'REQUIRE_APPROVAL', cabAllowed: true, shuttleAllowed: true };
  }

  private _defaultLimits() {
    return { maxSpendPerMonth: 5000, tripsThisMonth: 0, spendThisMonth: 0, maxTripsPerMonth: 20, limitAction: 'REQUIRE_APPROVAL', cabAllowed: true, shuttleAllowed: true };
  }

  private _demoExpenseAnalytics() {
    return {
      totalExpenses: 156,
      totalClaimedAmount: 89500,
      totalApprovedAmount: 82300,
      pendingApprovals: 7,
      byProvider: [
        { provider: 'UBER', count: 89, totalAmount: 52300 },
        { provider: 'OLA', count: 45, totalAmount: 24800 },
        { provider: 'RAPIDO', count: 15, totalAmount: 7200 },
        { provider: 'LOCAL_CAB', count: 7, totalAmount: 5200 },
      ],
    };
  }
}
