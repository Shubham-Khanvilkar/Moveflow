import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AnalyticsEngineService {
  private readonly logger = new Logger(AnalyticsEngineService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 1. EXECUTIVE DASHBOARD (C-Suite)
  // ============================================================
  async getExecutiveDashboard(companyId: string, period: { start: Date; end: Date }) {
    const [totalTrips, completedTrips, cancelledTrips, totalCost, vehicleCount, driverCount] = await Promise.all([
      this.prisma.trip.count({ where: { companyId, createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.trip.count({ where: { companyId, status: 'COMPLETED', createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.trip.count({ where: { companyId, status: 'CANCELLED', createdAt: { gte: period.start, lte: period.end } } }),
      (this.prisma as any).tripCost.aggregate({ where: { companyId, calculatedAt: { gte: period.start, lte: period.end } }, _sum: { totalWithTax: true } }),
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.driverProfile.count({ where: { companyId } }),
    ]);

    const noShowCount = await (this.prisma as any).employeeNoShowRecord.count({
      where: { companyId, recordedAt: { gte: period.start, lte: period.end } },
    });

    const incidentCount = await (this.prisma as any).incident.count({
      where: { companyId, createdAt: { gte: period.start, lte: period.end } },
    });

    const sosCount = await (this.prisma as any).sOSAlert.count({
      where: { companyId, createdAt: { gte: period.start, lte: period.end } },
    });

    return {
      period,
      kpis: {
        totalTrips,
        completedTrips,
        cancelledTrips,
        completionRate: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
        cancellationRate: totalTrips > 0 ? Math.round((cancelledTrips / totalTrips) * 100) : 0,
        noShowRate: totalTrips > 0 ? Math.round((noShowCount / totalTrips) * 100) : 0,
        totalCost: (totalCost._sum as any)?.totalWithTax || 0,
        costPerTrip: completedTrips > 0 ? Math.round(((totalCost._sum as any)?.totalWithTax || 0) / completedTrips) : 0,
        vehicleCount,
        driverCount,
        incidents: incidentCount,
        sosAlerts: sosCount,
      },
    };
  }

  // ============================================================
  // 2. MANAGER DASHBOARD
  // ============================================================
  async getManagerDashboard(companyId: string, managerId: string) {
    // Get employees this manager manages
    const reports = await (this.prisma as any).managerRelationship.findMany({
      where: { managerId, companyId },
      select: { employeeId: true },
    });
    const reporteeIds = reports.map((r: any) => r.employeeId);

    const pendingApprovals = await (this.prisma as any).booking.count({
      where: {
        companyId,
        status: 'PENDING_APPROVAL',
        employeeId: { in: reporteeIds },
      },
    });

    const upcomingTrips = await (this.prisma as any).trip.count({
      where: {
        companyId,
        status: { in: ['BOOKED', 'APPROVED', 'DRIVER_ASSIGNED'] },
        passengers: { some: { passengerId: { in: reporteeIds } } },
      },
    });

    const teamExpenses = await (this.prisma as any).transportExpense.aggregate({
      where: {
        companyId,
        employeeId: { in: reporteeIds },
        status: 'SUBMITTED',
      },
      _sum: { amount: true },
      _count: true,
    });

    const teamNoShows = await (this.prisma as any).employeeNoShowRecord.count({
      where: {
        companyId,
        employeeId: { in: reporteeIds },
        recordedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
    });

    return {
      reporteeCount: reporteeIds.length,
      pendingApprovals,
      upcomingTrips,
      pendingExpenses: teamExpenses._count,
      pendingExpenseAmount: (teamExpenses._sum as any)?.amount || 0,
      teamNoShowsLast30Days: teamNoShows,
    };
  }

  // ============================================================
  // 3. EMPLOYEE DASHBOARD
  // ============================================================
  async getEmployeeDashboard(companyId: string, employeeId: string) {
    const upcomingTrip = await (this.prisma as any).trip.findFirst({
      where: {
        companyId,
        status: { in: ['BOOKED', 'APPROVED', 'DRIVER_ASSIGNED', 'IN_TRANSIT'] },
        passengers: { some: { passengerId: employeeId } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const recentTrips = await (this.prisma as any).trip.findMany({
      where: {
        companyId,
        passengers: { some: { passengerId: employeeId } },
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const pendingExpenses = await (this.prisma as any).transportExpense.count({
      where: {
        companyId,
        employeeId,
        status: { in: ['SUBMITTED', 'MANAGER_REVIEW'] },
      },
    });

    const noShowRecords = await (this.prisma as any).employeeNoShowRecord.count({
      where: { companyId, employeeId, overturned: false },
    });

    const activeAppeals = await (this.prisma as any).noShowAppeal.count({
      where: {
        companyId,
        employeeId,
        status: { in: ['SUBMITTED', 'SLA_BREACHED'] },
      },
    });

    return {
      upcomingTrip,
      recentTrips,
      pendingExpenses,
      noShowCount: noShowRecords,
      activeAppeals,
    };
  }

  // ============================================================
  // 4. CONTROL ROOM DASHBOARD
  // ============================================================
  async getControlRoomDashboard(companyId: string) {
    const activeTrips = await (this.prisma as any).trip.findMany({
      where: {
        companyId,
        status: { in: ['IN_TRANSIT', 'ARRIVED', 'WAITING_FOR_PASSENGER', 'BOARDING'] },
      },
      include: {
        passengers: { include: { passenger: { select: { firstName: true, lastName: true } } } },
      },
    });

    const unassignedTrips = await (this.prisma as any).trip.count({
      where: { companyId, status: 'APPROVED' },
    });

    const delayedTrips = await (this.prisma as any).trip.count({
      where: { companyId, status: 'IN_TRANSIT' }, // Would check ETA vs actual
    });

    const sosAlerts = await (this.prisma as any).sOSAlert.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } },
    });

    const vehicleLocations = await (this.prisma as any).latestVehicleLocation.findMany({
      where: { vehicle: { companyId } },
      include: { vehicle: { select: { registrationNumber: true, type: true } } },
    });

    return {
      activeTrips: activeTrips.length,
      trips: activeTrips,
      unassignedTrips,
      delayedTrips,
      sosAlerts,
      vehicleCount: vehicleLocations.length,
      vehicleLocations,
      onlineDrivers: vehicleLocations.length,
    };
  }

  // ============================================================
  // 5. FINANCE DASHBOARD
  // ============================================================
  async getFinanceDashboard(companyId: string, period: { start: Date; end: Date }) {
    const tripCosts = await (this.prisma as any).tripCost.aggregate({
      where: { companyId, calculatedAt: { gte: period.start, lte: period.end } },
      _sum: { totalWithTax: true, baseFare: true, distanceCharge: true, taxAmount: true },
      _count: true,
    });

    const pendingInvoices = await (this.prisma as any).vendorInvoice.count({
      where: { companyId, status: 'PENDING' },
    });

    const reconciliationDisputes = await (this.prisma as any).invoiceReconciliation.count({
      where: { companyId, status: 'DISPUTED' },
    });

    const expenses = await (this.prisma as any).transportExpense.aggregate({
      where: {
        companyId,
        createdAt: { gte: period.start, lte: period.end },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalTransportCost: (tripCosts._sum as any)?.totalWithTax || 0,
      totalTrips: tripCosts._count,
      averageCostPerTrip: tripCosts._count > 0 ? Math.round(((tripCosts._sum as any)?.totalWithTax || 0) / tripCosts._count) : 0,
      baseFareTotal: (tripCosts._sum as any)?.baseFare || 0,
      distanceChargeTotal: (tripCosts._sum as any)?.distanceCharge || 0,
      taxTotal: (tripCosts._sum as any)?.taxAmount || 0,
      pendingInvoices,
      reconciliationDisputes,
      employeeExpenses: (expenses._sum as any)?.amount || 0,
      expenseCount: expenses._count,
    };
  }

  // ============================================================
  // 6. TRIP ANALYTICS REPORTS
  // ============================================================
  async getTripAnalytics(companyId: string, period: { start: Date; end: Date }) {
    const trips = await (this.prisma as any).trip.findMany({
      where: { companyId, createdAt: { gte: period.start, lte: period.end } },
    });

    const statusBreakdown = trips.reduce((acc: Record<string, number>, t: any) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const dailyTrips = trips.reduce((acc: Record<string, number>, t: any) => {
      const day = t.createdAt.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    return {
      total: trips.length,
      statusBreakdown,
      dailyTrend: Object.entries(dailyTrips).map(([date, count]) => ({ date, count })),
      completionRate: trips.length > 0 ? Math.round(((statusBreakdown['COMPLETED'] || 0) / trips.length) * 100) : 0,
      noShowRate: trips.length > 0 ? Math.round(((statusBreakdown['NO_SHOW'] || 0) / trips.length) * 100) : 0,
    };
  }

  // ============================================================
  // 7. VEHICLE UTILIZATION
  // ============================================================
  async getVehicleUtilization(companyId: string, period: { start: Date; end: Date }) {
    const vehicles = await (this.prisma as any).vehicle.findMany({ where: { companyId } });

    const utilization = [];
    for (const vehicle of vehicles) {
      const tripCount = await (this.prisma as any).trip.count({
        where: {
          companyId,
          vehicleId: vehicle.id,
          createdAt: { gte: period.start, lte: period.end },
        },
      });

      utilization.push({
        vehicleId: vehicle.id,
        registrationNumber: (vehicle as any).registrationNumber,
        type: (vehicle as any).type,
        tripCount,
        status: (vehicle as any).status,
      });
    }

    return {
      totalVehicles: vehicles.length,
      utilization: utilization.sort((a, b) => b.tripCount - a.tripCount),
      avgTripsPerVehicle: vehicles.length > 0 ? Math.round(utilization.reduce((s, u) => s + u.tripCount, 0) / vehicles.length) : 0,
    };
  }

  // ============================================================
  // 8. VENDOR PERFORMANCE
  // ============================================================
  async getVendorPerformance(companyId: string, period: { start: Date; end: Date }) {
    const vendors = await (this.prisma as any).vendor.findMany({ where: { companyId } });

    const performance = [];
    for (const vendor of vendors) {
      const trips = await (this.prisma as any).trip.count({
        where: {
          companyId,
          createdAt: { gte: period.start, lte: period.end },
          driver: { vendorId: vendor.id },
        },
      });

      const onTime = await (this.prisma as any).trip.count({
        where: {
          companyId,
          status: 'COMPLETED',
          createdAt: { gte: period.start, lte: period.end },
          driver: { vendorId: vendor.id },
        },
      });

      performance.push({
        vendorId: vendor.id,
        name: (vendor as any).name,
        totalTrips: trips,
        completedTrips: onTime,
        onTimeRate: trips > 0 ? Math.round((onTime / trips) * 100) : 0,
      });
    }

    return performance;
  }

  // ============================================================
  // 9. REPORT SCHEDULING
  // ============================================================
  async scheduleReport(companyId: string, data: {
    reportType: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    recipients: string[];
    format: 'CSV' | 'PDF' | 'EMAIL';
  }) {
    // Store schedule in audit log (in production: use a dedicated ReportSchedule model)
    await (this.prisma as any).auditLog.create({
      data: {
        companyId,
        userId: 'SYSTEM',
        action: 'REPORT_SCHEDULED',
        resourceType: 'REPORT',
        resourceId: data.reportType,
        details: JSON.stringify({
          reportType: data.reportType,
          frequency: data.frequency,
          recipients: data.recipients,
          format: data.format,
          scheduledAt: new Date().toISOString(),
        }),
        createdAt: new Date(),
      },
    });

    return { scheduled: true, reportType: data.reportType, frequency: data.frequency };
  }

  // ============================================================
  // 10. EXPORT DATA
  // ============================================================
  async exportData(companyId: string, type: string, period: { start: Date; end: Date }) {
    let data: any[] = [];

    switch (type) {
      case 'TRIPS':
        data = await (this.prisma as any).trip.findMany({
          where: { companyId, createdAt: { gte: period.start, lte: period.end } },
        });
        break;
      case 'COSTS':
        data = await (this.prisma as any).tripCost.findMany({
          where: { companyId, calculatedAt: { gte: period.start, lte: period.end } },
        });
        break;
      case 'EXPENSES':
        data = await (this.prisma as any).transportExpense.findMany({
          where: { companyId, createdAt: { gte: period.start, lte: period.end } },
        });
        break;
    }

    return { type, count: data.length, data };
  }

  // ============================================================
  // 11. SAFETY ANALYTICS
  // ============================================================
  async getSafetyAnalytics(companyId: string, period: { start: Date; end: Date }) {
    const sosAlerts = await (this.prisma as any).sOSAlert.count({
      where: { companyId, createdAt: { gte: period.start, lte: period.end } },
    });

    const incidents = await (this.prisma as any).incident.count({
      where: { companyId, createdAt: { gte: period.start, lte: period.end } },
    });

    const complianceAlerts = await (this.prisma as any).auditLog.count({
      where: {
        companyId,
        action: { startsWith: 'SAFETY_ALERT_' },
        createdAt: { gte: period.start, lte: period.end },
      },
    });

    return {
      sosAlerts,
      incidents,
      safetyAlerts: complianceAlerts,
      safetyScore: Math.max(0, 100 - (sosAlerts * 10 + incidents * 5 + complianceAlerts * 2)),
    };
  }

  // ============================================================
  // 12. AI SUMMARY (SummarAIze)
  // ============================================================
  async generateAISummary(companyId: string, period: { start: Date; end: Date }) {
    const [executive, safety, finance] = await Promise.all([
      this.getExecutiveDashboard(companyId, period),
      this.getSafetyAnalytics(companyId, period),
      this.getFinanceDashboard(companyId, period),
    ]);

    const summary = `
**Period**: ${period.start.toDateString()} to ${period.end.toDateString()}

**Key Metrics**:
- ${executive.kpis.totalTrips} total trips (${executive.kpis.completionRate}% completion rate)
- ₹${executive.kpis.totalCost.toLocaleString()} total transport cost
- ₹${executive.kpis.costPerTrip} average cost per trip
- ${executive.kpis.noShowRate}% no-show rate
- ${executive.kpis.sosAlerts} SOS alerts
- ${safety.safetyScore}/100 safety score

**Trends**:
- ${executive.kpis.cancellationRate}% cancellation rate
- ${finance.pendingInvoices} pending vendor invoices
- ${finance.reconciliationDisputes} reconciliation disputes

**Recommendations**:
${executive.kpis.noShowRate > 5 ? '- No-show rate is high. Review no-show policies and consider increasing required call attempts.' : '- No-show rate is within acceptable range.'}
${safety.incidents > 10 ? '- High incident count. Review safety protocols and driver compliance.' : '- Safety metrics are within normal range.'}
${finance.reconciliationDisputes > 5 ? '- Multiple invoice disputes. Review vendor billing accuracy.' : '- Vendor billing is running smoothly.'}
`;

    return { summary, executive, safety, finance };
  }
}
