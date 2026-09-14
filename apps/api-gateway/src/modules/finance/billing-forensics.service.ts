import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BillingForensicsService {
  private readonly logger = new Logger(BillingForensicsService.name);
  constructor(private prisma: PrismaService) {}

  async detectBillingAnomalies(companyId: string) {
    const invoices = await (this.prisma as any).vendorInvoice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const anomalies: any[] = [];

    for (const invoice of invoices) {
      // 1. Duplicate invoice detection
      const dupes = await (this.prisma as any).vendorInvoice.findMany({
        where: { companyId, vendorId: (invoice as any).vendorId, amount: (invoice as any).amount, id: { not: (invoice as any).id } },
      });
      if (dupes.length > 0) {
        anomalies.push({ invoiceId: (invoice as any).id, type: 'DUPLICATE_INVOICE', severity: 'HIGH', details: `${dupes.length} similar invoices found` });
      }

      // 2. Phantom trip detection (invoice without matching trip)
      if ((invoice as any).tripId) {
        const trip = await (this.prisma as any).trip.findUnique({ where: { id: (invoice as any).tripId } });
        if (!trip) {
          anomalies.push({ invoiceId: (invoice as any).id, type: 'PHANTOM_TRIP', severity: 'CRITICAL', details: `Invoice references non-existent trip ${(invoice as any).tripId}` });
        }
      }

      // 3. Inflated km detection
      if ((invoice as any).distanceKm && (invoice as any).tripId) {
        const trip = await (this.prisma as any).trip.findUnique({ where: { id: (invoice as any).tripId } });
        if (trip && (trip as any).totalDistanceKm) {
          const diff = Math.abs((invoice as any).distanceKm - (trip as any).totalDistanceKm);
          if (diff > (trip as any).totalDistanceKm * 0.2) {
            anomalies.push({ invoiceId: (invoice as any).id, type: 'INFLATED_DISTANCE', severity: 'HIGH', details: `Invoiced ${(invoice as any).distanceKm}km vs actual ${(trip as any).totalDistanceKm}km (diff: ${Math.round(diff)}km)` });
          }
        }
      }
    }

    return { totalChecked: invoices.length, anomaliesFound: anomalies.length, anomalies };
  }

  async verifyGSTCalculations(companyId: string) {
    const costs = await (this.prisma as any).tripCost.findMany({ where: { companyId } });
    const issues: any[] = [];

    for (const cost of costs) {
      const expectedCgst = ((cost as any).totalBeforeTax || 0) * 0.09;
      const diff = Math.abs(((cost as any).gstCgst || 0) - expectedCgst);
      if (diff > 1) {
        issues.push({ tripId: (cost as any).tripId, type: 'GST_MISMATCH', expected: expectedCgst, actual: (cost as any).gstCgst, diff });
      }
    }

    return { totalChecked: costs.length, issues: issues.length, details: issues };
  }

  async generateForensicReport(companyId: string, period: { start: Date; end: Date }) {
    const anomalies = await this.detectBillingAnomalies(companyId);
    const gst = await this.verifyGSTCalculations(companyId);

    return {
      period,
      summary: {
        totalInvoicesChecked: anomalies.totalChecked,
        anomaliesFound: anomalies.anomaliesFound,
        gstIssues: gst.issues,
        riskScore: anomalies.anomaliesFound > 10 ? 'HIGH' : anomalies.anomaliesFound > 3 ? 'MEDIUM' : 'LOW',
      },
      anomalies: anomalies.anomalies,
      gstIssues: gst.details,
      recommendations: anomalies.anomaliesFound > 5
        ? ['Immediate vendor billing audit recommended', 'Consider suspending auto-approval for affected vendors', 'Review rate card compliance']
        : ['Billing within normal parameters'],
    };
  }
}
