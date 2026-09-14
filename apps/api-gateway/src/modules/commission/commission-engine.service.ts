import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class CommissionEngineService {
  private readonly logger = new Logger(CommissionEngineService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async calculatePayout(companyId: string, driverId: string, period: { from: string; to: string }, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const driver = await this.prisma.driverProfile.findFirst({
      where: { id: driverId, companyId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const trips = await this.prisma.trip.findMany({
      where: {
        companyId,
        driverId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(period.from),
          lte: new Date(period.to),
        },
      },
    });

    let totalEarnings = 0;
    let tripCount = 0;
    let totalDistance = 0;
    let totalDuration = 0;

    for (const trip of trips) {
      const tripCost = await this.prisma.tripCost.findFirst({
        where: { tripId: trip.id },
      });
      if (tripCost) {
        totalEarnings += tripCost.amount;
        tripCount++;
        totalDistance += trip.distanceKm || 0;
        totalDuration += trip.actualDuration || trip.plannedDuration || 0;
      }
    }

    const commissionRate = (driver as any).commissionRate || 0.15;
    const commissionAmount = Math.round(totalEarnings * commissionRate * 100) / 100;
    const netPayout = Math.round((totalEarnings - commissionAmount) * 100) / 100;

    const payout = await (this.prisma as any).driverPayout.create({
      data: {
        companyId,
        driverId,
        periodFrom: new Date(period.from),
        periodTo: new Date(period.to),
        totalEarnings,
        commissionRate,
        commissionAmount,
        netPayout,
        tripCount,
        totalDistance,
        totalDuration,
        status: 'CALCULATED',
        calculatedBy: performedBy,
        calculatedAt: new Date(),
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'PAYOUT_CALCULATED',
      entity: 'DriverPayout', entityId: payout.id,
      newValue: { driverId, totalEarnings, commissionAmount, netPayout },
    });

    return payout;
  }

  async previewPayout(companyId: string, driverId: string, period: { from: string; to: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const driver = await this.prisma.driverProfile.findFirst({
      where: { id: driverId, companyId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const trips = await this.prisma.trip.findMany({
      where: {
        companyId,
        driverId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(period.from),
          lte: new Date(period.to),
        },
      },
    });

    let totalEarnings = 0;
    let tripCount = 0;

    for (const trip of trips) {
      const tripCost = await this.prisma.tripCost.findFirst({
        where: { tripId: trip.id },
      });
      if (tripCost) {
        totalEarnings += tripCost.amount;
        tripCount++;
      }
    }

    const commissionRate = (driver as any).commissionRate || 0.15;
    const commissionAmount = Math.round(totalEarnings * commissionRate * 100) / 100;
    const netPayout = Math.round((totalEarnings - commissionAmount) * 100) / 100;

    return {
      driverId,
      driverName: (driver as any).firstName + ' ' + (driver as any).lastName,
      period: { from: period.from, to: period.to },
      tripCount,
      totalEarnings,
      commissionRate,
      commissionAmount,
      netPayout,
      status: 'PREVIEW',
    };
  }

  async approvePayout(companyId: string, payoutId: string, performedBy: string, data?: { notes?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const payout = await (this.prisma as any).driverPayout.findFirst({
      where: { id: payoutId, companyId },
    });
    if (!payout) throw new NotFoundException('Payout not found');

    if (payout.status !== 'CALCULATED') {
      throw new BadRequestException('Payout cannot be approved');
    }

    const updated = await (this.prisma as any).driverPayout.update({
      where: { id: payoutId },
      data: {
        status: 'APPROVED',
        approvedBy: performedBy,
        approvedAt: new Date(),
        notes: data?.notes,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'PAYOUT_APPROVED',
      entity: 'DriverPayout', entityId: payoutId,
      newValue: { driverId: payout.driverId, netPayout: payout.netPayout },
    });

    return updated;
  }

  async getDashboard(companyId: string, params?: { from?: string; to?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const where: any = { companyId };
    if (params?.from || params?.to) {
      where.periodFrom = {};
      if (params.from) where.periodFrom.gte = new Date(params.from);
      if (params.to) where.periodTo = { lte: new Date(params.to) };
    }

    const [totalPayouts, approvedPayouts, pendingPayouts] = await Promise.all([
      (this.prisma as any).driverPayout.aggregate({
        where,
        _sum: { netPayout: true, commissionAmount: true, totalEarnings: true },
        _count: true,
      }),
      (this.prisma as any).driverPayout.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { netPayout: true },
        _count: true,
      }),
      (this.prisma as any).driverPayout.aggregate({
        where: { ...where, status: 'CALCULATED' },
        _sum: { netPayout: true },
        _count: true,
      }),
    ]);

    return {
      totalEarnings: totalPayouts._sum.totalEarnings || 0,
      totalCommission: totalPayouts._sum.commissionAmount || 0,
      totalPayouts: totalPayouts._sum.netPayout || 0,
      totalPayoutCount: totalPayouts._count,
      approvedAmount: approvedPayouts._sum.netPayout || 0,
      approvedCount: approvedPayouts._count,
      pendingAmount: pendingPayouts._sum.netPayout || 0,
      pendingCount: pendingPayouts._count,
    };
  }

  async listPayouts(companyId: string, params: { page?: number; limit?: number; status?: string; driverId?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params.status) where.status = params.status;
    if (params.driverId) where.driverId = params.driverId;

    const [payouts, total] = await Promise.all([
      (this.prisma as any).driverPayout.findMany({
        where, skip, take: limit,
        include: { driver: { select: { firstName: true, lastName: true, driverCode: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).driverPayout.count({ where }),
    ]);

    return {
      data: payouts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
