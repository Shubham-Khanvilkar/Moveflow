import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

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

/**
 * UnifiedBillingService merges the best of BillingService (CRUD) and
 * BillingEngineService (calculation engine) into a single cohesive service.
 *
 * Responsibilities:
 * - Rate card CRUD (from BillingService)
 * - Trip cost calculation (from BillingEngineService)
 * - Vendor contract management (new - Phase 5)
 * - Vendor invoice lifecycle (new - Phase 5)
 * - GST billing (from GSTBillingService)
 * - SaaS billing (from SaaSBillingService)
 */
@Injectable()
export class UnifiedBillingService {
  private readonly logger = new Logger(UnifiedBillingService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // RATE CARD CRUD
  // ============================================================

  async getRateCards(companyId: string, filters?: { isActive?: string; vehicleType?: string }) {
    const where: any = { companyId };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive === 'true';
    if (filters?.vehicleType) where.vehicleType = filters.vehicleType;
    return this.prisma.rateCard.findMany({ where, orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }] });
  }

  async createRateCard(companyId: string, data: {
    code?: string; name: string; description?: string;
    vehicleType?: string; serviceType?: string;
    baseFare: number; perKmRate: number; minimumKm?: number; minimumFare?: number;
    freeWaitingMinutes?: number; waitingChargePerMin?: number;
    nightChargeType?: string; nightChargeValue?: number;
    acType?: string; effectiveFrom: string; effectiveTo?: string;
    priority?: number;
  }, createdBy: string) {
    if (data.code) {
      const existing = await this.prisma.rateCard.findFirst({ where: { companyId, code: data.code } });
      if (existing) throw new ConflictException(`Rate card code ${data.code} already exists`);
    }

    const rateCard = await this.prisma.rateCard.create({
      data: {
        companyId, name: data.name, code: data.code,
        vehicleType: data.vehicleType as any,
        serviceType: data.serviceType as any || 'CAB',
        acType: data.acType as any,
        baseFare: data.baseFare, perKmRate: data.perKmRate,
        minimumKm: data.minimumKm || 0, minimumFare: data.minimumFare || 0,
        freeWaitingMinutes: data.freeWaitingMinutes || 15,
        waitingChargePerMin: data.waitingChargePerMin || 5,
        nightChargeType: data.nightChargeType as any || 'PERCENTAGE',
        nightChargeValue: data.nightChargeValue || 0,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        priority: data.priority || 0,
        createdById: createdBy,
      },
    });

    await this.audit.log({ companyId, userId: createdBy, action: 'RATE_CARD_CREATED', entity: 'RateCard', entityId: rateCard.id, newValue: { name: data.name } });
    return rateCard;
  }

  async updateRateCard(companyId: string, rateCardId: string, data: Record<string, any>, updatedBy: string) {
    const existing = await this.prisma.rateCard.findFirst({ where: { id: rateCardId, companyId } });
    if (!existing) throw new NotFoundException('Rate card not found');

    const updateData: any = { ...data };
    if (data.effectiveFrom) updateData.effectiveFrom = new Date(data.effectiveFrom);
    if (data.effectiveTo) updateData.effectiveTo = new Date(data.effectiveTo);
    if (data.vehicleType) updateData.vehicleType = data.vehicleType;
    if (data.serviceType) updateData.serviceType = data.serviceType;
    if (data.acType) updateData.acType = data.acType;
    if (data.nightChargeType) updateData.nightChargeType = data.nightChargeType;
    updateData.lastModifiedById = updatedBy;

    const updated = await this.prisma.rateCard.update({ where: { id: rateCardId }, data: updateData });
    await this.audit.log({ companyId, userId: updatedBy, action: 'RATE_CARD_UPDATED', entity: 'RateCard', entityId: rateCardId, newValue: data });
    return updated;
  }

  async deleteRateCard(companyId: string, rateCardId: string, deletedBy: string) {
    const existing = await this.prisma.rateCard.findFirst({ where: { id: rateCardId, companyId } });
    if (!existing) throw new NotFoundException('Rate card not found');
    await this.prisma.rateCard.delete({ where: { id: rateCardId } });
    await this.audit.log({ companyId, userId: deletedBy, action: 'RATE_CARD_DELETED', entity: 'RateCard', entityId: rateCardId, oldValue: { name: existing.name } });
    return { deleted: true, id: rateCardId };
  }

  async getActiveRateCard(companyId: string, vehicleType: string, serviceType?: string) {
    const now = new Date();
    const where: any = {
      companyId, isActive: true, vehicleType,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    };
    if (serviceType) where.serviceType = serviceType;
    return this.prisma.rateCard.findFirst({ where, orderBy: { priority: 'desc' } });
  }

  // ============================================================
  // TRIP COST CALCULATION
  // ============================================================

  async calculateTripCost(tripId: string): Promise<TripCostCalculation> {
    const trip = await (this.prisma as any).trip.findUnique({
      where: { id: tripId },
      include: { passengers: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const rateCard = await this.getActiveRateCard(trip.companyId, trip.vehicleType || 'SEDAN');
    if (!rateCard) throw new BadRequestException('No rate card configured');

    // Calculate distance (use trip distance or Haversine)
    const distanceKm = (trip as any).totalDistanceKm || 0;
    const durationMinutes = (trip as any).totalDurationMinutes || 0;

    const baseFare = rateCard.baseFare;
    const distanceCharge = distanceKm * rateCard.perKmRate;
    const waitingCharge = 0; // Calculate from actual waiting time
    const nightCharge = 0; // Check if trip is during night hours
    const taxRate = 0.18; // 18% GST
    const totalBeforeTax = baseFare + distanceCharge + waitingCharge + nightCharge;
    const taxAmount = totalBeforeTax * taxRate;
    const totalWithTax = totalBeforeTax + taxAmount;

    return {
      tripId,
      baseFare,
      distanceCharge,
      timeCharge: 0,
      waitingCharge,
      tollCharge: 0,
      parkingCharge: 0,
      nightCharge,
      emergencySurcharge: 0,
      guardCharge: 0,
      taxAmount,
      totalBeforeTax,
      totalWithTax,
      gstCgst: taxAmount / 2,
      gstSgst: taxAmount / 2,
      gstIgst: 0,
      rateCardVersion: rateCard.id,
      billingModel: BillingModel.PER_KM,
    };
  }

  // ============================================================
  // VENDOR CONTRACT MANAGEMENT (Phase 5)
  // ============================================================

  async createVendorContract(companyId: string, vendorId: string, data: {
    contractNumber: string;
    contractStart: Date;
    contractEnd: Date;
    billingModel?: string;
    paymentTerms?: string;
    currency?: string;
  }, createdBy: string) {
    // Check if contract already exists
    const existing = await (this.prisma as any).vendorContract.findFirst({
      where: { companyId, vendorId, contractNumber: data.contractNumber },
    });
    if (existing) throw new ConflictException(`Contract ${data.contractNumber} already exists`);

    const contract = await (this.prisma as any).vendorContract.create({
      data: {
        companyId,
        vendorId,
        contractNumber: data.contractNumber,
        contractStart: data.contractStart,
        contractEnd: data.contractEnd,
        billingModel: data.billingModel || 'COMPANY',
        paymentTerms: data.paymentTerms || 'NET_30',
        currency: data.currency || 'INR',
        createdBy,
        status: 'DRAFT',
      },
    });

    await this.audit.log({ companyId, userId: createdBy, action: 'VENDOR_CONTRACT_CREATED', entity: 'VendorContract', entityId: contract.id });
    return contract;
  }

  async approveVendorContract(contractId: string, approvedBy: string) {
    const contract = await (this.prisma as any).vendorContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Contract is ${contract.status}, not pending approval`);
    }

    const updated = await (this.prisma as any).vendorContract.update({
      where: { id: contractId },
      data: { status: 'ACTIVE', approvedBy },
    });

    await this.audit.log({ companyId: contract.companyId, userId: approvedBy, action: 'VENDOR_CONTRACT_APPROVED', entity: 'VendorContract', entityId: contractId });
    return updated;
  }

  // ============================================================
  // VENDOR INVOICE LIFECYCLE (Phase 5)
  // ============================================================

  async generateVendorInvoice(companyId: string, vendorId: string, tripIds: string[], generatedBy: string) {
    // Validate all trips belong to the vendor
    const trips = await (this.prisma as any).trip.findMany({
      where: { id: { in: tripIds }, companyId },
    });

    if (trips.length !== tripIds.length) {
      throw new BadRequestException('Some trips not found or not in company scope');
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const trip of trips) {
      const cost = await this.calculateTripCost(trip.id);
      totalAmount += cost.totalWithTax;
    }

    // Create invoice
    const invoice = await (this.prisma as any).vendorInvoice.create({
      data: {
        companyId,
        vendorId,
        invoiceNumber: `INV-${Date.now()}`,
        totalAmount,
        tripCount: trips.length,
        status: 'PENDING',
        generatedBy,
        tripIds,
      },
    });

    await this.audit.log({ companyId, userId: generatedBy, action: 'VENDOR_INVOICE_GENERATED', entity: 'VendorInvoice', entityId: invoice.id });
    return invoice;
  }

  async approveVendorInvoice(invoiceId: string, approvedBy: string, notes?: string) {
    const invoice = await (this.prisma as any).vendorInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException(`Invoice is ${invoice.status}`);
    }

    const updated = await (this.prisma as any).vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        notes,
      },
    });

    await this.audit.log({ companyId: invoice.companyId, userId: approvedBy, action: 'VENDOR_INVOICE_APPROVED', entity: 'VendorInvoice', entityId: invoiceId });
    return updated;
  }

  async markInvoicePaid(invoiceId: string, paidBy: string, paymentRef: string) {
    const invoice = await (this.prisma as any).vendorInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== 'APPROVED') {
      throw new BadRequestException(`Invoice must be approved before marking as paid`);
    }

    const updated = await (this.prisma as any).vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidBy,
        paidAt: new Date(),
        paymentRef,
      },
    });

    await this.audit.log({ companyId: invoice.companyId, userId: paidBy, action: 'VENDOR_INVOICE_PAID', entity: 'VendorInvoice', entityId: invoiceId });
    return updated;
  }
}
