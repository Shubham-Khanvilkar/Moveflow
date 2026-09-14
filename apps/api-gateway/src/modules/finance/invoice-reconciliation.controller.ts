import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { InvoiceReconciliationService } from './invoice-reconciliation.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('invoice')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class InvoiceReconciliationController {
  constructor(private readonly invoiceService: InvoiceReconciliationService) {}

  @Post()
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN')
  async createInvoice(@Request() req: any, @Body() body: { vendorInvoiceId: string; invoiceAmount: number; tripId?: string; tripAmount?: number; dispatchAmount?: number }) {
    return this.invoiceService.createInvoice(req.user.companyId, body, req.user.id);
  }

  @Get()
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN')
  async getInvoices(@Request() req: any, @Query('vendorId') vendorId?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.invoiceService.getInvoices(req.user.companyId, { vendorId, status, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post(':invoiceId/auto-match')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN')
  async autoMatch(@Request() req: any, @Param('invoiceId') invoiceId: string) {
    return this.invoiceService.autoMatchTrips(req.user.companyId, invoiceId);
  }

  @Post(':invoiceId/approve')
  @Roles('COMPANY_ADMIN')
  async approveInvoice(@Request() req: any, @Param('invoiceId') invoiceId: string) {
    return this.invoiceService.approveInvoice(req.user.companyId, invoiceId, req.user.id);
  }

  @Get('reconciliation/summary')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN')
  async getSummary(@Request() req: any, @Query('vendorId') vendorId?: string) {
    return this.invoiceService.getReconciliationSummary(req.user.companyId, vendorId);
  }
}
