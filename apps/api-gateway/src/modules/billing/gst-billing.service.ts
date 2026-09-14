import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class GSTService {
  private readonly logger = new Logger(GSTService.name);

  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async calculateGST(companyId: string, amount: number, gstRate?: number) {
    const rate = gstRate || 18;
    const gstAmount = Math.round(amount * rate / 100 * 100) / 100;
    const cgst = Math.round(gstAmount / 2 * 100) / 100;
    const sgst = Math.round(gstAmount / 2 * 100) / 100;
    return { amount, gstRate: rate, gstAmount, cgst, sgst, totalWithGST: Math.round((amount + gstAmount) * 100) / 100 };
  }

  async getGSTSummary(companyId: string, params: { period?: string }) {
    const invoices = await this.prisma.vendorInvoice.findMany({
      where: { companyId, status: 'PAID' } as any,
    });

    const totalTaxable = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalGST = Math.round(totalTaxable * 0.18 * 100) / 100;

    return {
      totalTaxable, totalGST, cgst: totalGST / 2, sgst: totalGST / 2,
      invoiceCount: invoices.length,
      period: params.period || 'all',
    };
  }
}

@Injectable()
export class BillingModelService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private models = [
    { id: 'per_trip', name: 'Per Trip', description: 'Fixed cost per trip' },
    { id: 'per_km', name: 'Per Kilometer', description: 'Distance-based pricing' },
    { id: 'per_hour', name: 'Per Hour', description: 'Time-based pricing' },
    { id: 'monthly_fixed', name: 'Monthly Fixed', description: 'Fixed monthly fee' },
    { id: 'package', name: 'Package', description: 'Predefined package pricing' },
    { id: 'dynamic', name: 'Dynamic', description: 'Demand-based pricing' },
  ];

  async getBillingModels() {
    return this.models;
  }

  async calculateTripCost(companyId: string, model: string, data: any) {
    switch (model) {
      case 'per_trip': return { cost: data.baseFare || 500, model };
      case 'per_km': return { cost: (data.distanceKm || 0) * (data.ratePerKm || 15), model };
      case 'per_hour': return { cost: (data.hours || 0) * (data.ratePerHour || 200), model };
      case 'monthly_fixed': return { cost: data.monthlyFee || 50000, model };
      case 'package': return { cost: data.packageCost || 25000, model };
      case 'dynamic': {
        const base = (data.distanceKm || 0) * (data.ratePerKm || 15);
        const peak = data.isPeakHour ? 1.5 : 1;
        const night = data.isNightShift ? 1.25 : 1;
        return { cost: Math.round(base * peak * night), model, multiplier: peak * night };
      }
      default: return { cost: 0, model: 'unknown' };
    }
  }

  async getBudgetVsActual(companyId: string) {
    const invoices = await this.prisma.vendorInvoice.findMany({ where: { companyId } as any });
    const totalActual = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    return {
      budgeted: totalActual * 1.1,
      actual: totalActual,
      variance: totalActual * 0.1,
      variancePercent: 10,
    };
  }
}
