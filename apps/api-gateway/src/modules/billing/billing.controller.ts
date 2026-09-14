import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // Rate Cards
  @Get('rate-cards')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'FINANCE_ADMIN')
  async getRateCards(@Tenant() companyId: string, @Query('isActive') isActive?: string, @Query('vehicleType') vehicleType?: string) {
    return this.billingService.getRateCards(companyId, { isActive, vehicleType });
  }

  @Post('rate-cards')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createRateCard(@Tenant() companyId: string, @Body() body: any) {
    return this.billingService.createRateCard(companyId, body, companyId);
  }

  @Put('rate-cards/:id')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async updateRateCard(@Tenant() companyId: string, @Param('id') id: string, @Body() body: any) {
    return this.billingService.updateRateCard(companyId, id, body, companyId);
  }

  @Delete('rate-cards/:id')
  @Roles('COMPANY_ADMIN')
  async deleteRateCard(@Tenant() companyId: string, @Param('id') id: string) {
    return this.billingService.deleteRateCard(companyId, id, companyId);
  }

  @Get('rate-cards/active')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async getActiveRateCard(@Tenant() companyId: string, @Query('vehicleType') vehicleType: string, @Query('serviceType') serviceType?: string, @Query('zoneName') zoneName?: string) {
    return this.billingService.getActiveRateCard(companyId, vehicleType, serviceType, zoneName);
  }

  // Trip Cost
  @Post('cost-calculate/:tripId')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async calculateTripCost(@Tenant() companyId: string, @Param('tripId') tripId: string) {
    return this.billingService.calculateTripCost(tripId, companyId);
  }

  @Get('cost-snapshot/:tripId')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async getTripCostSnapshot(@Tenant() companyId: string, @Param('tripId') tripId: string) {
    return this.billingService.getTripCostSnapshot(tripId, companyId);
  }

  // Cost Centers
  @Get('cost-centers')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async listCostCenters(@Tenant() companyId: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    return this.billingService.listCostCenters(companyId, { page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20, search });
  }

  @Post('cost-centers')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN')
  async createCostCenter(@Tenant() companyId: string, @Body() body: { code: string; name: string }) {
    return this.billingService.createCostCenter(companyId, body, companyId);
  }

  @Get('cost-centers/summary')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async getCostCenterSummary(@Tenant() companyId: string) {
    return this.billingService.getCostCenterSummary(companyId);
  }

  // Vendor Invoices
  @Get('vendor-invoices/summary')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async getVendorInvoiceSummary(@Tenant() companyId: string, @Query('vendorId') vendorId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.billingService.getVendorInvoiceSummary(companyId, { vendorId, from, to });
  }

  // Vendor Contracts
  @Get('contracts')
  @Roles('COMPANY_ADMIN', 'FINANCE_ADMIN', 'TRANSPORT_ADMIN')
  async getVendorContracts(@Tenant() companyId: string) {
    return this.billingService.getVendorContracts(companyId);
  }

  @Post('contracts')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async createVendorContract(@Tenant() companyId: string, @Body() body: any) {
    return this.billingService.createVendorContract(companyId, body, companyId);
  }
}
