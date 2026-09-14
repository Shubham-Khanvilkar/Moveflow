import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class EnterpriseDashboardService {
  private readonly logger = new Logger(EnterpriseDashboardService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 22C.4 — SUPERADMIN PLATFORM COMMAND CENTER
  // ============================================================
  async platformCommandCenter() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies, activeCompanies, trialCompanies, suspendedCompanies,
      totalEmployees, transportEligible, activeDrivers, activeVehicles, activeVendors,
      tripsToday, activeTrips, completedToday, cancelledToday, noShowsToday,
      breakdownsToday, sosToday,
    ] = await Promise.all([
      (this.prisma as any).company.count(),
      (this.prisma as any).company.count({ where: { status: 'ACTIVE' } }),
      (this.prisma as any).company.count({ where: { status: 'DRAFT' } }),
      (this.prisma as any).company.count({ where: { status: 'SUSPENDED' } }),
      (this.prisma as any).user.count({ where: { status: 'ACTIVE', roleAssignments: { some: {} } } }),
      (this.prisma as any).user.count({ where: { status: 'ACTIVE', transportEligibility: 'ELIGIBLE' } }),
      (this.prisma as any).driverProfile.count({ where: { status: 'ACTIVE' } }),
      (this.prisma as any).vehicle.count({ where: { status: 'AVAILABLE' } }),
      (this.prisma as any).vendor.count({ where: { status: 'ACTIVE' } }),
      (this.prisma as any).trip.count({ where: { createdAt: { gte: today } } }),
      (this.prisma as any).trip.count({ where: { status: { in: ['DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'BOARDING', 'IN_TRANSIT'] } } }),
      (this.prisma as any).trip.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
      (this.prisma as any).trip.count({ where: { status: 'CANCELLED', createdAt: { gte: today } } }),
      (this.prisma as any).trip.count({ where: { status: 'DELAYED' } }),
      (this.prisma as any).incident.count({ where: { type: 'VEHICLE_BREAKDOWN', createdAt: { gte: today } } }),
      (this.prisma as any).incident.count({ where: { type: 'SECURITY', createdAt: { gte: today } } }),
    ]);

    return {
      platform: {
        totalCompanies, activeCompanies, trialCompanies, suspendedCompanies,
        totalEmployees, transportEligible, activeDrivers, activeVehicles, activeVendors,
      },
      operations: {
        tripsToday, activeTrips, completedToday, cancelledToday, noShowsToday,
        breakdownsToday, sosToday,
      },
      generatedAt: now.toISOString(),
    };
  }

  // ============================================================
  // 22C.4 — Company health matrix
  // ============================================================
  async companyHealthMatrix() {
    const companies = await (this.prisma as any).company.findMany({
      where: { status: 'ACTIVE' },
      include: {
        users: { where: { status: 'ACTIVE' }, select: { id: true } },
        driverProfiles: { where: { status: 'ACTIVE' }, select: { id: true } },
        vehicles: { where: { status: 'AVAILABLE' }, select: { id: true } },
        vendors: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
    });

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const results = await Promise.all(
      companies.map(async (company: any) => {
        const [tripsToday, completedToday, noShowsToday] = await Promise.all([
          (this.prisma as any).trip.count({ where: { companyId: company.id, createdAt: { gte: todayStart } } }),
          (this.prisma as any).trip.count({ where: { companyId: company.id, status: 'COMPLETED', completedAt: { gte: todayStart } } }),
          (this.prisma as any).trip.count({ where: { companyId: company.id, status: 'CANCELLED' } }),
        ]);

        return {
          companyId: company.id,
          companyName: company.name,
          plan: company.status,
          employees: company.users.length,
          drivers: company.driverProfiles.length,
          vehicles: company.vehicles.length,
          vendors: company.vendors.length,
          tripsToday, completedToday, noShowsToday,
          noShowRate: tripsToday > 0 ? Number(((noShowsToday / tripsToday) * 100).toFixed(1)) : 0,
        };
      }),
    );

    return results;
  }

  // ============================================================
  // 22C.5 — COMPANY TRANSPORT ADMIN DASHBOARD
  // ============================================================
  async companyTransportDashboard(companyId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalEmployees, transportEligible, activeDrivers, activeVehicles,
      pendingBookings, todayTrips, activeTrips, completedTrips, noShows,
      incidents, pendingApprovals, activeBans,
    ] = await Promise.all([
      (this.prisma as any).user.count({ where: { companyId, status: 'ACTIVE', roleAssignments: { some: {} } } }),
      (this.prisma as any).user.count({ where: { companyId, status: 'ACTIVE', transportEligibility: 'ELIGIBLE' } }),
      (this.prisma as any).driverProfile.count({ where: { companyId, status: 'ACTIVE' } }),
      (this.prisma as any).vehicle.count({ where: { companyId, status: 'AVAILABLE' } }),
      (this.prisma as any).booking.count({ where: { companyId, status: 'PENDING_APPROVAL' } }),
      (this.prisma as any).trip.count({ where: { companyId, createdAt: { gte: today } } }),
      (this.prisma as any).trip.count({ where: { companyId, status: { in: ['DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'BOARDING', 'IN_TRANSIT'] } } }),
      (this.prisma as any).trip.count({ where: { companyId, status: 'COMPLETED' } }),
      (this.prisma as any).booking.count({ where: { companyId, status: 'NO_SHOW', createdAt: { gte: today } } }),
      (this.prisma as any).incident.count({ where: { companyId, createdAt: { gte: thirtyDaysAgo } } }),
      (this.prisma as any).booking.count({ where: { companyId, status: 'PENDING_APPROVAL' } }),
      (this.prisma as any).transportBan.count({ where: { companyId, status: 'ACTIVE' } }),
    ]);

    // Daily trip trend (last 30 days)
    const dailyTrips = await (this.prisma as any).$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Trip"
      WHERE "companyId" = ${companyId}
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Top routes
    const topRoutes = await (this.prisma as any).trip.groupBy({
      by: ['routeId'],
      where: { companyId, status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return {
      kpis: {
        totalEmployees, transportEligible, activeDrivers, activeVehicles,
        pendingBookings, todayTrips, activeTrips, completedTrips, noShows,
        incidents, pendingApprovals, activeBans,
        noShowRate: todayTrips > 0 ? Number(((noShows / todayTrips) * 100).toFixed(1)) : 0,
      },
      trends: { dailyTrips },
      topRoutes,
      generatedAt: now.toISOString(),
    };
  }

  // ============================================================
  // 22C.6 — SUPERADMIN SAAS HEALTH DASHBOARD
  // ============================================================
  async saasHealthDashboard() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies, activeCompanies, newTrials, churnedCompanies,
    ] = await Promise.all([
      (this.prisma as any).company.count(),
      (this.prisma as any).company.count({ where: { status: 'ACTIVE' } }),
      (this.prisma as any).company.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      (this.prisma as any).company.count({ where: { status: 'CANCELLED' } }),
    ]);

    // Platform MRR/ARR
    const invoices = await (this.prisma as any).platformInvoice.aggregate({
      where: { status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true },
    });

    return {
      saas: {
        totalCompanies, activeCompanies, newTrials, churnedCompanies,
        mrr: Number(invoices._sum?.totalAmount || 0),
        arr: Number(invoices._sum?.totalAmount || 0) * 12,
        trialConversionRate: totalCompanies > 0 ? Number(((activeCompanies / totalCompanies) * 100).toFixed(1)) : 0,
      },
      generatedAt: now.toISOString(),
    };
  }

  // ============================================================
  // 22C.7 — MANAGER DASHBOARD
  // ============================================================
  async managerDashboard(userId: string, companyId: string) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [
      pendingApprovals, myTeamTrips, myTeamNoShows, myTeamBookings,
    ] = await Promise.all([
      (this.prisma as any).booking.count({
        where: {
          companyId,
          status: 'PENDING_APPROVAL',
          assignedApproverId: userId,
        },
      }),
      (this.prisma as any).trip.count({        where: { companyId, status: { in: ['IN_TRANSIT', 'ARRIVED_AT_DROP', 'BOARDING'] },
          passengers: { some: { userId } },
        },
      }),
      (this.prisma as any).trip.count({
        where: {
          companyId,
          status: 'CANCELLED',
          createdAt: { gte: todayStart },
          passengers: { some: { userId } },
        },
      }),
      (this.prisma as any).booking.count({
        where: {
          companyId,
          createdAt: { gte: todayStart },
          passengers: { some: { userId } },
        },
      }),
    ]);

    return {
      pendingApprovals, myTeamTrips, myTeamNoShows, myTeamBookings,
      generatedAt: today.toISOString(),
    };
  }

  // ============================================================
  // 22C.8 — EMPLOYEE DASHBOARD
  // ============================================================
  async employeeDashboard(userId: string, companyId: string) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [upcomingTrips, recentBookings, activeBookings] = await Promise.all([
      (this.prisma as any).trip.findMany({        where: { companyId, status: { in: ['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'DRIVER_ACCEPTED'] },
          passengers: { some: { userId } },
        },
        include: { driver: { include: { user: true } }, vehicle: true, route: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      (this.prisma as any).booking.findMany({
        where: { companyId, createdByUserId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      (this.prisma as any).booking.count({
        where: { companyId, createdByUserId: userId, status: { in: ['PENDING_APPROVAL', 'APPROVED', 'DISPATCHED'] } },
      }),
    ]);

    return {
      upcomingTrips, recentBookings, activeBookings,
      generatedAt: today.toISOString(),
    };
  }

  // ============================================================
  // 22C.9 — CONTROL ROOM DASHBOARD
  // ============================================================
  async controlRoomDashboard(companyId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeTrips, delayedTrips, unassignedTrips, sosActive, breakdownsActive] = await Promise.all([
      (this.prisma as any).trip.count({
        where: { companyId, status: { in: ['IN_TRANSIT', 'ARRIVED_AT_DROP', 'BOARDING', 'EN_ROUTE_TO_PICKUP'] } },
      }),
      (this.prisma as any).trip.count({
        where: { companyId, status: 'IN_TRANSIT', updatedAt: { lte: new Date(now.getTime() - 30 * 60 * 1000) } },
      }),
      (this.prisma as any).booking.count({
        where: { companyId, status: 'APPROVED' },
      }),
      (this.prisma as any).incident.count({
        where: { companyId, type: 'SECURITY', status: { in: ['REPORTED', 'ASSIGNED', 'INVESTIGATING'] } },
      }),
      (this.prisma as any).incident.count({
        where: { companyId, type: 'VEHICLE_BREAKDOWN', status: { in: ['REPORTED', 'ASSIGNED', 'INVESTIGATING'] } },
      }),
    ]);

    return {
      activeTrips, delayedTrips, unassignedTrips, sosActive, breakdownsActive,
      generatedAt: now.toISOString(),
    };
  }

  // ============================================================
  // 22C.10 — FINANCE DASHBOARD
  // ============================================================
  async financeDashboard(companyId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalSpend, vendorInvoices, pendingReconciliation, expenses] = await Promise.all([
      (this.prisma as any).trip.aggregate({
        where: { companyId, status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } },
        _sum: { totalCost: true },
      }),
      (this.prisma as any).vendorInvoice.aggregate({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      (this.prisma as any).invoiceReconciliation.count({
        where: { companyId, status: 'PENDING' },
      }),
      (this.prisma as any).expense.aggregate({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      transportSpend: Number(totalSpend._sum?.totalCost || 0),
      vendorInvoices: {
        totalAmount: Number(vendorInvoices._sum?.totalAmount || 0),
        count: vendorInvoices._count?.id || 0,
      },
      pendingReconciliation,
      expenses: {
        totalAmount: Number(expenses._sum?.amount || 0),
        count: expenses._count?.id || 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 22C.11 — ANALYTICS: Vehicle utilization
  // ============================================================
  async vehicleUtilization(companyId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const vehicles = await (this.prisma as any).vehicle.findMany({
      where: { companyId, status: 'ACTIVE' },
    });

    const utilization = await Promise.all(
      vehicles.map(async (v: any) => {
        const tripCount = await (this.prisma as any).trip.count({
          where: {
            companyId,
            vehicleId: v.id,
            status: 'COMPLETED',
            completedAt: { gte: since },
          },
        });
        const totalKm = await (this.prisma as any).trip.aggregate({
          where: {
            companyId,
            vehicleId: v.id,
            status: 'COMPLETED',
            completedAt: { gte: since },
          },
          _sum: { distanceKm: true },
        });

        return {
          vehicleId: v.id,
          registrationNumber: v.registrationNumber,
          make: v.make,
          model: v.model,
          capacity: v.capacity,
          tripCount,
          totalKm: Number(totalKm._sum?.distanceKm || 0),
          utilizationRate: tripCount > 0 ? Number(((tripCount / days) * 100).toFixed(1)) : 0,
        };
      }),
    );

    return utilization.sort((a: any, b: any) => b.utilizationRate - a.utilizationRate);
  }

  // ============================================================
  // 22C.12 — ANALYTICS: Driver performance
  // ============================================================
  async driverPerformance(companyId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const drivers = await (this.prisma as any).driverProfile.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: { user: true },
    });

    const performance = await Promise.all(
      drivers.map(async (d: any) => {
        const [tripCount, completedTrips, noShows, breakdowns, avgRating] = await Promise.all([
          (this.prisma as any).trip.count({
            where: { companyId, driverId: d.id, createdAt: { gte: since } },
          }),
          (this.prisma as any).trip.count({
            where: { companyId, driverId: d.id, status: 'COMPLETED', completedAt: { gte: since } },
          }),
          (this.prisma as any).trip.count({
            where: { companyId, driverId: d.id, status: 'CANCELLED' },
          }),
          (this.prisma as any).incident.count({
            where: { companyId, driverId: d.id, type: 'VEHICLE_BREAKDOWN', createdAt: { gte: since } },
          }),
          (this.prisma as any).feedback.aggregate({
            where: { companyId, driverId: d.id, createdAt: { gte: since } },
            _avg: { rating: true },
          }),
        ]);

        return {
          driverId: d.id,
          driverName: d.user?.name || 'Unknown',
          tripCount,
          completedTrips,
          noShows,
          breakdowns,
          completionRate: tripCount > 0 ? Number(((completedTrips / tripCount) * 100).toFixed(1)) : 0,
          noShowRate: tripCount > 0 ? Number(((noShows / tripCount) * 100).toFixed(1)) : 0,
          avgRating: Number(avgRating._avg?.rating || 0),
        };
      }),
    );

    return performance.sort((a: any, b: any) => b.completionRate - a.completionRate);
  }

  // ============================================================
  // 22C.13 — SAFETY DASHBOARD
  // ============================================================
  async safetyDashboard(companyId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [incidents, sosEvents, breakdowns, routeDeviations] = await Promise.all([
      (this.prisma as any).incident.groupBy({
        by: ['type', 'severity'],
        where: { companyId, createdAt: { gte: since } },
        _count: { id: true },
      }),
      (this.prisma as any).incident.count({
        where: { companyId, type: 'SECURITY', createdAt: { gte: since } },
      }),
      (this.prisma as any).incident.count({
        where: { companyId, type: 'VEHICLE_BREAKDOWN', createdAt: { gte: since } },
      }),
      (this.prisma as any).incident.count({
        where: { companyId, type: 'ROUTE_BLOCKED', createdAt: { gte: since } },
      }),
    ]);

    return {
      totalIncidents: incidents.reduce((sum: number, i: any) => sum + i._count.id, 0),
      byType: incidents.reduce((acc: any, i: any) => {
        acc[i.type] = (acc[i.type] || 0) + i._count.id;
        return acc;
      }, {}),
      bySeverity: incidents.reduce((acc: any, i: any) => {
        acc[i.severity] = (acc[i.severity] || 0) + i._count.id;
        return acc;
      }, {}),
      sosEvents, breakdowns, routeDeviations,
      period: { from: since.toISOString(), to: new Date().toISOString() },
    };
  }

  // ============================================================
  // RECENT ACTIVITY — FROM AUDIT LOG
  // ============================================================
  async recentActivity(companyId: string, limit: number = 10) {
    try {
      const activities = await (this.prisma as any).auditLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return activities.map((a: any) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        userId: a.userId,
        createdAt: a.createdAt,
        message: this.formatActivityMessage(a),
        color: this.getActivityColor(a.action),
        time: this.formatTimeAgo(a.createdAt),
      }));
    } catch {
      return [];
    }
  }

  private formatActivityMessage(audit: any): string {
    const actionMap: Record<string, string> = {
      LOGIN: 'User logged in',
      LOGOUT: 'User logged out',
      BOOKING_CREATED: 'New booking created',
      BOOKING_APPROVED: 'Booking approved',
      BOOKING_REJECTED: 'Booking rejected',
      TRIP_STARTED: 'Trip started',
      TRIP_COMPLETED: 'Trip completed',
      TRIP_CANCELLED: 'Trip cancelled',
      NO_SHOW_RECORDED: 'No-show recorded',
      NO_SHOW_APPEAL: 'No-show appeal submitted',
      SOS_ALERT: 'SOS alert triggered',
      INCIDENT_REPORTED: 'Incident reported',
      VEHICLE_INSPECTION: 'Vehicle inspection completed',
      DRIVER_ASSIGNED: 'Driver assigned to trip',
      ROUTE_CREATED: 'Route created',
      EMPLOYEE_IMPORTED: 'Employee batch imported',
      ROLE_ASSIGNED: 'Role assigned',
      ROLE_REVOKED: 'Role revoked',
      EXPENSE_SUBMITTED: 'Expense submitted',
      EXPENSE_APPROVED: 'Expense approved',
      INVOICE_CREATED: 'Vendor invoice created',
      COMPLIANCE_ALERT: 'Compliance alert triggered',
    };
    return actionMap[audit.action] || `${audit.action} on ${audit.entity}`;
  }

  private getActivityColor(action: string): string {
    const colorMap: Record<string, string> = {
      TRIP_COMPLETED: 'text-green-600',
      BOOKING_APPROVED: 'text-green-600',
      EMPLOYEE_IMPORTED: 'text-blue-600',
      VEHICLE_INSPECTION: 'text-yellow-600',
      NO_SHOW_APPEAL: 'text-purple-600',
      SOS_ALERT: 'text-red-600',
      INCIDENT_REPORTED: 'text-red-600',
      COMPLIANCE_ALERT: 'text-orange-600',
      TRIP_CANCELLED: 'text-gray-600',
      BOOKING_REJECTED: 'text-red-600',
      ROLE_REVOKED: 'text-red-600',
    };
    return colorMap[action] || 'text-gray-700';
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  }
}
