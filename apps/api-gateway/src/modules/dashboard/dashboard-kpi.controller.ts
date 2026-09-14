import { Controller, Get, Headers, Query, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('dashboard')
export class DashboardKpiController {
  constructor(private prisma: PrismaService) {}

  @Get('kpi')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
  @RequirePermissions({ module: 'dashboard', action: 'view' })
  async getKpi(@Request() req: any) {
    const companyId = req.user.companyId;

    const [
      employeeCount,
      driverCount,
      vehicleCount,
      tripCount,
      bookingCount,
      vendorCount,
      routeCount,
      incidentCount,
      auditCount,
      shiftCount,
      siteCount,
      userCount,
      roleCount,
      permissionCount,
      documentCount,
      contactCount,
    ] = await Promise.all([
      this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.driverProfile.count({ where: { companyId } }),
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.trip.count({ where: { companyId } }),
      this.prisma.booking.count({ where: { companyId } }),
      this.prisma.vendor.count({ where: { companyId } }),
      this.prisma.route.count({ where: { companyId } }),
      this.prisma.incident.count({ where: { companyId } }),
      this.prisma.auditLog.count({ where: { companyId } }),
      this.prisma.shift.count({ where: { companyId } }),
      this.prisma.companySite.count({ where: { companyId } }),
      this.prisma.user.count({ where: { companyId } }),
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.complianceDocument.count({ where: { companyId } }),
      this.prisma.companyContact.count({ where: { companyId } }),
    ]);

    // Trip status breakdown
    const tripStatuses = await this.prisma.trip.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { status: true },
    });

    // Booking status breakdown
    const bookingStatuses = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { status: true },
    });

    // Recent audit logs
    const recentAudit = await this.prisma.auditLog.findMany({
      where: { companyId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { action: true, createdAt: true, userId: true, entity: true, resourceType: true },
    });

    // Available drivers (not on trip)
    const availableDrivers = await this.prisma.driverProfile.count({
      where: { companyId, status: 'AVAILABLE' as any },
    });

    // Active trips
    const activeTrips = await this.prisma.trip.count({
      where: { companyId, status: { in: ['IN_TRANSIT', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP'] as any[] } },
    });

    // Today's trips
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrips = await this.prisma.trip.count({
      where: { companyId, createdAt: { gte: today } },
    });

    // Incidents requiring action
    const openIncidents = await this.prisma.incident.count({
      where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] as any[] } },
    });

    // Documents expiring soon (30 days)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringDocuments = await this.prisma.complianceDocument.count({
      where: {
        companyId,
        status: 'VERIFIED',
        expiryDate: { gte: new Date(), lte: thirtyDaysFromNow },
      },
    });

    // Active vehicles (not in maintenance)
    const activeVehicles = await this.prisma.vehicle.count({
      where: { companyId, status: { not: 'MAINTENANCE' as any } },
    });

    // Fleet utilization
    const fleetUtilization = vehicleCount > 0
      ? ((activeTrips / vehicleCount) * 100).toFixed(1)
      : 0;

    return {
      employees: { total: employeeCount },
      drivers: { total: driverCount, available: availableDrivers },
      vehicles: { total: vehicleCount, active: activeVehicles, utilization: fleetUtilization },
      trips: { total: tripCount, active: activeTrips, today: todayTrips },
      bookings: { total: bookingCount },
      vendors: { total: vendorCount },
      routes: { total: routeCount },
      incidents: { total: incidentCount, open: openIncidents },
      audit: { total: auditCount },
      shifts: { total: shiftCount },
      sites: { total: siteCount },
      users: { total: userCount },
      roles: { total: roleCount },
      permissions: { total: permissionCount },
      documents: { total: documentCount, expiringSoon: expiringDocuments },
      contacts: { total: contactCount },
      tripStatuses: tripStatuses.map(s => ({ status: s.status, count: s._count.status })),
      bookingStatuses: bookingStatuses.map(s => ({ status: s.status, count: s._count.status })),
      recentAudit,
    };
  }
}
