import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface VendorTruthReport {
  vendorId: string;
  vendorName: string;
  period: { from: Date; to: Date };
  contractedRates: any;
  actualMetrics: VendorActualMetrics;
  discrepancies: VendorDiscrepancyDetail[];
  totalAmountAtRisk: number;
  complianceScore: number;
}

export interface VendorActualMetrics {
  totalTrips: number;
  completedTrips: number;
  gpsVerifiedKm: number;
  invoicedKm: number;
  actualDuration: number;
  invoicedDuration: number;
  vehicleUtilization: number;
  driverAvailability: number;
  totalInvoiced: number;
  gpsBasedCost: number;
}

export interface VendorDiscrepancyDetail {
  type: string;
  contractedValue: number;
  actualValue: number;
  variancePercent: number;
  amountAtRisk: number;
  evidence: any;
}

@Injectable()
export class VendorTruthService {
  private readonly logger = new Logger(VendorTruthService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getVendorTruthReport(companyId: string, vendorId: string, from?: Date, to?: Date) {
    const vendor = await (this.prisma as any).vendorManagement.findFirst({
      where: { id: vendorId, companyId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const periodFrom = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodTo = to || new Date();

    // Get contracted rates
    const rateCards = await (this.prisma as any).rateCard.findMany({
      where: { companyId, vendorId },
    });

    // Get actual trip data
    const trips = await (this.prisma as any).trip.findMany({
      where: {
        companyId,
        vendorId,
        createdAt: { gte: periodFrom, lte: periodTo },
        status: 'COMPLETED',
      },
      include: { GPSLog: { orderBy: { recordedAt: 'asc' } } },
    });

    // Get invoices
    const invoices = await (this.prisma as any).vendorInvoice.findMany({
      where: {
        companyId,
        vendorId,
        createdAt: { gte: periodFrom, lte: periodTo },
      },
    });

    // Calculate actual metrics
    const actualMetrics = this.calculateActualMetrics(trips, invoices);

    // Compare with contracted rates
    const discrepancies = this.compareWithContract(rateCards, actualMetrics, trips);

    const totalAmountAtRisk = discrepancies.reduce((sum, d) => sum + d.amountAtRisk, 0);
    const complianceScore = this.calculateComplianceScore(discrepancies, actualMetrics);

    return {
      vendorId,
      vendorName: vendor.name || vendorId,
      period: { from: periodFrom, to: periodTo },
      contractedRates: rateCards,
      actualMetrics,
      discrepancies,
      totalAmountAtRisk: Math.round(totalAmountAtRisk),
      complianceScore: Math.round(complianceScore),
    };
  }

  async getVendorDiscrepancies(companyId: string, vendorId: string) {
    return (this.prisma as any).vendorDiscrepancy.findMany({
      where: { companyId, vendorId },
      orderBy: { amountAtRisk: 'desc' },
    });
  }

  async getAllVendorTruthSummaries(companyId: string) {
    const vendors = await (this.prisma as any).vendorManagement.findMany({
      where: { companyId },
    });

    const summaries = [];
    for (const vendor of vendors) {
      const discrepancies = await (this.prisma as any).vendorDiscrepancy.findMany({
        where: { companyId, vendorId: vendor.id, status: { not: 'RESOLVED' } },
      });

      const totalAtRisk = discrepancies.reduce((sum: number, d: any) => sum + (d.amountAtRisk || 0), 0);

      summaries.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        openDiscrepancies: discrepancies.length,
        totalAmountAtRisk: Math.round(totalAtRisk),
        topDiscrepancyType: discrepancies.length > 0 ? discrepancies[0].type : null,
      });
    }

    return summaries.sort((a, b) => b.totalAmountAtRisk - a.totalAmountAtRisk);
  }

  async createDiscrepancy(companyId: string, dto: {
    vendorId: string;
    tripId?: string;
    invoiceId?: string;
    type: string;
    contractedValue: number;
    actualValue: number;
    amountAtRisk: number;
    evidence?: any;
  }) {
    const variancePercent = dto.contractedValue > 0
      ? ((dto.actualValue - dto.contractedValue) / dto.contractedValue) * 100
      : 0;

    return (this.prisma as any).vendorDiscrepancy.create({
      data: {
        companyId,
        vendorId: dto.vendorId,
        tripId: dto.tripId,
        invoiceId: dto.invoiceId,
        type: dto.type,
        contractedValue: dto.contractedValue,
        actualValue: dto.actualValue,
        variancePercent: Math.round(variancePercent * 100) / 100,
        amountAtRisk: dto.amountAtRisk,
        evidence: dto.evidence || {},
        status: 'DETECTED',
      },
    });
  }

  async reviewDiscrepancy(companyId: string, discrepancyId: string, userId: string, status: string) {
    const disc = await (this.prisma as any).vendorDiscrepancy.findFirst({
      where: { id: discrepancyId, companyId },
    });
    if (!disc) throw new NotFoundException('Discrepancy not found');

    await (this.prisma as any).vendorDiscrepancy.update({
      where: { id: discrepancyId },
      data: { status, reviewedBy: userId, reviewedAt: new Date() },
    });

    await this.audit.log({
      userId, action: 'VENDOR_DISCREPANCY_REVIEWED', entity: 'VendorDiscrepancy',
      entityId: discrepancyId, companyId, newValue: { status },
    });

    return { success: true };
  }

  private calculateActualMetrics(trips: any[], invoices: any[]): VendorActualMetrics {
    const totalTrips = trips.length;
    const completedTrips = trips.filter((t) => t.status === 'COMPLETED').length;

    // Calculate GPS-verified KM from GPS logs
    let gpsVerifiedKm = 0;
    for (const trip of trips) {
      const logs = trip.GPSLog || [];
      for (let i = 1; i < logs.length; i++) {
        gpsVerifiedKm += this.haversine(
          logs[i - 1].latitude, logs[i - 1].longitude,
          logs[i].latitude, logs[i].longitude,
        );
      }
    }

    const invoicedKm = invoices.reduce((sum, inv) => sum + ((inv as any).totalKm || 0), 0);
    const actualDuration = trips.reduce((sum, t) => {
      if (t.actualPickupTime && t.actualDropTime) {
        return sum + (new Date(t.actualDropTime).getTime() - new Date(t.actualPickupTime).getTime()) / 60000;
      }
      return sum;
    }, 0);
    const invoicedDuration = invoices.reduce((sum, inv) => sum + ((inv as any).totalDuration || 0), 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + ((inv as any).totalAmount || 0), 0);

    const gpsBasedCost = gpsVerifiedKm * 18; // Rs.18/km average

    return {
      totalTrips,
      completedTrips,
      gpsVerifiedKm: Math.round(gpsVerifiedKm * 100) / 100,
      invoicedKm,
      actualDuration: Math.round(actualDuration),
      invoicedDuration,
      vehicleUtilization: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
      driverAvailability: 95, // Would compute from driver availability data
      totalInvoiced,
      gpsBasedCost: Math.round(gpsBasedCost),
    };
  }

  private compareWithContract(rateCards: any[], actual: VendorActualMetrics, trips: any[]): VendorDiscrepancyDetail[] {
    const discrepancies: VendorDiscrepancyDetail[] = [];

    // KM Variance
    if (actual.invoicedKm > 0) {
      const kmVariance = ((actual.invoicedKm - actual.gpsVerifiedKm) / actual.invoicedKm) * 100;
      if (Math.abs(kmVariance) > 5) {
        const kmAtRisk = (actual.invoicedKm - actual.gpsVerifiedKm) * 18;
        discrepancies.push({
          type: 'KM_VARIANCE',
          contractedValue: actual.gpsVerifiedKm,
          actualValue: actual.invoicedKm,
          variancePercent: Math.round(kmVariance * 100) / 100,
          amountAtRisk: Math.round(Math.max(0, kmAtRisk)),
          evidence: { gpsKm: actual.gpsVerifiedKm, invoicedKm: actual.invoicedKm },
        });
      }
    }

    // Duration Variance
    if (actual.invoicedDuration > 0) {
      const durationVariance = ((actual.invoicedDuration - actual.actualDuration) / actual.invoicedDuration) * 100;
      if (Math.abs(durationVariance) > 10) {
        discrepancies.push({
          type: 'DURATION_VARIANCE',
          contractedValue: actual.actualDuration,
          actualValue: actual.invoicedDuration,
          variancePercent: Math.round(durationVariance * 100) / 100,
          amountAtRisk: Math.round(Math.max(0, (actual.invoicedDuration - actual.actualDuration) * 2.5)),
          evidence: { actualMinutes: actual.actualDuration, invoicedMinutes: actual.invoicedDuration },
        });
      }
    }

    // Invoice Variance
    if (actual.totalInvoiced > 0) {
      const invoiceVariance = ((actual.totalInvoiced - actual.gpsBasedCost) / actual.totalInvoiced) * 100;
      if (Math.abs(invoiceVariance) > 5) {
        discrepancies.push({
          type: 'INVOICE_VARIANCE',
          contractedValue: actual.gpsBasedCost,
          actualValue: actual.totalInvoiced,
          variancePercent: Math.round(invoiceVariance * 100) / 100,
          amountAtRisk: Math.round(Math.max(0, actual.totalInvoiced - actual.gpsBasedCost)),
          evidence: { gpsBasedCost: actual.gpsBasedCost, invoicedAmount: actual.totalInvoiced },
        });
      }
    }

    return discrepancies;
  }

  private calculateComplianceScore(discrepancies: VendorDiscrepancyDetail[], actual: VendorActualMetrics): number {
    let score = 100;

    for (const disc of discrepancies) {
      if (Math.abs(disc.variancePercent) > 20) score -= 20;
      else if (Math.abs(disc.variancePercent) > 10) score -= 10;
      else if (Math.abs(disc.variancePercent) > 5) score -= 5;
    }

    if (actual.completedTrips < actual.totalTrips * 0.9) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
