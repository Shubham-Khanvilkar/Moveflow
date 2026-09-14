import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { BulkImportService } from './bulk-import.service';
import { TransportExpenseService } from './transport-expense.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class Phase4AController {
  constructor(
    private importService: BulkImportService,
    private expenseService: TransportExpenseService,
  ) {}

  // ============================================================
  // BULK IMPORT
  // ============================================================

  @Get('employees/import/template')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async downloadTemplate(@Res() res: Response) {
    const csv = this.importService.getTemplateCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employee-import-template.csv');
    res.send(csv);
  }

  @Post('employees/import/validate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async validateImport(@Tenant() companyId: string, @Req() req: any, @Body() body: { csvContent: string; fileName: string }) {
    return this.importService.validateImport(companyId, req.user.userId, body.csvContent, body.fileName);
  }

  @Post('employees/import')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async importEmployees(@Tenant() companyId: string, @Req() req: any, @Body() body: { csvContent: string; fileName: string }) {
    return this.importService.importEmployees(companyId, req.user.userId, body.csvContent, body.fileName);
  }

  @Get('employees/import/list')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async listImportJobs(@Tenant() companyId: string, @Query() query: any) {
    return this.importService.listImportJobs(companyId, query);
  }

  @Get('employees/import/:id')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getImportJob(@Tenant() companyId: string, @Param('id') id: string) {
    return this.importService.getImportJob(companyId, id);
  }

  // ============================================================
  // TRANSPORT EXPENSES
  // ============================================================

  @Post('transport-expenses')
  @Roles('EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createExpense(@Tenant() companyId: string, @Req() req: any, @Body() body: any) {
    return this.expenseService.createExpense(companyId, req.user.userId, body);
  }

  @Get('transport-expenses')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async listExpenses(@Tenant() companyId: string, @Query() query: any) {
    return this.expenseService.listExpenses(companyId, query);
  }

  @Get('transport-expenses/my')
  @Roles('EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN')
  async getMyExpenses(@Tenant() companyId: string, @Req() req: any, @Query() query: any) {
    return this.expenseService.getMyExpenses(companyId, req.user.userId, query);
  }

  @Get('transport-expenses/pending-approvals')
  @Roles('MANAGER', 'TEAM_LEADER', 'DIRECTOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getPendingApprovals(@Tenant() companyId: string, @Req() req: any, @Query() query: any) {
    return this.expenseService.getPendingApprovals(companyId, req.user.userId, query);
  }

  @Get('transport-expenses/:id')
  @Roles('EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getExpense(@Tenant() companyId: string, @Param('id') id: string) {
    return this.expenseService.getExpense(companyId, id);
  }

  @Post('transport-expenses/:id/submit')
  @Roles('EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN')
  async submitExpense(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string) {
    return this.expenseService.submitExpense(companyId, req.user.userId, id);
  }

  @Post('transport-expenses/:id/approve')
  @Roles('MANAGER', 'TEAM_LEADER', 'DIRECTOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async approveExpense(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.expenseService.approveExpense(companyId, req.user.userId, id, body);
  }

  @Post('transport-expenses/:id/reject')
  @Roles('MANAGER', 'TEAM_LEADER', 'DIRECTOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async rejectExpense(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.expenseService.rejectExpense(companyId, req.user.userId, id, body.reason);
  }

  @Post('transport-expenses/:id/dispute')
  @Roles('EMPLOYEE')
  async disputeExpense(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.expenseService.disputeExpense(companyId, req.user.userId, id, body.reason);
  }

  @Post('transport-expenses/:id/receipt')
  @Roles('EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN')
  async uploadReceipt(@Tenant() companyId: string, @Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.expenseService.uploadReceipt(companyId, req.user.userId, id, body);
  }

  // ============================================================
  // TRANSPORT LIMITS
  // ============================================================

  @Get('transport-limits/me')
  @Roles('EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN')
  async getMyLimits(@Tenant() companyId: string, @Req() req: any) {
    return this.expenseService.getTransportLimits(companyId, req.user.userId);
  }

  @Get('transport-limits/:employeeId')
  @Roles('MANAGER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async getEmployeeLimits(@Tenant() companyId: string, @Param('employeeId') employeeId: string) {
    return this.expenseService.getTransportLimits(companyId, employeeId);
  }

  @Put('transport-limits/:employeeId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async updateEmployeeLimits(@Tenant() companyId: string, @Req() req: any, @Param('employeeId') employeeId: string, @Body() body: any) {
    return this.expenseService.updateTransportLimits(companyId, req.user.userId, employeeId, body);
  }

  @Post('transport-limits/evaluate')
  @Roles('EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async evaluateLimit(@Tenant() companyId: string, @Req() req: any, @Body() body: { employeeId: string; amount: number }) {
    return this.expenseService.evaluateTransportLimit(companyId, body.employeeId, body.amount);
  }

  // ============================================================
  // EXPENSE ANALYTICS
  // ============================================================

  @Get('transport-expenses/analytics/overview')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DIRECTOR')
  async getExpenseAnalytics(@Tenant() companyId: string, @Query() query: any) {
    return this.expenseService.getExpenseAnalytics(companyId, query);
  }
}
