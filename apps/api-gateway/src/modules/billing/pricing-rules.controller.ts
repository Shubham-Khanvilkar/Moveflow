import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PricingRulesService } from './pricing-rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('billing/pricing-rules')
@UseGuards(JwtAuthGuard, TenantGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
export class PricingRulesController {
  constructor(private readonly pricingService: PricingRulesService) {}

  @Get('resolve')
  async resolveRule(@Request() req: any, @Query('pricingModel') pricingModel?: string) {
    const companyId = req.user?.companyId;
    return this.pricingService.resolvePricingRule(companyId, pricingModel);
  }

  @Post()
  async upsertRule(
    @Request() req: any,
    @Body() body: {
      planId?: string;
      pricingModel: string;
      currency: string;
      rateValue: number;
      tierConfig?: any;
      includedAllowance?: any;
      billingCycle?: string;
      effectiveFrom?: string;
    },
  ) {
    return this.pricingService.upsertPricingRule(req.user.companyId, {
      ...body,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      setByUserId: req.user.sub,
    });
  }

  @Get()
  async listRules(@Request() req: any) {
    return this.pricingService.listPricingRules(req.user.companyId);
  }

  @Post('invoice/generate')
  async generateInvoice(
    @Request() req: any,
    @Body() body: { periodStart: string; periodEnd: string },
  ) {
    return this.pricingService.generateInvoice(
      req.user.companyId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
      req.user.sub,
    );
  }

  @Post('usage/record')
  async recordUsage(
    @Request() req: any,
    @Body() body: { periodStart: string; periodEnd: string; metricType: string; metricValue: number },
  ) {
    return this.pricingService.recordUsage(
      req.user.companyId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
      body.metricType,
      body.metricValue,
    );
  }

  @Get('anomalies')
  async detectAnomalies(
    @Request() req: any,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.pricingService.detectAnomalies(
      req.user.companyId,
      new Date(periodStart),
      new Date(periodEnd),
    );
  }
}

@Controller('billing/tax-rules')
@UseGuards(JwtAuthGuard, TenantGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
export class TaxRulesController {
  constructor(private readonly pricingService: PricingRulesService) {}

  @Get(':countryCode')
  async getTaxRules(@Param('countryCode') countryCode: string) {
    return this.pricingService.getTaxRules(countryCode);
  }

  @Post()
  async upsertTaxRule(
    @Request() req: any,
    @Body() body: {
      countryCode: string;
      taxName: string;
      taxType: string;
      ratePercent: number;
      effectiveFrom: string;
      effectiveTo?: string;
    },
  ) {
    return this.pricingService.upsertTaxRule({
      ...body,
      effectiveFrom: new Date(body.effectiveFrom),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
      setByUserId: req.user.sub,
    });
  }
}

@Controller('billing/fx-rates')
@UseGuards(JwtAuthGuard, TenantGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'FINANCE_MANAGER')
export class FxRatesController {
  constructor(private readonly pricingService: PricingRulesService) {}

  @Get()
  async getFxRate(
    @Query('base') base: string,
    @Query('quote') quote: string,
    @Query('date') date?: string,
  ) {
    return this.pricingService.getFxRate(base, quote, date ? new Date(date) : undefined);
  }

  @Post()
  async storeFxRate(
    @Request() req: any,
    @Body() body: { baseCurrency: string; quoteCurrency: string; rate: number; source: string; date: string },
  ) {
    return this.pricingService.storeFxRate(
      body.baseCurrency,
      body.quoteCurrency,
      body.rate,
      body.source,
      new Date(body.date),
    );
  }
}
