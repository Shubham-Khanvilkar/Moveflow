import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

/**
 * SECTION 39: Vendor-less Drivers — "Others" Group for Billing
 *
 * Every company gets a system-seeded INTERNAL vendor at company setup.
 * Drivers not linked to a real third-party vendor get vendorId = INTERNAL.
 * Billing runs through the exact same code path as any other vendor.
 */

const INTERNAL_VENDOR_NAME = 'In-House / Unassigned Drivers';

@Injectable()
export class InternalVendorService {
  private readonly logger = new Logger(InternalVendorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Auto-seed an INTERNAL vendor for a company at company creation time.
   * Called from company-admin service when a new company is created.
   */
  async seedInternalVendor(companyId: string): Promise<string> {
    // Check if already exists
    const existing = await this.prisma.vendor.findFirst({
      where: {
        companyId,
        name: INTERNAL_VENDOR_NAME,
      },
    });

    if (existing) {
      this.logger.debug(`INTERNAL vendor already exists for company ${companyId}`);
      return existing.id;
    }

    // Create the INTERNAL vendor
    const vendor = await this.prisma.vendor.create({
      data: {
        companyId,
        name: INTERNAL_VENDOR_NAME,
        contactName: 'System',
        contactPhone: '',
        contactEmail: '',
      },
    });

    this.logger.log(`Created INTERNAL vendor ${vendor.id} for company ${companyId}`);
    return vendor.id;
  }

  /**
   * Get the INTERNAL vendor for a company.
   */
  async getInternalVendor(companyId: string): Promise<any> {
    return this.prisma.vendor.findFirst({
      where: {
        companyId,
        name: INTERNAL_VENDOR_NAME,
      },
    });
  }

  /**
   * Reassign a driver from INTERNAL to a real vendor (or vice versa).
   * History is preserved — old assignment row is closed, new one opened.
   * The driver's current primary vehicle (if any) carries over to the new assignment.
   */
  async reassignDriver(
    driverId: string,
    newVendorId: string,
    companyId: string,
    reason: string,
    reassignedByUserId: string,
  ): Promise<any> {
    // Find the driver profile
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { id: driverId, companyId },
    });
    if (!driverProfile) throw new Error('Driver not found');

    // Find the driver's current active vehicle assignment to carry the vehicle over
    const current = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, companyId, endAt: null },
      orderBy: { startAt: 'desc' },
    });

    // Close existing vehicle assignment
    if (current) {
      await this.prisma.driverVehicleAssignment.update({
        where: { id: current.id },
        data: { endAt: new Date(), status: 'INACTIVE' },
      });
    }

    // Update DriverProfile.vendorId so the driver appears under the new vendor
    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { vendorId: newVendorId },
    });

    // Create new vehicle assignment only if there's a vehicle to carry over
    if (current?.vehicleId) {
      await this.prisma.driverVehicleAssignment.create({
        data: {
          driverId,
          companyId,
          vehicleId: current.vehicleId,
          status: 'ACTIVE',
          assignedBy: reassignedByUserId,
          startAt: new Date(),
        },
      });
    }

    await this.audit.log({
      companyId,
      userId: reassignedByUserId,
      action: 'DRIVER_REASSIGNED',
      entity: 'DriverProfile',
      entityId: driverId,
      newValue: { newVendorId, reason, previousVehicleId: current?.vehicleId },
    });

    return { driverId, newVendorId, reassigned: true };
  }
}
