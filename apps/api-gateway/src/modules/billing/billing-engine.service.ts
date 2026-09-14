import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export enum BillingModel {
  PER_KM = 'PER_KM',
  PER_TRIP = 'PER_TRIP',
  PER_PASSENGER = 'PER_PASSENGER',
  MONTHLY_FIXED = 'MONTHLY_FIXED',
  TIERED = 'TIERED',
  DYNAMIC = 'DYNAMIC',
}

export interface TripCostCalculation {
  tripId: string;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  waitingCharge: number;
  tollCharge: number;
  parkingCharge: number;
  nightCharge: number;
  emergencySurcharge: number;
  guardCharge: number;
  taxAmount: number;
  totalBeforeTax: number;
  totalWithTax: number;
  gstCgst: number;
  gstSgst: number;
  gstIgst: number;
  rateCardVersion: string;
  billingModel: BillingModel;
}

export interface CreateRateCardVersionData {
  companyId: string;
  name: string;
  vehicleType: string;
  acType: string;
  fuelType: string;
  billingModel: BillingModel;
  ratePerKm: number;
  baseFare: number;
  waitingRatePerMinute: number;
  minimumKilometres: number;
  nightChargeRate: number;
  emergencySurcharge: number;
  guardCharge: number;
  tiers?: any[];
  effectiveFrom: Date;
  createdBy: string;
}

export interface SubmitMakerCheckerData {
  companyId: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, any>;
  submittedBy: string;
}

export interface ApproveMakerCheckerData {
  auditLogId: string;
  companyId: string;
  approvedBy: string;
  approved: boolean;
  notes?: string;
}

export interface BudgetVsActualPeriod {
  start: Date;
  end: Date;
}

@Injectable()
export class BillingEngineService {
  private readonly logger = new Logger(BillingEngineService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 1. TRIP COST CALCULATION
  // ============================================================
  async calculateTripCost(tripId: string): Promise<TripCostCalculation> {
    const trip = await (this.prisma as any).trip.findUnique({
      where: { id: tripId },
      include: {
        passengers: true,
        company: { select: { id: true, gstin: true, stateCode: true } },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const rateCard = await this.getApplicableRateCard(trip.companyId, trip);
    if (!rateCard) throw new BadRequestException('No rate card configured');

    // Calculate distance (use trip distance or Haversine)
    const distanceKm = (trip as any).totalDistanceKm || 0;
    const durationMinutes = (trip as any).totalDurationMinutes || 0;

    // Calculate each component based on billing model
    const billingModel = (rateCard as any).billingModel || BillingModel.PER_KM;

    let baseFare = 0;
    let distanceCharge = 0;
    let timeCharge = 0;

    switch (billingModel) {
      case BillingModel.PER_KM:
        baseFare = (rateCard as any).baseFare || 0;
        distanceCharge = distanceKm * ((rateCard as any).ratePerKm || 0);
        timeCharge = durationMinutes * ((rateCard as any).ratePerMinute || 0);
        break;

      case BillingModel.PER_TRIP:
        baseFare = (rateCard as any).flatRatePerTrip || 0;
        break;

      case BillingModel.PER_PASSENGER:
        baseFare = trip.passengers.length * ((rateCard as any).ratePerPassenger || 0);
        distanceCharge = distanceKm * ((rateCard as any).ratePerKm || 0);
        break;

      case BillingModel.MONTHLY_FIXED:
        baseFare = (rateCard as any).monthlyFixedRate || 0;
        break;

      case BillingModel.TIERED:
        const tiers = (rateCard as any).tiers || [];
        let remaining = distanceKm;
        for (const tier of tiers) {
          const tierKm = Math.min(remaining, tier.endKm - tier.startKm);
          distanceCharge += tierKm * tier.ratePerKm;
          remaining -= tierKm;
          if (remaining <= 0) break;
        }
        baseFare = (rateCard as any).baseFare || 0;
        break;

      case BillingModel.DYNAMIC: {
        baseFare = (rateCard as any).baseFare || 0;
        const surge = (rateCard as any).surgeMultiplier || 1.0;
        distanceCharge = distanceKm * ((rateCard as any).ratePerKm || 0) * surge;
        break;
      }
    }

    // Additional charges
    const waitingCharge = ((trip as any).waitingMinutes || 0) * ((rateCard as any).waitingRatePerMinute || 0);
    const tollCharge = (trip as any).tollCharges || 0;
    const parkingCharge = (trip as any).parkingCharges || 0;
    const nightCharge = this.calculateNightCharge(trip, rateCard);
    const emergencySurcharge = (trip as any).transportType === 'EMERGENCY' ? ((rateCard as any).emergencySurcharge || 0) : 0;
    const guardCharge = (trip as any).guardRequired ? ((rateCard as any).guardCharge || 0) : 0;

    // Minimum kilometres
    const minKm = (rateCard as any).minimumKilometres || 0;
    const effectiveDistance = Math.max(distanceKm, minKm);
    const adjustedDistanceCharge = effectiveDistance * ((rateCard as any).ratePerKm || 0);

    // Subtotal
    const totalBeforeTax = baseFare + adjustedDistanceCharge + timeCharge + waitingCharge + tollCharge + parkingCharge + nightCharge + emergencySurcharge + guardCharge;

    // GST Calculation
    const gst = this.calculateGST(totalBeforeTax, trip.company);

    const calculation: TripCostCalculation = {
      tripId,
      baseFare,
      distanceCharge: adjustedDistanceCharge,
      timeCharge,
      waitingCharge,
      tollCharge,
      parkingCharge,
      nightCharge,
      emergencySurcharge,
      guardCharge,
      taxAmount: gst.total,
      totalBeforeTax,
      totalWithTax: totalBeforeTax + gst.total,
      gstCgst: gst.cgst,
      gstSgst: gst.sgst,
      gstIgst: gst.igst,
      rateCardVersion: (rateCard as any).version || '1.0',
      billingModel,
    };

    // Save cost to trip
    await (this.prisma as any).tripCost.upsert({
      where: { tripId },
      create: {
        tripId,
        companyId: trip.companyId,
        baseFare,
        distanceCharge: adjustedDistanceCharge,
        timeCharge,
        waitingCharge,
        tollCharge,
        parkingCharge,
        nightCharge,
        emergencySurcharge,
        guardCharge,
        taxAmount: gst.total,
        totalBeforeTax,
        totalWithTax: totalBeforeTax + gst.total,
        rateCardVersion: (rateCard as any).version || '1.0',
        calculatedAt: new Date(),
      },
      update: {
        baseFare,
        distanceCharge: adjustedDistanceCharge,
        timeCharge,
        waitingCharge,
        tollCharge,
        parkingCharge,
        nightCharge,
        emergencySurcharge,
        guardCharge,
        taxAmount: gst.total,
        totalBeforeTax,
        totalWithTax: totalBeforeTax + gst.total,
        rateCardVersion: (rateCard as any).version || '1.0',
        calculatedAt: new Date(),
      },
    });

    return calculation;
  }

  // ============================================================
  // 2. RATE CARD VERSIONING
  // ============================================================
  async createRateCardVersion(data: CreateRateCardVersionData) {
    // Get current version number
    const existing = await (this.prisma as any).rateCard.findMany({
      where: { companyId: data.companyId },
      orderBy: { createdAt: 'desc' },
    });

    const currentVersion = existing.length > 0 ? parseFloat((existing[0] as any).version || '0') + 1 : 1;

    // Deactivate old versions for same vehicle type
    await (this.prisma as any).rateCard.updateMany({
      where: {
        companyId: data.companyId,
        vehicleType: data.vehicleType,
        isActive: true,
      },
      data: { isActive: false, deactivatedAt: new Date() },
    });

    const newCard = await (this.prisma as any).rateCard.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        vehicleType: data.vehicleType,
        acType: data.acType,
        fuelType: data.fuelType,
        billingModel: data.billingModel,
        ratePerKm: data.ratePerKm,
        baseFare: data.baseFare,
        waitingRatePerMinute: data.waitingRatePerMinute,
        minimumKilometres: data.minimumKilometres,
        nightChargeRate: data.nightChargeRate,
        emergencySurcharge: data.emergencySurcharge,
        guardCharge: data.guardCharge,
        isActive: true,
        version: currentVersion.toString(),
        effectiveFrom: data.effectiveFrom,
        createdBy: data.createdBy,
        createdAt: new Date(),
      } as any,
    });

    // Audit
    await (this.prisma as any).auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.createdBy,
        action: 'RATE_CARD_VERSION_CREATED',
        resourceType: 'RATE_CARD',
        resourceId: (newCard as any).id,
        details: JSON.stringify({ version: currentVersion, vehicleType: data.vehicleType }),
        createdAt: new Date(),
      },
    });

    return newCard;
  }

  // ============================================================
  // 3. BUDGET VS ACTUAL
  // ============================================================
  async getBudgetVsActual(companyId: string, period: BudgetVsActualPeriod) {
    const budgets = await (this.prisma as any).budgetAllocation.findMany({
      where: {
        companyId,
        periodStart: { lte: period.end },
        periodEnd: { gte: period.start },
      },
    });

    const results = [];
    for (const budget of budgets) {
      const actualTrips = await (this.prisma as any).tripCost.findMany({
        where: {
          companyId,
          calculatedAt: { gte: period.start, lte: period.end },
          trip: {
            departmentId: (budget as any).departmentId || undefined,
            lobId: (budget as any).lobId || undefined,
          },
        },
      });

      const totalActual = actualTrips.reduce((sum: any, t: any) => sum + ((t as any).totalWithTax || 0), 0);
      const budgeted = (budget as any).allocatedAmount || 0;
      const variance = totalActual - budgeted;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      results.push({
        budgetId: (budget as any).id,
        department: (budget as any).departmentId,
        lob: (budget as any).lobId,
        budgeted,
        actual: totalActual,
        variance,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status: variancePercent > 10 ? 'OVER_BUDGET' : variancePercent > 0 ? 'WARNING' : 'ON_TRACK',
        tripCount: actualTrips.length,
      });
    }

    return {
      period: { start: period.start.toISOString(), end: period.end.toISOString() },
      breakdowns: results,
      totalBudgeted: results.reduce((s, r) => s + r.budgeted, 0),
      totalActual: results.reduce((s, r) => s + r.actual, 0),
    };
  }

  // ============================================================
  // 4. MAKER-CHECKER (Dual approval for billing changes)
  // ============================================================
  async submitForMakerChecker(data: SubmitMakerCheckerData) {
    const auditLog = await (this.prisma as any).auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.submittedBy,
        action: 'MAKER_CHECKER_SUBMITTED',
        resourceType: data.entityType,
        resourceId: data.entityId,
        details: JSON.stringify({
          action: data.action,
          changes: data.changes,
          status: 'PENDING_CHECKER',
          submittedAt: new Date().toISOString(),
        }),
        createdAt: new Date(),
      },
    });

    return {
      id: (auditLog as any).id,
      status: 'PENDING_CHECKER',
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      submittedBy: data.submittedBy,
      submittedAt: new Date(),
    };
  }

  async approveMakerChecker(data: ApproveMakerCheckerData) {
    const status = data.approved ? 'CHECKER_APPROVED' : 'CHECKER_REJECTED';
    await (this.prisma as any).auditLog.update({
      where: { id: data.auditLogId },
      data: {
        details: JSON.stringify({
          ...JSON.parse((await (this.prisma as any).auditLog.findUnique({ where: { id: data.auditLogId } }))?.details || '{}'),
          status,
          approvedBy: data.approvedBy,
          approvedAt: new Date().toISOString(),
          notes: data.notes,
        }),
      },
    });

    await (this.prisma as any).auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.approvedBy,
        action: `MAKER_CHECKER_${status}`,
        resourceType: 'BILLING',
        resourceId: data.auditLogId,
        details: JSON.stringify({ notes: data.notes }),
        createdAt: new Date(),
      },
    });

    return { status, approvedBy: data.approvedBy };
  }

  // ============================================================
  // 5. INVOICE ANOMALY DETECTION
  // ============================================================
  async detectInvoiceAnomalies(companyId: string) {
    const invoices = await (this.prisma as any).vendorInvoice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const anomalies = [];
    for (const invoice of invoices) {
      // Check: invoice amount vs calculated trip costs
      const tripCosts = await (this.prisma as any).tripCost.findMany({
        where: {
          companyId,
          trip: {
            driverId: (invoice as any).driverId || undefined,
            vehicleId: (invoice as any).vehicleId || undefined,
          },
          calculatedAt: {
            gte: (invoice as any).periodStart,
            lte: (invoice as any).periodEnd,
          },
        },
      });

      const calculatedTotal = tripCosts.reduce((s: any, t: any) => s + ((t as any).totalWithTax || 0), 0);
      const invoicedAmount = (invoice as any).amount || 0;
      const discrepancy = invoicedAmount - calculatedTotal;
      const discrepancyPercent = calculatedTotal > 0 ? (discrepancy / calculatedTotal) * 100 : 0;

      if (Math.abs(discrepancyPercent) > 5) {
        anomalies.push({
          invoiceId: (invoice as any).id,
          vendorId: (invoice as any).vendorId,
          invoicedAmount,
          calculatedAmount: calculatedTotal,
          discrepancy,
          discrepancyPercent: Math.round(discrepancyPercent * 100) / 100,
          type: discrepancy > 0 ? 'OVERCHARGED' : 'UNDERCHARGED',
          severity: Math.abs(discrepancyPercent) > 15 ? 'HIGH' : 'MEDIUM',
        });
      }

      // Check for duplicate invoices
      const duplicates = await (this.prisma as any).vendorInvoice.findMany({
        where: {
          companyId,
          vendorId: (invoice as any).vendorId,
          amount: (invoice as any).amount,
          id: { not: (invoice as any).id },
        },
      });
      if (duplicates.length > 0) {
        anomalies.push({
          invoiceId: (invoice as any).id,
          type: 'DUPLICATE_SUSPECT',
          severity: 'HIGH',
          duplicateCount: duplicates.length,
        });
      }
    }

    return { anomalies, totalChecked: invoices.length };
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private async getApplicableRateCard(companyId: string, trip: any) {
    return this.prisma.rateCard.findFirst({
      where: {
        companyId,
        isActive: true,
        vehicleType: trip.vehicleType || 'SEDAN',
      },
      orderBy: { createdAt: 'desc' },
    } as any);
  }

  private calculateNightCharge(trip: any, rateCard: any): number {
    if (!trip.startTime) return 0;
    const hour = new Date(trip.startTime).getHours();
    const isNight = hour >= 22 || hour < 6;
    if (!isNight) return 0;
    return (rateCard as any).nightChargeRate || 0;
  }

  private calculateGST(amount: number, company: any): { cgst: number; sgst: number; igst: number; total: number } {
    const gstRate = 0.18; // 18% GST
    const totalTax = amount * gstRate;

    // Intra-state: CGST + SGST; Inter-state: IGST
    if (company?.stateCode === '27') { // Maharashtra (example)
      return {
        cgst: totalTax / 2,
        sgst: totalTax / 2,
        igst: 0,
        total: totalTax,
      };
    }

    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      total: totalTax,
    };
  }
}
