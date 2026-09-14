import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const [vendorCount, driverCount, vehicleCount, routeCount, activeBookings, activeTrips, pendingApprovals, activeBans, activeEmergencies, nodalCount, shuttleCount] = await Promise.all([
      this.prisma.vendorManagement.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.driverManagement.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.vehicleManagement.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.routeManagement.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.booking.count({ where: { companyId, status: { in: ['REQUESTED', 'APPROVED', 'DISPATCHING'] } } }),
      this.prisma.trip.count({ where: { companyId, status: { in: ['DISPATCHED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT'] } } }),
      this.prisma.approvalWorkflow.count({ where: { companyId, status: 'PENDING' } }),
      this.prisma.transportBanRecord.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.emergencyBuzzer.count({ where: { companyId, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } } }),
      this.prisma.nodalPoint.count({ where: { companyId, isActive: true } }),
      this.prisma.shuttleRoute.count({ where: { companyId, isActive: true } }),
    ]);

    const availableDrivers = await this.prisma.driverManagement.count({ where: { companyId, status: 'ACTIVE', isAvailable: true } });
    const availableVehicles = await this.prisma.vehicleManagement.count({ where: { companyId, status: 'ACTIVE', isAvailable: true } });

    const employeeCount = await this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } });

    return {
      employees: { total: employeeCount },
      vendors: { total: vendorCount },
      drivers: { total: driverCount, available: availableDrivers },
      vehicles: { total: vehicleCount, available: availableVehicles },
      routes: { total: routeCount },
      nodalPoints: { total: nodalCount },
      shuttleRoutes: { total: shuttleCount },
      bookings: { active: activeBookings },
      trips: { active: activeTrips },
      approvals: { pending: pendingApprovals },
      bans: { active: activeBans },
      emergencies: { active: activeEmergencies },
      noShows: { today: 0 },
    };
  }

  async getVendorAnalytics(companyId: string, vendorId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vendor = await this.prisma.vendorManagement.findFirst({ where: { id: vendorId, companyId } });
    const drivers = await this.prisma.driverManagement.count({ where: { companyId, vendorId, status: 'ACTIVE' } });
    const vehicles = await this.prisma.vehicleManagement.count({ where: { companyId, vendorId, status: 'ACTIVE' } });
    const metrics = await this.prisma.vendorPerformanceMetric.findMany({ where: { companyId, vendorId }, orderBy: { periodStart: 'desc' }, take: 12 });
    return { vendor, driverCount: drivers, vehicleCount: vehicles, metrics };
  }

  async getDriverAnalytics(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const driver = await this.prisma.driverManagement.findFirst({ where: { id: driverId, companyId } });
    const metrics = await this.prisma.driverPerformanceMetric.findMany({ where: { companyId, driverId }, orderBy: { periodStart: 'desc' }, take: 12 });
    return { driver, metrics };
  }

  async getUtilizationReport(companyId: string, date?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    const totalTrips = await this.prisma.trip.count({ where: { companyId, date: { gte: startOfDay, lte: endOfDay } } });
    const availableVehicles = await this.prisma.vehicleManagement.count({ where: { companyId, status: 'ACTIVE' } });
    const utilization = availableVehicles > 0 ? (totalTrips / availableVehicles) * 100 : 0;
    return { date: targetDate.toISOString().split('T')[0], totalTrips, availableVehicles, utilization: Math.round(utilization * 100) / 100 };
  }

  async getCostReport(companyId: string, params?: { startDate?: string; endDate?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const where: any = { companyId };
    if (params?.startDate) where.createdAt = { gte: new Date(params.startDate) };
    if (params?.endDate) where.createdAt = { ...where.createdAt, lte: new Date(params.endDate) };
    const invoices = await this.prisma.invoiceReconciliation.findMany({ where });
    const totalCost = invoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0);
    const totalPenalties = invoices.reduce((sum, inv) => sum + (inv.amountDiscrepancy ?? 0), 0);
    return { totalCost, totalPenalties, netCost: totalCost - totalPenalties, invoiceCount: invoices.length };
  }

  private demoSummary() {
    return {
      vendors: { total: 5 }, drivers: { total: 45, available: 32 }, vehicles: { total: 38, available: 28 },
      routes: { total: 12 }, nodalPoints: { total: 8 }, shuttleRoutes: { total: 6 },
      bookings: { active: 156 }, trips: { active: 89 }, approvals: { pending: 12 }, bans: { active: 3 }, emergencies: { active: 0 },
    };
  }
}
