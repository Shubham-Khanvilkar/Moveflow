import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { BudgetAllocationService } from './budget-allocation.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('budget')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class BudgetAllocationController {
  constructor(private readonly budgetService: BudgetAllocationService) {}

  @Post()
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN')
  async createAllocation(@Request() req: any, @Body() body: { level: string; levelId: string; fiscalYear: string; fiscalMonth?: string; allocatedBudget: number; status?: string }) {
    return this.budgetService.createAllocation(req.user.companyId, body, req.user.id);
  }

  @Get()
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async getAllocations(@Request() req: any, @Query('level') level?: string, @Query('fiscalYear') fiscalYear?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.budgetService.getAllocations(req.user.companyId, { level, fiscalYear, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Get(':allocationId')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async getAllocationById(@Request() req: any, @Param('allocationId') allocationId: string) {
    return this.budgetService.getAllocationById(req.user.companyId, allocationId);
  }

  @Get('check/:vendorId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async checkBudget(@Request() req: any, @Param('vendorId') vendorId: string, @Query('amount') amount: string) {
    return this.budgetService.checkBudget(req.user.companyId, vendorId, parseFloat(amount || '0'));
  }

  @Post(':allocationId/spend')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async recordSpend(@Request() req: any, @Param('allocationId') allocationId: string, @Body() body: { amount: number; referenceType: string; referenceId: string }) {
    return this.budgetService.recordSpend(req.user.companyId, allocationId, body.amount, body.referenceType, body.referenceId);
  }
}
