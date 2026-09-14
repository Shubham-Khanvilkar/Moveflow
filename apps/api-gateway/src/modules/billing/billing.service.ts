import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // RATE CARD CRUD
  // ============================================================

  async getRateCards(companyId: string, filters?: { isActive?: string; vehicleType?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
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
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
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
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
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
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.rateCard.findFirst({ where: { id: rateCardId, companyId } });
    if (!existing) throw new NotFoundException('Rate card not found');
    await this.prisma.rateCard.delete({ where: { id: rateCardId } });
    await this.audit.log({ companyId, userId: deletedBy, action: 'RATE_CARD_DELETED', entity: 'RateCard', entityId: rateCardId, oldValue: { name: existing.name } });
    return { deleted: true, id: rateCardId };
  }

  async getActiveRateCard(companyId: string, vehicleType: string, serviceType?: string, zoneName?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
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

  async calculateTripCost(tripId: string, companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, companyId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const now = new Date();
    const rateCard = await this.prisma.rateCard.findFirst({
      where: {
        companyId,
        isActive: true,
        serviceType: trip.type as any,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
    });

    if (!rateCard) {
      throw new BadRequestException('No active rate card found for this company');
    }

    const plannedDistanceKm = trip.distanceKm ?? 0;
    const actualDistanceKm = trip.distanceKm ?? 0;
    const billableDistanceKm = Math.max(actualDistanceKm, rateCard.minimumKm);
    const durationMinutes = trip.actualDuration ?? trip.plannedDuration ?? 0;

    const baseFareAmount = rateCard.baseFare;
    const distanceCost = Math.round(billableDistanceKm * rateCard.perKmRate * 100) / 100;

    const freeWaiting = rateCard.freeWaitingMinutes;
    const waitingMinutes = Math.max(0, durationMinutes - freeWaiting);
    const waitingCost = Math.round(rateCard.waitingChargePerMin * waitingMinutes * 100) / 100;

    // Calculate night charges (10 PM - 5 AM)
    let nightChargeAmount = 0;
    const pickupTime = trip.actualPickupTime || trip.scheduledPickupTime;
    const pickupHour = pickupTime ? new Date(pickupTime).getHours() : 12;
    const isNightTime = pickupHour >= 22 || pickupHour < 5;
    if (isNightTime && rateCard.nightChargeValue > 0) {
      if (rateCard.nightChargeType === 'PERCENTAGE') {
        nightChargeAmount = Math.round((baseFareAmount + distanceCost) * (rateCard.nightChargeValue / 100) * 100) / 100;
      } else {
        nightChargeAmount = rateCard.nightChargeValue;
      }
    }

    // Toll and parking from rate card
    const tollCost = rateCard.tollPolicy === 'INCLUDED' ? rateCard.tollAmount : 0;
    const parkingCost = rateCard.parkingPolicy === 'INCLUDED' ? rateCard.parkingAmount : 0;
    const airportCharge = rateCard.airportCharge || 0;

    const subtotal = baseFareAmount + distanceCost + waitingCost + nightChargeAmount + tollCost + parkingCost + airportCharge;
    const totalAmount = Math.round(subtotal * 100) / 100;
    const minimumTotal = Math.max(totalAmount, rateCard.minimumFare);
    const finalAmount = Math.round(minimumTotal * 100) / 100;

    const snapshot = await this.prisma.tripCostSnapshot.create({
      data: {
        tripId,
        rateCardId: rateCard.id,
        ratePerKm: rateCard.perKmRate,
        baseFare: rateCard.baseFare,
        minimumKm: rateCard.minimumKm,
        minimumFare: rateCard.minimumFare,
        waitingChargePerMin: rateCard.waitingChargePerMin,
        freeWaitingMinutes: rateCard.freeWaitingMinutes,
        nightChargeType: rateCard.nightChargeType,
        nightChargeValue: rateCard.nightChargeValue,
        acType: rateCard.acType,
        plannedDistanceKm,
        actualDistanceKm,
        billableDistanceKm,
        baseFareAmount,
        distanceCost,
        waitingCost,
        waitingMinutes,
        nightChargeAmount,
        tollCost,
        parkingCost,
        airportCharge,
        additionalCharges: 0,
        discount: 0,
        taxAmount: 0,
        totalAmount: finalAmount,
        status: 'ESTIMATED',
      },
    });

    const existingCost = await this.prisma.tripCost.findFirst({
      where: { tripId, Trip: { companyId } } as any,
    });

    if (existingCost) {
      await this.prisma.tripCost.update({
        where: { id: existingCost.id },
        data: {
          amount: finalAmount,
          breakdown: {
            rateCardId: rateCard.id,
            baseFareAmount,
            distanceCost,
            waitingCost,
            waitingMinutes,
            billableDistanceKm,
            ratePerKm: rateCard.perKmRate,
          },
        },
      });
    } else {
      await this.prisma.tripCost.create({
        data: {
          tripId,
          costCenterId: rateCard.costCenterId,
          amount: finalAmount,
          breakdown: {
            rateCardId: rateCard.id,
            baseFareAmount,
            distanceCost,
            waitingCost,
            waitingMinutes,
            billableDistanceKm,
            ratePerKm: rateCard.perKmRate,
          },
        },
      });
    }

    await this.audit.log({
      companyId,
      userId: companyId,
      action: 'TRIP_COST_CALCULATED',
      entity: 'TripCostSnapshot',
      entityId: snapshot.id,
      newValue: { tripId, totalAmount: finalAmount, rateCardId: rateCard.id },
    });

    return snapshot;
  }

  async getTripCostSnapshot(tripId: string, companyId?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const snapshot = await this.prisma.tripCostSnapshot.findFirst({
      where: companyId ? { tripId, Trip: { companyId } } as any : { tripId },
      orderBy: { createdAt: 'desc' },
    });

    return snapshot;
  }

  async listCostCenters(companyId: string, params?: { page?: number; limit?: number; search?: string }) {
    if (!this.prisma.isConnected()) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (params?.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [costCenters, total] = await Promise.all([
      this.prisma.costCenter.findMany({ where, skip, take: limit, orderBy: { code: 'asc' } }),
      this.prisma.costCenter.count({ where }),
    ]);

    return { data: costCenters, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createCostCenter(companyId: string, data: { code: string; name: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const costCenter = await this.prisma.costCenter.create({
      data: {
        companyId,
        code: data.code,
        name: data.name,
      },
    });

    await this.audit.log({
      companyId,
      userId: createdBy,
      action: 'COST_CENTER_CREATED',
      entity: 'CostCenter',
      entityId: costCenter.id,
      newValue: { code: data.code, name: data.name },
    });

    return costCenter;
  }

  async getCostCenterSummary(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const costCenters = await this.prisma.costCenter.findMany({
      where: { companyId },
      include: {
        tripCosts: {
          select: { amount: true },
        },
        vendorInvoices: {
          select: { amount: true, status: true },
        },
      } as any,
      orderBy: { code: 'asc' },
    });

    const summary = (costCenters as any[]).map((cc) => {
      const tripSpend = cc.tripCosts.reduce((sum, tc) => sum + (tc.amount || 0), 0);
      const invoiceTotal = cc.vendorInvoices.reduce((sum, vi) => sum + (vi.amount || 0), 0);
      const invoicePaid = cc.vendorInvoices
        .filter((vi) => vi.status === 'PAID')
        .reduce((sum, vi) => sum + (vi.amount || 0), 0);

      return {
        id: cc.id,
        code: cc.code,
        name: cc.name,
        tripCount: cc.tripCosts.length,
        tripSpend: Math.round(tripSpend * 100) / 100,
        invoiceCount: cc.vendorInvoices.length,
        invoiceTotal: Math.round(invoiceTotal * 100) / 100,
        invoicePaid: Math.round(invoicePaid * 100) / 100,
      };
    });

    const totalSpend = summary.reduce((sum, cc) => sum + cc.tripSpend, 0);

    return { costCenters: summary, totalSpend: Math.round(totalSpend * 100) / 100 };
  }

  async getVendorInvoiceSummary(companyId: string, params?: { vendorId?: string; from?: string; to?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const where: any = { costCenter: { companyId } };
    if (params?.vendorId) where.vendorId = params.vendorId;
    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params?.from) where.createdAt.gte = new Date(params.from);
      if (params?.to) where.createdAt.lte = new Date(params.to);
    }

    const invoices = await this.prisma.vendorInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const grouped = invoices.reduce((acc, inv) => {
      if (!acc[inv.vendorId]) {
        acc[inv.vendorId] = { vendorId: inv.vendorId, count: 0, totalAmount: 0, paid: 0, pending: 0 };
      }
      acc[inv.vendorId].count++;
      acc[inv.vendorId].totalAmount += inv.amount;
      if (inv.status === 'PAID') acc[inv.vendorId].paid += inv.amount;
      else acc[inv.vendorId].pending += inv.amount;
      return acc;
    }, {} as Record<string, any>);

    const summary = Object.values(grouped).map((g: any) => ({
      vendorId: g.vendorId,
      invoiceCount: g.count,
      totalAmount: Math.round(g.totalAmount * 100) / 100,
      paidAmount: Math.round(g.paid * 100) / 100,
      pendingAmount: Math.round(g.pending * 100) / 100,
    }));

    const totalAmount = summary.reduce((sum, s) => sum + s.totalAmount, 0);

    return { invoices: summary, totalAmount: Math.round(totalAmount * 100) / 100 };
  }

  // Vendor Contracts
  async getVendorContracts(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return (this.prisma as any).vendorContract.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVendorContract(companyId: string, data: any, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return (this.prisma as any).vendorContract.create({
      data: {
        companyId,
        vendorId: data.vendorId,
        contractNumber: data.contractNumber || `VC-${Date.now()}`,
        contractStart: new Date(data.contractStart),
        contractEnd: new Date(data.contractEnd),
        billingModel: data.billingModel || 'COMPANY',
        paymentTerms: data.paymentTerms || 'NET_30',
        currency: data.currency || 'INR',
        createdBy,
        status: 'DRAFT',
      },
    });
  }

  private _demoRateCards() {
    return [
      { id: 'rc-1', name: 'Sedan Mumbai', code: 'SEDAN-MUM', vehicleType: 'SEDAN', serviceType: 'CAB', baseFare: 150, perKmRate: 12, minimumKm: 4, minimumFare: 150, freeWaitingMinutes: 5, waitingChargePerMin: 2, companyId: 'company-acme-001', isActive: true, priority: 1 },
      { id: 'rc-2', name: 'SUV Mumbai', code: 'SUV-MUM', vehicleType: 'SUV', serviceType: 'CAB', baseFare: 200, perKmRate: 16, minimumKm: 4, minimumFare: 200, freeWaitingMinutes: 5, waitingChargePerMin: 3, companyId: 'company-acme-001', isActive: true, priority: 1 },
    ];
  }
}
