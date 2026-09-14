import { Injectable, NotFoundException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

/**
 * Vendor Fleet — team-leader model per Navira product direction:
 * a vendor is the team leader of a directly-assigned set of vehicles (and the
 * drivers attached to those vehicles / assigned to the vendor). There is NO
 * invite flow between vendor and drivers; assignment is a direct FK write.
 */
@Injectable()
export class VendorFleetService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getVendorFleet(companyId: string, vendorId: string) {
    if (!this.prisma.isConnected()) return this.demoFleet(vendorId);

    const vendor = await (this.prisma as any).vendor.findFirst({
      where: { id: vendorId, companyId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found in scope');

    const vehicles = await (this.prisma as any).vehicle.findMany({
      where: { companyId, vendorId },
      orderBy: { createdAt: 'desc' },
    });

    const drivers = await (this.prisma as any).driverProfile.findMany({
      where: { companyId, vendorId },
    });

    // Drivers attached to the vendor's vehicles (team derived from fleet)
    const vehicleDriverIds = await (this.prisma as any).driverVehicleAssignment.findMany({
      where: { vehicleId: { in: vehicles.map((v: any) => v.id) } },
      select: { driverId: true },
    });
    const extraDriverIds = vehicleDriverIds
      .map((a: any) => a.driverId)
      .filter((id: string) => !drivers.some((d: any) => d.id === id));
    const vehicleDrivers = extraDriverIds.length
      ? await (this.prisma as any).driverProfile.findMany({ where: { id: { in: extraDriverIds } } })
      : [];

    const allDrivers = await this.enrichDrivers([...drivers, ...vehicleDrivers]);

    // Calculate real available driver count
    const availableDriverCount = allDrivers.filter(
      (d: any) => d.availabilityStatus === 'AVAILABLE' || d.status === 'ACTIVE',
    ).length;

    const activeTrips = await (this.prisma as any).trip.count({
      where: {
        companyId,
        status: { in: ['DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'BOARDING', 'IN_TRANSIT', 'DELAYED'] },
        OR: [
          { vehicleId: { in: vehicles.map((v: any) => v.id) } },
          { driverId: { in: allDrivers.map((dr: any) => (dr as any).userId).filter(Boolean) } },
        ],
      },
    });

    // Invoice summary for this vendor (billing lives beside the fleet)
    const invoices = await (this.prisma as any).vendorInvoice.findMany({
      where: { vendorId },
      select: { id: true, amount: true, tripCount: true, period: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    const invoiceSummary = {
      total: invoices.length,
      pendingAmount: invoices.filter((i: any) => i.status === 'PENDING' || i.status === 'DRAFT').reduce((s: number, i: any) => s + (i.amount || 0), 0),
      paidAmount: invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + (i.amount || 0), 0),
      recent: invoices,
    };

    return {
      vendor: { id: vendor.id, name: (vendor as any).name || 'Vendor', status: (vendor as any).status },
      vehicles,
      drivers: allDrivers,
      kpis: {
        vehicles: { total: vehicles.length, available: vehicles.filter((v: any) => (v as any).status === 'AVAILABLE').length },
        drivers: { total: allDrivers.length, available: availableDriverCount },
        activeTrips,
      },
      invoices: invoiceSummary,
    };
  }

  /** Admin / vendor-team assignment — direct FK write, no invite. */
  async assignVehiclesToVendor(companyId: string, vendorId: string, vehicleIds: string[], by: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vendor = await (this.prisma as any).vendor.findFirst({ where: { id: vendorId, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found in scope');
    const res = await (this.prisma as any).vehicle.updateMany({
      where: { companyId, id: { in: vehicleIds } },
      data: { vendorId },
    });
    await this.audit.log({
      companyId, userId: by?.sub || 'system', action: 'VEHICLES_ASSIGNED_TO_VENDOR',
      entity: 'Vendor', entityId: vendorId, newValue: { vehicleIds },
    });
    return { assigned: res.count };
  }

  async assignDriversToVendor(companyId: string, vendorId: string, driverIds: string[], by: any) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const vendor = await (this.prisma as any).vendor.findFirst({ where: { id: vendorId, companyId } });
    if (!vendor) throw new NotFoundException('Vendor not found in scope');
    const res = await (this.prisma as any).driverProfile.updateMany({
      where: { companyId, id: { in: driverIds } },
      data: { vendorId },
    });
    await this.audit.log({
      companyId, userId: by?.sub || 'system', action: 'DRIVERS_ASSIGNED_TO_VENDOR',
      entity: 'Vendor', entityId: vendorId, newValue: { driverIds },
    });
    return { assigned: res.count };
  }

  /** All vehicles/drivers in company (admin assignment picker). */
  async getCompanyFleet(companyId: string) {
    if (!this.prisma.isConnected()) return { vehicles: [], drivers: [] };
    const [vehicles, drivers] = await Promise.all([
      (this.prisma as any).vehicle.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } }),
      (this.prisma as any).driverProfile.findMany({ where: { companyId } }),
    ]);
    return { vehicles, drivers: await this.enrichDrivers(drivers) };
  }


  /** DriverProfile stores identity on the linked User — merge name/phone. */
  private async enrichDrivers(drivers: any[]) {
    const userIds = drivers.map((d: any) => d.userId).filter(Boolean);
    if (userIds.length === 0) return drivers;
    const users = await (this.prisma as any).user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, phone: true },
    });
    const map = new Map<string, any>(users.map((u: any): [string, any] => [u.id, u]));
    return drivers.map((d: any) => ({
      ...d,
      name: (d as any).name || map.get((d as any).userId)?.name || 'Driver',
      phone: (d as any).phone || map.get((d as any).userId)?.phone || '',
      status: (d as any).status || 'ACTIVE',
    }));
  }

  private demoFleet(vendorId: string) {
    return {
      vendor: { id: vendorId, name: 'Acme Transport Services', status: 'ACTIVE' },
      vehicles: [],
      drivers: [],
      kpis: { vehicles: { total: 0, available: 0 }, drivers: { total: 0, available: 0 }, activeTrips: 0 },
    };
  }
}
