import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class ExpenseStateMachineService {
  private readonly states = ['DRAFT', 'SUBMITTED', 'MANAGER_APPROVED', 'DIRECTOR_APPROVED', 'FINANCE_APPROVED', 'REIMBURSED', 'REJECTED', 'DISPUTED'];
  private readonly transitions: Record<string, string[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['MANAGER_APPROVED', 'REJECTED'],
    MANAGER_APPROVED: ['DIRECTOR_APPROVED', 'REJECTED'],
    DIRECTOR_APPROVED: ['FINANCE_APPROVED', 'REJECTED'],
    FINANCE_APPROVED: ['REIMBURSED'],
    REJECTED: [],
    REIMBURSED: [],
    DISPUTED: ['SUBMITTED'],
  };

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async transitionExpense(companyId: string, expenseId: string, action: string, userId: string, notes?: string) {
    const expense = await (this.prisma as any).expense.findFirst({ where: { id: expenseId, companyId } });
    if (!expense) throw new NotFoundException('Expense not found');

    const allowed = this.transitions[expense.status] || [];
    if (!allowed.includes(action)) {
      throw new BadRequestException(`Cannot ${action} from ${expense.status}`);
    }

    const newState = this.mapActionToState(action);
    await (this.prisma as any).expense.update({
      where: { id: expenseId },
      data: { status: newState, notes } as any,
    });

    await this.audit.log({
      companyId, userId, action: `EXPENSE_${action}`, entity: 'Expense',
      entityId: expenseId, newValue: { from: expense.status, to: newState, notes },
    });

    return { expenseId, from: expense.status, to: newState };
  }

  private mapActionToState(action: string): string {
    const map: Record<string, string> = {
      SUBMITTED: 'SUBMITTED',
      MANAGER_APPROVED: 'MANAGER_APPROVED',
      DIRECTOR_APPROVED: 'DIRECTOR_APPROVED',
      FINANCE_APPROVED: 'FINANCE_APPROVED',
      REIMBURSED: 'REIMBURSED',
      REJECTED: 'REJECTED',
    };
    return map[action] || action;
  }

  async getExpenseStates() {
    return { states: this.states, transitions: this.transitions };
  }
}

@Injectable()
export class ApprovalLimitsService {
  constructor(private prisma: PrismaService) {}

  async getLimits(companyId: string) {
    return [
      { role: 'MANAGER', maxAmount: 5000, currency: 'INR' },
      { role: 'COMPANY_ADMIN', maxAmount: 25000, currency: 'INR' },
      { role: 'DIRECTOR', maxAmount: 100000, currency: 'INR' },
    ];
  }

  async canApprove(companyId: string, userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const limits: Record<string, number> = {
      MANAGER: 5000, COMPANY_ADMIN: 25000, DIRECTOR: 100000, NAVIRA_PLATFORM_ADMINISTRATOR: Infinity, NAVIRA_OWNER: Infinity,
    };

    const userRole = (user as any).role || 'EMPLOYEE';
    const limit = limits[userRole] || 0;
    return { canApprove: amount <= limit, limit, amount, role: userRole };
  }
}

@Injectable()
export class ExpenseAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getExpenseSummary(companyId: string) {
    return {
      totalExpenses: 0,
      pendingApproval: 0,
      approvedThisMonth: 0,
      rejectedThisMonth: 0,
      averageProcessingDays: 3.2,
      topCategories: [],
    };
  }

  async getDuplicateDetection(companyId: string, data: { amount: number; date: Date; vendor?: string }) {
    return { isDuplicate: false, similarExpenses: [] };
  }
}
