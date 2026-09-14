import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class PricingRulesService {
  private readonly logger = new Logger(PricingRulesService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // 40.2 — Resolve pricing rule (most-specific-wins)
  // company-specific → plan default → platform default
  // ============================================================
  async resolvePricingRule(
    companyId: string,
    pricingModel?: string,
  ): Promise<any> {
    // 1. Company-specific active rule
    if (pricingModel) {
      const companyRule = await (this.prisma as any).billingPricingRule.findFirst({
        where: {
          companyId,
          pricingModel,
          isActive: true,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (companyRule) return companyRule;
    }

    // 2. Company plan-level default (planId != null, companyId = null)
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (company) {
      const planRule = await (this.prisma as any).billingPricingRule.findFirst({
        where: {
          companyId: null,
          planId: { not: null },
          pricingModel: pricingModel as any || undefined,
          isActive: true,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (planRule) return planRule;
    }

    // 3. Platform default (both null)
    const platformRule = await (this.prisma as any).billingPricingRule.findFirst({
      where: {
        companyId: null,
        planId: null,
        pricingModel: pricingModel as any || undefined,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return platformRule || null;
  }

  // ============================================================
  // 40.2 — Create/update pricing rule
  // ============================================================
  async upsertPricingRule(
    companyId: string,
    data: {
      planId?: string;
      pricingModel: string;
      currency: string;
      rateValue: number; // minor units
      tierConfig?: any;
      includedAllowance?: any;
      billingCycle?: string;
      effectiveFrom?: Date;
      setByUserId: string;
    },
  ) {
    if (data.rateValue < 0) {
      throw new BadRequestException('Rate value must be non-negative');
    }
    if (!data.currency || data.currency.length !== 3) {
      throw new BadRequestException('Valid ISO 4217 currency code required');
    }

    const rule = await (this.prisma as any).billingPricingRule.create({
      data: {
        companyId: companyId || null,
        planId: data.planId || null,
        pricingModel: data.pricingModel,
        currency: data.currency,
        rateValue: Math.round(data.rateValue),
        tierConfig: data.tierConfig || null,
        includedAllowance: data.includedAllowance || null,
        billingCycle: data.billingCycle || 'MONTHLY',
        effectiveFrom: data.effectiveFrom || new Date(),
        setByUserId: data.setByUserId,
        isActive: true,
      },
    });

    await this.audit.log({
      companyId,
      userId: data.setByUserId,
      action: 'PRICING_RULE_UPSERTED',
      entity: 'BillingPricingRule',
      entityId: rule.id,
      newValue: { pricingModel: data.pricingModel, currency: data.currency, rateValue: data.rateValue },
    });

    return rule;
  }

  // ============================================================
  // 40.2 — List pricing rules for a company
  // ============================================================
  async listPricingRules(companyId: string) {
    return (this.prisma as any).billingPricingRule.findMany({
      where: { OR: [{ companyId }, { companyId: null }] },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  // ============================================================
  // 40.3 — Multi-currency: store money as integers in minor units
  // ============================================================
  toMinorUnits(amount: number, currency: string): number {
    // Most currencies: 2 decimal places (paise, cents)
    // JPY, KRW: 0 decimal places
    const zeroDecimal = ['JPY', 'KRW', 'VND', 'UGX', 'RWF'];
    const decimals = zeroDecimal.includes(currency.toUpperCase()) ? 0 : 2;
    return Math.round(amount * Math.pow(10, decimals));
  }

  fromMinorUnits(amount: number, currency: string): number {
    const zeroDecimal = ['JPY', 'KRW', 'VND', 'UGX', 'RWF'];
    const decimals = zeroDecimal.includes(currency.toUpperCase()) ? 0 : 2;
    return amount / Math.pow(10, decimals);
  }

  // ============================================================
  // 40.4 — Usage aggregation → Invoice generation pipeline
  // ============================================================
  async aggregateUsage(companyId: string, periodStart: Date, periodEnd: Date) {
    const [employeeCount, tripCount, totalKm, transportSpend] = await Promise.all([
      // Active employees in company
      (this.prisma as any).user.count({
        where: {
          companyId,
          status: 'ACTIVE',
          employeeProfile: { isNot: null },
        },
      }),
      // Completed trips in period
      (this.prisma as any).trip.count({
        where: {
          companyId,
          status: 'COMPLETED',
          completedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      // Total km
      (this.prisma as any).trip.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
          completedAt: { gte: periodStart, lte: periodEnd },
        },
        _sum: { distanceKm: true },
      }),
      // Total transport spend (from cost allocations)
      (this.prisma as any).trip.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
          completedAt: { gte: periodStart, lte: periodEnd },
        },
        _sum: { totalCost: true },
      }),
    ]);

    return {
      activeEmployees: employeeCount,
      tripsCompleted: tripCount,
      totalKm: Number(totalKm._sum?.distanceKm || 0),
      transportSpend: Number(transportSpend._sum?.totalCost || 0),
    };
  }

  async generateInvoice(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
    generatedByUserId: string,
  ) {
    // Idempotency check: (companyId, billingPeriod) uniqueness
    const existing = await (this.prisma as any).platformInvoice.findFirst({
      where: { companyId, billingPeriodStart: periodStart, billingPeriodEnd: periodEnd },
    });
    if (existing) {
      throw new BadRequestException(`Invoice already exists for this period: ${existing.invoiceNumber}`);
    }

    // Resolve pricing rule
    const rule = await this.resolvePricingRule(companyId);
    if (!rule) {
      throw new BadRequestException('No pricing rule configured for this company');
    }

    // Aggregate usage
    const usage = await this.aggregateUsage(companyId, periodStart, periodEnd);

    // Calculate based on pricing model
    const calc = await this.calculateAmount(rule, usage);
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const currency = rule.currency || company?.currency || 'INR';

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${companyId.slice(-6).toUpperCase()}`;

    const invoice = await (this.prisma as any).platformInvoice.create({
      data: {
        companyId,
        invoiceNumber,
        pricingRuleId: rule.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        currency,
        subtotal: calc.subtotal,
        taxAmount: calc.taxAmount,
        totalAmount: calc.subtotal + calc.taxAmount,
        status: 'DRAFT',
        usageSnapshot: usage,
        rateSnapshot: {
          pricingModel: rule.pricingModel,
          rateValue: rule.rateValue,
          tierConfig: rule.tierConfig,
          includedAllowance: rule.includedAllowance,
        },
      },
    });

    await this.audit.log({
      companyId,
      userId: generatedByUserId,
      action: 'PLATFORM_INVOICE_GENERATED',
      entity: 'PlatformInvoice',
      entityId: invoice.id,
      newValue: { invoiceNumber, totalAmount: calc.subtotal + calc.taxAmount, currency },
    });

    return invoice;
  }

  private async calculateAmount(rule: any, usage: any): Promise<{ subtotal: number; taxAmount: number }> {
    let subtotal = 0;

    switch (rule.pricingModel) {
      case 'PER_EMPLOYEE':
        subtotal = usage.activeEmployees * rule.rateValue;
        break;
      case 'PER_KM':
        subtotal = Math.round(usage.totalKm * rule.rateValue);
        break;
      case 'PER_TRIP':
        subtotal = usage.tripsCompleted * rule.rateValue;
        break;
      case 'PER_EMPLOYEE_PER_TRIP':
        subtotal = usage.activeEmployees * usage.tripsCompleted * rule.rateValue;
        break;
      case 'COMMISSION_PERCENT':
        subtotal = Math.round(usage.transportSpend * (rule.rateValue / 10000)); // rateValue in basis points
        break;
      case 'HYBRID': {
        const baseFee = rule.includedAllowance?.baseFee || 0;
        const includedEmployees = rule.includedAllowance?.includedEmployees || 0;
        const overageEmployees = Math.max(0, usage.activeEmployees - includedEmployees);
        subtotal = baseFee + overageEmployees * rule.rateValue;
        break;
      }
      default:
        subtotal = 0;
    }

    // Apply tiered pricing if configured
    if (rule.tierConfig && Array.isArray(rule.tierConfig)) {
      const metricValue = this.getMetricForModel(rule.pricingModel, usage);
      subtotal = this.applyTieredPricing(rule.tierConfig, metricValue);
    }

    // Resolve tax from TaxRuleDefinition (fallback to 18% GST)
    let taxRate = 0.18;
    try {
      const taxRules = await this.prisma.taxRuleDefinition.findMany({
        where: { countryCode: usage.countryCode || 'IN', isActive: true },
      });
      if (taxRules.length > 0) {
        // Use the first active tax rule for the country
        const taxRule = taxRules[0];
        taxRate = Number(taxRule.ratePercent) / 100;
      }
    } catch {
      // Fallback to default 18% if TaxRuleDefinition query fails
    }
    const taxAmount = Math.round(subtotal * taxRate);

    return { subtotal, taxAmount };
  }

  private getMetricForModel(model: string, usage: any): number {
    switch (model) {
      case 'PER_EMPLOYEE': return usage.activeEmployees;
      case 'PER_KM': return usage.totalKm;
      case 'PER_TRIP': return usage.tripsCompleted;
      default: return usage.activeEmployees;
    }
  }

  private applyTieredPricing(tiers: any[], metricValue: number): number {
    let total = 0;
    let remaining = metricValue;
    const sorted = [...tiers].sort((a, b) => (a.upTo || Infinity) - (b.upTo || Infinity));

    for (const tier of sorted) {
      const limit = tier.upTo ? Math.min(remaining, tier.upTo - (sorted.indexOf(tier) > 0 ? sorted[sorted.indexOf(tier) - 1].upTo || 0 : 0)) : remaining;
      if (limit <= 0) break;
      total += limit * tier.rate;
      remaining -= limit;
    }

    return total;
  }

  // ============================================================
  // 40.3 — Tax rule management
  // ============================================================
  async getTaxRules(countryCode: string) {
    return (this.prisma as any).taxRuleDefinition.findMany({
      where: {
        countryCode,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      orderBy: { taxType: 'asc' },
    });
  }

  async upsertTaxRule(data: {
    countryCode: string;
    taxName: string;
    taxType: string;
    ratePercent: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    setByUserId: string;
  }) {
    return (this.prisma as any).taxRuleDefinition.upsert({
      where: {
        countryCode_taxType_effectiveFrom: {
          countryCode: data.countryCode,
          taxType: data.taxType,
          effectiveFrom: data.effectiveFrom,
        },
      },
      update: { ratePercent: data.ratePercent, effectiveTo: data.effectiveTo },
      create: {
        countryCode: data.countryCode,
        taxName: data.taxName,
        taxType: data.taxType,
        ratePercent: data.ratePercent,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
      },
    });
  }

  // ============================================================
  // 40.4 — FX rate snapshot for consolidated reporting
  // ============================================================
  async getFxRate(baseCurrency: string, quoteCurrency: string, date?: Date) {
    const snapshotDate = date || new Date();
    return (this.prisma as any).fxRateSnapshot.findFirst({
      where: {
        baseCurrency,
        quoteCurrency,
        snapshotDate: { lte: snapshotDate },
      },
      orderBy: { snapshotDate: 'desc' },
    });
  }

  async storeFxRate(baseCurrency: string, quoteCurrency: string, rate: number, source: string, date: Date) {
    return (this.prisma as any).fxRateSnapshot.upsert({
      where: { snapshotDate: date },
      update: { rate, source, baseCurrency, quoteCurrency },
      create: { baseCurrency, quoteCurrency, rate, source, snapshotDate: date },
    });
  }

  // ============================================================
  // 40.5 — Billing anomaly detection (period-over-period spike)
  // ============================================================
  async detectAnomalies(companyId: string, currentPeriodStart: Date, currentPeriodEnd: Date) {
    const prevPeriodStart = new Date(currentPeriodStart);
    prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1);
    const prevPeriodEnd = new Date(currentPeriodStart);

    const [current, previous] = await Promise.all([
      this.aggregateUsage(companyId, currentPeriodStart, currentPeriodEnd),
      this.aggregateUsage(companyId, prevPeriodStart, prevPeriodEnd),
    ]);

    const anomalies: any[] = [];
    const threshold = 1.5; // 50% increase is suspicious

    for (const metric of ['activeEmployees', 'tripsCompleted', 'totalKm', 'transportSpend'] as const) {
      const currVal = current[metric];
      const prevVal = previous[metric];
      if (prevVal > 0 && currVal / prevVal > threshold) {
        anomalies.push({
          metric,
          currentValue: currVal,
          previousValue: prevVal,
          ratio: Number((currVal / prevVal).toFixed(2)),
          severity: currVal / prevVal > 3 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      currentPeriod: { start: currentPeriodStart, end: currentPeriodEnd, usage: current },
      previousPeriod: { start: prevPeriodStart, end: prevPeriodEnd, usage: previous },
    };
  }

  // ============================================================
  // Usage metering — record metric snapshots
  // ============================================================
  async recordUsage(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
    metricType: string,
    metricValue: number,
  ) {
    return (this.prisma as any).usageMeteringRecord.upsert({
      where: {
        companyId_billingPeriodStart_metricType: {
          companyId,
          billingPeriodStart: periodStart,
          metricType,
        },
      },
      update: { metricValue, billingPeriodEnd: periodEnd },
      create: {
        companyId,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        metricType,
        metricValue,
      },
    });
  }
}
