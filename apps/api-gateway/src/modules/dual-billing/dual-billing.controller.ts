import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { DualBillingService } from './dual-billing.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import {
  CreateSaaSInvoiceDto,
  CreateTransportInvoiceDto,
  ReconcileDto,
} from './dual-billing.service';

@ApiTags('Dual Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('v1/billing')
export class DualBillingController {
  constructor(private readonly service: DualBillingService) {}

  // ===== SaaS Billing =====

  @Post('saas')
  @RequirePermissions({ module: 'billing', action: 'create' })
  @ApiOperation({ summary: 'Create SaaS invoice' })
  async createSaaSInvoice(@Body() dto: CreateSaaSInvoiceDto, @Request() req: any) {
    return this.service.createSaaSInvoice(req.user.companyId, dto, req.user.id);
  }

  @Get('saas')
  @RequirePermissions({ module: 'billing', action: 'view' })
  @ApiOperation({ summary: 'Get SaaS invoices' })
  async getSaaSInvoices(
    @Query('status') status: string,
    @Request() req: any,
  ) {
    return this.service.getSaaSInvoices(req.user.companyId, status);
  }

  @Patch('saas/:invoiceId/status')
  @RequirePermissions({ module: 'billing', action: 'edit' })
  @ApiOperation({ summary: 'Update SaaS invoice status' })
  async updateSaaSInvoiceStatus(
    @Param('invoiceId') invoiceId: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.service.updateSaaSInvoiceStatus(req.user.companyId, invoiceId, status, req.user.id);
  }

  // ===== Transport Billing =====

  @Post('transport')
  @RequirePermissions({ module: 'billing', action: 'create' })
  @ApiOperation({ summary: 'Create transport invoice' })
  async createTransportInvoice(@Body() dto: CreateTransportInvoiceDto, @Request() req: any) {
    return this.service.createTransportInvoice(req.user.companyId, dto, req.user.id);
  }

  @Get('transport')
  @RequirePermissions({ module: 'billing', action: 'view' })
  @ApiOperation({ summary: 'Get transport invoices' })
  async getTransportInvoices(
    @Query('status') status: string,
    @Query('vendorId') vendorId: string,
    @Request() req: any,
  ) {
    return this.service.getTransportInvoices(req.user.companyId, status, vendorId);
  }

  @Patch('transport/:invoiceId/status')
  @RequirePermissions({ module: 'billing', action: 'edit' })
  @ApiOperation({ summary: 'Update transport invoice status' })
  async updateTransportInvoiceStatus(
    @Param('invoiceId') invoiceId: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.service.updateTransportInvoiceStatus(req.user.companyId, invoiceId, status, req.user.id);
  }

  // ===== Reconciliation =====

  @Post('reconcile')
  @RequirePermissions({ module: 'billing', action: 'reconcile' })
  @ApiOperation({ summary: 'Reconcile SaaS and transport invoices' })
  async reconcile(@Body() dto: ReconcileDto, @Request() req: any) {
    return this.service.reconcile(req.user.companyId, dto, req.user.id);
  }

  @Get('reconciliations')
  @RequirePermissions({ module: 'billing', action: 'view' })
  @ApiOperation({ summary: 'Get billing reconciliations' })
  async getReconciliations(@Request() req: any) {
    return this.service.getReconciliations(req.user.companyId);
  }

  @Patch('reconciliations/:id/resolve')
  @RequirePermissions({ module: 'billing', action: 'edit' })
  @ApiOperation({ summary: 'Resolve a reconciliation' })
  async resolveReconciliation(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.service.resolveReconciliation(req.user.companyId, id, req.user.id, notes);
  }

  // ===== Usage =====

  @Get('usage')
  @RequirePermissions({ module: 'billing', action: 'view' })
  @ApiOperation({ summary: 'Get usage metrics' })
  async getUsageMetrics(
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @Request() req: any,
  ) {
    return this.service.getUsageMetrics(req.user.companyId, periodStart, periodEnd);
  }

  // ===== Analytics =====

  @Get('analytics')
  @RequirePermissions({ module: 'billing', action: 'view' })
  @ApiOperation({ summary: 'Get billing analytics' })
  async getBillingAnalytics(@Request() req: any) {
    return this.service.getBillingAnalytics(req.user.companyId);
  }
}
