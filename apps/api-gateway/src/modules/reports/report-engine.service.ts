import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface ReportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  columns: ReportColumn[];
  query: string;
  parameters: Array<{ key: string; type: string; default?: any; required?: boolean }>;
}

@Injectable()
export class ReportEngine {
  private readonly logger = new Logger(ReportEngine.name);

  constructor(private prisma: PrismaService) {}

  private readonly builtInReports: ReportDefinition[] = [
    {
      id: 'booking_summary',
      name: 'Booking Summary',
      description: 'Summary of all bookings by status, date, and type',
      category: 'Operations',
      columns: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'total', label: 'Total Bookings', type: 'number', aggregate: 'count' },
        { key: 'confirmed', label: 'Confirmed', type: 'number' },
        { key: 'completed', label: 'Completed', type: 'number' },
        { key: 'cancelled', label: 'Cancelled', type: 'number' },
      ],
      query: 'booking_summary',
      parameters: [
        { key: 'from', type: 'date', required: true },
        { key: 'to', type: 'date', required: true },
      ],
    },
    {
      id: 'trip_analytics',
      name: 'Trip Analytics',
      description: 'Trip distance, duration, and cost analytics',
      category: 'Operations',
      columns: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'trips', label: 'Total Trips', type: 'number', aggregate: 'count' },
        { key: 'totalDistance', label: 'Total Distance (km)', type: 'number', aggregate: 'sum' },
        { key: 'totalDuration', label: 'Total Duration (min)', type: 'number', aggregate: 'sum' },
        { key: 'avgPassengers', label: 'Avg Passengers', type: 'number', aggregate: 'avg' },
      ],
      query: 'trip_analytics',
      parameters: [
        { key: 'from', type: 'date', required: true },
        { key: 'to', type: 'date', required: true },
      ],
    },
    {
      id: 'driver_performance',
      name: 'Driver Performance',
      description: 'Driver ratings, trips, and compliance',
      category: 'Fleet',
      columns: [
        { key: 'driverName', label: 'Driver', type: 'string' },
        { key: 'totalTrips', label: 'Total Trips', type: 'number' },
        { key: 'avgRating', label: 'Avg Rating', type: 'number', aggregate: 'avg' },
        { key: 'onTimePercent', label: 'On-Time %', type: 'number' },
        { key: 'complianceScore', label: 'Compliance Score', type: 'number' },
      ],
      query: 'driver_performance',
      parameters: [
        { key: 'from', type: 'date', required: true },
        { key: 'to', type: 'date', required: true },
      ],
    },
    {
      id: 'billing_reconciliation',
      name: 'Billing Reconciliation',
      description: 'Invoice amounts, payments, and outstanding',
      category: 'Finance',
      columns: [
        { key: 'month', label: 'Month', type: 'string' },
        { key: 'totalInvoiced', label: 'Total Invoiced', type: 'currency', aggregate: 'sum' },
        { key: 'totalPaid', label: 'Total Paid', type: 'currency', aggregate: 'sum' },
        { key: 'outstanding', label: 'Outstanding', type: 'currency' },
      ],
      query: 'billing_reconciliation',
      parameters: [
        { key: 'from', type: 'date', required: true },
        { key: 'to', type: 'date', required: true },
      ],
    },
    {
      id: 'vehicle_utilization',
      name: 'Vehicle Utilization',
      description: 'Vehicle usage, idle time, and efficiency',
      category: 'Fleet',
      columns: [
        { key: 'vehicleId', label: 'Vehicle', type: 'string' },
        { key: 'totalTrips', label: 'Total Trips', type: 'number' },
        { key: 'totalDistance', label: 'Distance (km)', type: 'number', aggregate: 'sum' },
        { key: 'utilizationPercent', label: 'Utilization %', type: 'number' },
      ],
      query: 'vehicle_utilization',
      parameters: [
        { key: 'from', type: 'date', required: true },
        { key: 'to', type: 'date', required: true },
      ],
    },
  ];

  listReports(): ReportDefinition[] {
    return this.builtInReports;
  }

  async generateReport(reportId: string, companyId: string, params: Record<string, any>): Promise<any[]> {
    const report = this.builtInReports.find(r => r.id === reportId);
    if (!report) throw new Error(`Report not found: ${reportId}`);

    switch (report.query) {
      case 'booking_summary':
        return this.bookingSummary(companyId, params.from, params.to);
      case 'trip_analytics':
        return this.tripAnalytics(companyId, params.from, params.to);
      case 'driver_performance':
        return this.driverPerformance(companyId, params.from, params.to);
      case 'billing_reconciliation':
        return this.billingReconciliation(companyId, params.from, params.to);
      case 'vehicle_utilization':
        return this.vehicleUtilization(companyId, params.from, params.to);
      default:
        return [];
    }
  }

  private async bookingSummary(companyId: string, from: Date, to: Date) {
    const bookings = await this.prisma.booking.groupBy({
      by: ['createdAt'],
      where: { companyId, createdAt: { gte: from, lte: to } },
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    return bookings.map((b: any) => ({
      date: b.createdAt,
      total: b._count.id,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    }));
  }

  private async tripAnalytics(companyId: string, from: Date, to: Date) {
    const trips = await this.prisma.trip.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true, distanceKm: true, plannedDuration: true, passengerCount: true },
    });

    return trips.map((t: any) => ({
      date: t.createdAt,
      trips: 1,
      totalDistance: t.distanceKm || 0,
      totalDuration: t.estimatedDuration || 0,
      avgPassengers: t.passengerCount || 1,
    }));
  }

  private async driverPerformance(companyId: string, from: Date, to: Date) {
    const drivers = await this.prisma.driverProfile.findMany({
      where: { companyId },
      include: { User: { select: { name: true } } },
    });

    return drivers.map((d: any) => ({
      driverName: d.User?.name || 'Unknown',
      totalTrips: 0,
      avgRating: 0,
      onTimePercent: 100,
      complianceScore: 100,
    }));
  }

  private async billingReconciliation(companyId: string, from: Date, to: Date) {
    const invoices = await this.prisma.transportInvoice.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
    });

    return invoices.map((inv: any) => ({
      month: inv.createdAt?.toISOString().slice(0, 7) || '',
      totalInvoiced: Number(inv.totalAmount || 0),
      totalPaid: Number(inv.paidAmount || 0),
      outstanding: Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0),
    }));
  }

  private async vehicleUtilization(companyId: string, from: Date, to: Date) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      select: { id: true, registrationNo: true },
    });

    return vehicles.map((v: any) => ({
      vehicleId: v.registrationNo || v.id,
      totalTrips: 0,
      totalDistance: 0,
      utilizationPercent: 0,
    }));
  }
}
