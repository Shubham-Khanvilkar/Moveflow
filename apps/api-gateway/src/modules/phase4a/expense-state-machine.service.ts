import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  MANAGER_APPROVED = 'MANAGER_APPROVED',
  MANAGER_REJECTED = 'MANAGER_REJECTED',
  DIRECTOR_ESCALATED = 'DIRECTOR_ESCALATED',
  DIRECTOR_APPROVED = 'DIRECTOR_APPROVED',
  DIRECTOR_REJECTED = 'DIRECTOR_REJECTED',
  FINANCE_REVIEW = 'FINANCE_REVIEW',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['MANAGER_REVIEW', 'CANCELLED'],
  MANAGER_REVIEW: ['MANAGER_APPROVED', 'MANAGER_REJECTED', 'DIRECTOR_ESCALATED'],
  MANAGER_APPROVED: ['FINANCE_REVIEW'],
  MANAGER_REJECTED: ['SUBMITTED', 'CANCELLED'],
  DIRECTOR_ESCALATED: ['DIRECTOR_APPROVED', 'DIRECTOR_REJECTED'],
  DIRECTOR_APPROVED: ['FINANCE_REVIEW'],
  DIRECTOR_REJECTED: ['CANCELLED'],
  FINANCE_REVIEW: ['FINANCE_APPROVED'],
  FINANCE_APPROVED: ['PAID'],
  PAID: [],
  DISPUTED: ['MANAGER_REVIEW'],
  CANCELLED: ['DRAFT'],
};

@Injectable()
export class ExpenseStateMachineService {
  private readonly logger = new Logger(ExpenseStateMachineService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 1. TRANSITION EXPENSE STATE
  // ============================================================
  async transition(
    expenseId: string,
    companyId: string,
    userId: string,
    targetStatus: string,
    data?: {
      reason?: string;
      rejectionReason?: string;
      notes?: string;
    },
  ) {
    const expense = await (this.prisma as any).transportExpense.findUnique({
      where: { id: expenseId },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.companyId !== companyId) throw new BadRequestException('Cross-tenant access denied');

    const currentStatus = expense.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(`Invalid transition: ${currentStatus} -> ${targetStatus}. Allowed: ${allowed.join(', ')}`);
    }

    // Validate state-specific rules
    if (targetStatus === 'DIRECTOR_ESCALATED') {
      await this.validateDirectorEscalation(expense, data?.reason);
    }
    if (targetStatus === 'FINANCE_APPROVED') {
      // Finance approval requires amount check
      if ((expense as any).amount > 10000) {
        this.logger.warn(`High-value expense approved: ₹${(expense as any).amount}`);
      }
    }

    // Apply transition
    const updates: any = { status: targetStatus };

    if (targetStatus === 'MANAGER_REVIEW') {
      updates.submittedAt = new Date();
    } else if (targetStatus === 'MANAGER_APPROVED') {
      updates.approvedBy = userId;
      updates.approvedAt = new Date();
    } else if (targetStatus === 'MANAGER_REJECTED') {
      updates.rejectedBy = userId;
      updates.rejectedAt = new Date();
      updates.rejectionReason = data?.rejectionReason;
    } else if (targetStatus === 'DIRECTOR_ESCALATED') {
      updates.escalatedBy = userId;
      updates.escalatedAt = new Date();
      updates.escalationReason = data?.reason;
    } else if (targetStatus === 'DIRECTOR_APPROVED') {
      updates.directorApprovedBy = userId;
      updates.directorApprovedAt = new Date();
    } else if (targetStatus === 'DIRECTOR_REJECTED') {
      updates.directorRejectedBy = userId;
      updates.directorRejectedAt = new Date();
      updates.rejectionReason = data?.rejectionReason;
    } else if (targetStatus === 'FINANCE_APPROVED') {
      updates.financeApprovedBy = userId;
      updates.financeApprovedAt = new Date();
    } else if (targetStatus === 'PAID') {
      updates.paidAt = new Date();
      updates.paymentReference = data?.notes;
    }

    const updated = await (this.prisma as any).transportExpense.update({
      where: { id: expenseId },
      data: updates,
    });

    // Audit log
    await (this.prisma as any).auditLog.create({
      data: {
        companyId,
        userId,
        action: `EXPENSE_${targetStatus}`,
        resourceType: 'EXPENSE',
        resourceId: expenseId,
        details: JSON.stringify({
          from: currentStatus,
          to: targetStatus,
          reason: data?.reason,
          rejectionReason: data?.rejectionReason,
        }),
        createdAt: new Date(),
      },
    });

    return updated;
  }

  // ============================================================
  // 2. DIRECTOR ESCALATION
  // ============================================================
  private async validateDirectorEscalation(expense: any, reason?: string) {
    if (!reason) {
      throw new BadRequestException('Director escalation requires a reason');
    }

    // Auto-escalation rules
    const rules = [
      { condition: expense.amount > 50000, autoEscalate: true },
      { condition: expense.rejectionCount >= 2, autoEscalate: true },
      { condition: expense.disputeCount >= 1, autoEscalate: true },
    ];

    const shouldEscalate = rules.some(r => r.condition);
    if (!shouldEscalate && !reason) {
      throw new BadRequestException('Expense does not meet auto-escalation criteria. Provide a reason.');
    }
  }

  // ============================================================
  // 3. DUPLICATE DETECTION
  // ============================================================
  async detectDuplicates(companyId: string, employeeId: string, amount: number, date: Date) {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const potentialDuplicates = await (this.prisma as any).transportExpense.findMany({
      where: {
        companyId,
        employeeId,
        amount,
        expenseDate: { gte: dateStart, lte: dateEnd },
      },
    });

    return {
      isDuplicate: potentialDuplicates.length > 0,
      duplicateCount: potentialDuplicates.length,
      duplicates: potentialDuplicates,
    };
  }

  // ============================================================
  // 4. REIMBURSEMENT CSV EXPORT
  // ============================================================
  async generateReimbursementCSV(companyId: string, period: { start: Date; end: Date }) {
    const expenses = await (this.prisma as any).transportExpense.findMany({
      where: {
        companyId,
        status: 'PAID',
        paidAt: { gte: period.start, lte: period.end },
      },
    });

    const headers = [
      'Expense ID',
      'Employee ID',
      'Employee Name',
      'Date',
      'Amount',
      'Description',
      'Transport Type',
      'Receipt URL',
      'Approved By',
      'Paid At',
      'Payment Reference',
    ];

    const rows = expenses.map((e: any) => [
      e.id,
      e.employeeId,
      `${e.employeeFirstName || ''} ${e.employeeLastName || ''}`,
      e.expenseDate?.toISOString()?.split('T')[0] || '',
      e.amount,
      e.description || '',
      e.transportType || '',
      e.receiptUrl || '',
      e.approvedBy || '',
      e.paidAt?.toISOString() || '',
      e.paymentReference || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => (r as any[]).map((c: any) => `"${c}"`).join(','))].join('\n');

    return { csv, rowCount: rows.length, totalAmount: expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0) };
  }

  // ============================================================
  // 5. EXPENSE ANALYTICS
  // ============================================================
  async getExpenseAnalytics(companyId: string, period: { start: Date; end: Date }) {
    const expenses = await (this.prisma as any).transportExpense.findMany({
      where: {
        companyId,
        createdAt: { gte: period.start, lte: period.end },
      },
    });

    const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const approved = expenses.filter((e: any) => ['MANAGER_APPROVED', 'DIRECTOR_APPROVED', 'FINANCE_APPROVED', 'PAID'].includes(e.status));
    const rejected = expenses.filter((e: any) => ['MANAGER_REJECTED', 'DIRECTOR_REJECTED'].includes(e.status));
    const pending = expenses.filter((e: any) => ['SUBMITTED', 'MANAGER_REVIEW', 'DIRECTOR_ESCALATED', 'FINANCE_REVIEW'].includes(e.status));

    return {
      totalExpenses: expenses.length,
      totalAmount: total,
      approved: { count: approved.length, amount: approved.reduce((s: number, e: any) => s + (e.amount || 0), 0) },
      rejected: { count: rejected.length, amount: rejected.reduce((s: number, e: any) => s + (e.amount || 0), 0) },
      pending: { count: pending.length, amount: pending.reduce((s: number, e: any) => s + (e.amount || 0), 0) },
      averageAmount: expenses.length > 0 ? Math.round(total / expenses.length) : 0,
    };
  }

  // ============================================================
  // 6. OCR FOUNDATION (receipt parsing)
  // ============================================================
  async parseReceiptOCR(data: {
    companyId: string;
    receiptUrl: string;
    ocrProvider?: string;
  }) {
    // OCR foundation - in production would call Google Vision / AWS Textract
    // For now, return structured data that the frontend can populate
    return {
      provider: data.ocrProvider || 'INTERNAL',
      receiptUrl: data.receiptUrl,
      extractedData: {
        provider: null,    // Uber, Ola, etc.
        amount: null,      // Total amount
        date: null,        // Trip date
        fare: null,        // Base fare
        tax: null,         // Tax amount
        toll: null,        // Toll charges
        parking: null,     // Parking charges
        distance: null,    // Trip distance
        confidence: 0,     // OCR confidence
      },
      status: 'PENDING_MANUAL_REVIEW',
      message: 'Receipt uploaded. Manual verification required.',
    };
  }
}
