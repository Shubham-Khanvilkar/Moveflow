import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface KPIValue {
  name: string;
  value: number;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  changePercent: number;
  period: string;
}

@Injectable()
export class KPIAggregationService {
  private readonly logger = new Logger(KPIAggregationService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardKPIs(companyId: string): Promise<KPIValue[]> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthData, lastMonthData] = await Promise.all([
      this.getMonthlyData(companyId, thisMonth, now),
      this.getMonthlyData(companyId, lastMonth, thisMonth),
    ]);

    return [
      this.buildKPI('Total Bookings', thisMonthData.bookings, lastMonthData.bookings, 'bookings', 'This Month'),
      this.buildKPI('Active Trips', thisMonthData.activeTrips, lastMonthData.activeTrips, 'trips', 'This Month'),
      this.buildKPI('Total Drivers', thisMonthData.drivers, lastMonthData.drivers, 'drivers', 'This Month'),
      this.buildKPI('Fleet Size', thisMonthData.vehicles, lastMonthData.vehicles, 'vehicles', 'This Month'),
      this.buildKPI('Utilization Rate', thisMonthData.utilization, lastMonthData.utilization, '%', 'This Month'),
      this.buildKPI('Revenue', thisMonthData.revenue, lastMonthData.revenue, 'INR', 'This Month'),
    ];
  }

  async getOperationalKPIs(companyId: string): Promise<KPIValue[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayTrips, avgRating] = await Promise.all([
      this.prisma.trip.count({ where: { companyId, createdAt: { gte: today } } }),
      this.prisma.driverProfile.aggregate({ where: { companyId }, _avg: { rating: true } }),
    ]);

    return [
      { name: "Today's Trips", value: todayTrips, unit: 'trips', trend: 'STABLE', changePercent: 0, period: 'Today' },
      { name: 'Avg Driver Rating', value: Number(avgRating._avg.rating || 0), unit: '/5', trend: 'STABLE', changePercent: 0, period: 'All Time' },
    ];
  }

  private async getMonthlyData(companyId: string, from: Date, to: Date) {
    const [bookings, activeTrips, drivers, vehicles] = await Promise.all([
      this.prisma.booking.count({ where: { companyId, createdAt: { gte: from, lt: to } } }),
      this.prisma.trip.count({ where: { companyId, status: { in: ['IN_TRANSIT', 'DISPATCHED'] } } }),
      this.prisma.driverProfile.count({ where: { companyId } }),
      this.prisma.vehicle.count({ where: { companyId } }),
    ]);

    return {
      bookings,
      activeTrips,
      drivers,
      vehicles,
      utilization: vehicles > 0 ? Math.round((activeTrips / vehicles) * 100) : 0,
      revenue: 0,
    };
  }

  private buildKPI(name: string, current: number, previous: number, unit: string, period: string): KPIValue {
    const changePercent = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
    const trend = changePercent > 0 ? 'UP' : changePercent < 0 ? 'DOWN' : 'STABLE';
    return { name, value: current, unit, trend, changePercent: Math.abs(changePercent), period };
  }
}
