import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class ComplianceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // DRIVER COMPLIANCE CHECK (reusable by dispatch, trip, etc.)
  // ============================================================

  async checkDriverCompliance(companyId: string, driverId: string): Promise<{
    eligible: boolean;
    blockingReasons: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
    expiringDocuments: Array<{ type: string; expiry: Date; daysLeft: number }>;
    driverStatus: string;
    availabilityStatus: string;
    verificationStatus: string;
  }> {
    if (!this.prisma.isConnected()) {
      return this._demoDriverCompliance(driverId);
    }

    const driver = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const now = new Date();
    const blockingReasons: Array<{ code: string; message: string }> = [];
    const warnings: Array<{ code: string; message: string }> = [];
    const expiringDocuments: Array<{ type: string; expiry: Date; daysLeft: number }> = [];

    // 1. Driver status check
    if (driver.status !== 'ACTIVE') {
      blockingReasons.push({ code: 'DRIVER_NOT_ACTIVE', message: `Driver status is ${driver.status}` });
    }

    // 2. License expiry check
    if (driver.licenseExpiry < now) {
      blockingReasons.push({ code: 'LICENSE_EXPIRED', message: 'Driving license has expired' });
    } else {
      const daysLeft = Math.ceil((driver.licenseExpiry.getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 7) {
        blockingReasons.push({ code: 'LICENSE_CRITICAL', message: `License expires in ${daysLeft} days — critical` });
      } else if (daysLeft <= 30) {
        warnings.push({ code: 'LICENSE_EXPIRING', message: `License expires in ${daysLeft} days` });
        expiringDocuments.push({ type: 'DRIVING_LICENSE', expiry: driver.licenseExpiry, daysLeft });
      }
    }

    // 3. Document checks
    const mandatoryDocTypes = ['DRIVING_LICENSE'];
    const docs = await this.prisma.complianceDocument.findMany({
      where: { companyId, entityType: 'DRIVER', entityId: driverId },
    });
    const foundDocTypes = new Set(docs.map(d => d.documentType));

    for (const mandatory of mandatoryDocTypes) {
      if (!foundDocTypes.has(mandatory as any)) {
        blockingReasons.push({ code: `${mandatory}_MISSING`, message: `Required document ${mandatory} not uploaded` });
      }
    }

    for (const doc of docs) {
      if (doc.expiryDate && doc.expiryDate < now) {
        blockingReasons.push({
          code: `${doc.documentType}_EXPIRED`,
          message: `${doc.documentType} expired on ${doc.expiryDate.toISOString().split('T')[0]}`,
        });
      } else if (doc.expiryDate) {
        const daysLeft = Math.ceil((doc.expiryDate.getTime() - now.getTime()) / 86400000);
        if (daysLeft <= 30) {
          warnings.push({ code: `${doc.documentType}_EXPIRING`, message: `${doc.documentType} expires in ${daysLeft} days` });
          expiringDocuments.push({ type: doc.documentType, expiry: doc.expiryDate, daysLeft });
        }
      }
      if (doc.verificationStatus === 'PENDING') {
        warnings.push({ code: `${doc.documentType}_UNVERIFIED`, message: `${doc.documentType} pending verification` });
      }
    }

    // 4. Verification status
    if (driver.verificationStatus !== 'VERIFIED') {
      warnings.push({ code: 'DRIVER_UNVERIFIED', message: `Driver verification status: ${driver.verificationStatus}` });
    }

    return {
      eligible: blockingReasons.length === 0,
      blockingReasons,
      warnings,
      expiringDocuments,
      driverStatus: driver.status,
      availabilityStatus: driver.availabilityStatus,
      verificationStatus: driver.verificationStatus,
    };
  }

  // ============================================================
  // VEHICLE COMPLIANCE CHECK (reusable by dispatch, trip, etc.)
  // ============================================================

  async checkVehicleCompliance(companyId: string, vehicleId: string): Promise<{
    eligible: boolean;
    blockingReasons: Array<{ code: string; message: string }>;
    warnings: Array<{ code: string; message: string }>;
    expiringDocuments: Array<{ type: string; expiry: Date; daysLeft: number }>;
    vehicleStatus: string;
    documentCount: number;
  }> {
    if (!this.prisma.isConnected()) {
      return this._demoVehicleCompliance(vehicleId);
    }

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const now = new Date();
    const blockingReasons: Array<{ code: string; message: string }> = [];
    const warnings: Array<{ code: string; message: string }> = [];
    const expiringDocuments: Array<{ type: string; expiry: Date; daysLeft: number }> = [];

    // 1. Vehicle status check
    const blockingStatuses = ['BREAKDOWN', 'MAINTENANCE_REQUIRED', 'UNDER_REPAIR', 'BLOCKED', 'RETIRED'];
    if (blockingStatuses.includes(vehicle.status)) {
      blockingReasons.push({
        code: 'VEHICLE_STATUS_BLOCKED',
        message: `Vehicle status is ${vehicle.status}`,
      });
    }

    // 2. Mandatory document check
    const mandatoryDocTypes = ['REGISTRATION', 'INSURANCE', 'PUC'];
    const docs = await this.prisma.complianceDocument.findMany({
      where: { companyId, entityType: 'VEHICLE', entityId: vehicleId },
    });
    const foundDocTypes = new Set(docs.map(d => d.documentType));

    for (const mandatory of mandatoryDocTypes) {
      if (!foundDocTypes.has(mandatory as any)) {
        blockingReasons.push({
          code: `${mandatory}_MISSING`,
          message: `Required document ${mandatory} not uploaded`,
        });
      }
    }

    // 3. Document expiry checks
    for (const doc of docs) {
      if (doc.expiryDate && doc.expiryDate < now) {
        blockingReasons.push({
          code: `${doc.documentType}_EXPIRED`,
          message: `${doc.documentType} expired on ${doc.expiryDate.toISOString().split('T')[0]}`,
        });
      } else if (doc.expiryDate) {
        const daysLeft = Math.ceil((doc.expiryDate.getTime() - now.getTime()) / 86400000);
        if (daysLeft <= 7) {
          blockingReasons.push({
            code: `${doc.documentType}_CRITICAL`,
            message: `${doc.documentType} expires in ${daysLeft} days — critical`,
          });
        } else if (daysLeft <= 30) {
          warnings.push({ code: `${doc.documentType}_EXPIRING`, message: `${doc.documentType} expires in ${daysLeft} days` });
          expiringDocuments.push({ type: doc.documentType, expiry: doc.expiryDate, daysLeft });
        }
      }
      if (doc.verificationStatus === 'PENDING') {
        warnings.push({ code: `${doc.documentType}_UNVERIFIED`, message: `${doc.documentType} pending verification` });
      }
    }

    return {
      eligible: blockingReasons.length === 0,
      blockingReasons,
      warnings,
      expiringDocuments,
      vehicleStatus: vehicle.status,
      documentCount: docs.length,
    };
  }

  // ============================================================
  // COMBINED DRIVER + VEHICLE ELIGIBILITY
  // ============================================================

  async checkDriverVehicleEligibility(companyId: string, driverId: string, vehicleId: string): Promise<{
    eligible: boolean;
    driverEligible: boolean;
    vehicleEligible: boolean;
    driverBlockingReasons: Array<{ code: string; message: string }>;
    vehicleBlockingReasons: Array<{ code: string; message: string }>;
    driverWarnings: Array<{ code: string; message: string }>;
    vehicleWarnings: Array<{ code: string; message: string }>;
    combinedBlockingReasons: Array<{ code: string; message: string }>;
  }> {
    const [driverCompliance, vehicleCompliance] = await Promise.all([
      this.checkDriverCompliance(companyId, driverId),
      this.checkVehicleCompliance(companyId, vehicleId),
    ]);

    const combinedBlockingReasons: Array<{ code: string; message: string }> = [];

    // Check license category vs vehicle type compatibility
    if (this.prisma.isConnected()) {
      const driver = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
      const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });

      if (driver && vehicle && driver.licenseCategory && vehicle.vehicleType) {
        const compatibility = this.checkLicenseVehicleCompatibility(driver.licenseCategory, vehicle.vehicleType);
        if (!compatibility.compatible) {
          combinedBlockingReasons.push({
            code: 'LICENSE_VEHICLE_INCOMPATIBLE',
            message: compatibility.reason,
          });
        }
      }
    }

    // Availability checks
    if (!this.prisma.isConnected()) {
      // Demo mode — assume available
    } else {
      const driver = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
      if (driver && driver.availabilityStatus === 'ON_TRIP') {
        combinedBlockingReasons.push({
          code: 'DRIVER_ALREADY_ON_TRIP',
          message: 'Driver is currently on another trip',
        });
      }
    }

    return {
      eligible: driverCompliance.eligible && vehicleCompliance.eligible && combinedBlockingReasons.length === 0,
      driverEligible: driverCompliance.eligible,
      vehicleEligible: vehicleCompliance.eligible,
      driverBlockingReasons: driverCompliance.blockingReasons,
      vehicleBlockingReasons: vehicleCompliance.blockingReasons,
      driverWarnings: driverCompliance.warnings,
      vehicleWarnings: vehicleCompliance.warnings,
      combinedBlockingReasons,
    };
  }

  // ============================================================
  // LICENSE CATEGORY vs VEHICLE TYPE COMPATIBILITY
  // ============================================================

  private checkLicenseVehicleCompatibility(licenseCategory: string, vehicleType: string): {
    compatible: boolean; reason: string;
  } {
    const category = licenseCategory.toUpperCase();
    const vType = vehicleType.toUpperCase();

    // Simple mapping — extend as needed
    const allowed: Record<string, string[]> = {
      'LMV': ['SEDAN', 'SUV', 'HATCHBACK', 'MUV', 'EV_CAB', 'OTHER'],
      'HMV': ['SEDAN', 'SUV', 'HATCHBACK', 'MUV', 'VAN', 'MINIBUS', 'BUS', 'EV_CAB', 'OTHER'],
      'MCWG': ['TWO_WHEELER'],
    };

    const permitted = allowed[category];
    if (!permitted) {
      return { compatible: true, reason: '' }; // Unknown category — allow (configurable later)
    }
    if (!permitted.includes(vType)) {
      return {
        compatible: false,
        reason: `License category ${category} does not permit driving ${vType}`,
      };
    }

    return { compatible: true, reason: '' };
  }

  // ============================================================
  // DOCUMENT EXPIRY BATCH CHECK
  // ============================================================

  async getExpiringDocuments(companyId: string, daysAhead: number = 60) {
    if (!this.prisma.isConnected()) return this._demoExpiringDocs();

    const now = new Date();
    const cutoffDate = new Date(now.getTime() + daysAhead * 86400000);

    const docs = await this.prisma.complianceDocument.findMany({
      where: {
        companyId,
        expiryDate: { not: null, lte: cutoffDate },
        verificationStatus: { not: 'REJECTED' },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return docs.map(doc => ({
      id: doc.id,
      entityType: doc.entityType,
      entityId: doc.entityId,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      expiryDate: doc.expiryDate,
      daysLeft: Math.ceil((doc.expiryDate!.getTime() - now.getTime()) / 86400000),
      urgency: this.getUrgencyLevel(doc.expiryDate!, now),
    }));
  }

  private getUrgencyLevel(expiry: Date, now: string | Date): string {
    const nowDate = typeof now === 'string' ? new Date(now) : now;
    const daysLeft = Math.ceil((expiry.getTime() - nowDate.getTime()) / 86400000);
    if (daysLeft <= 0) return 'EXPIRED';
    if (daysLeft <= 1) return 'CRITICAL_1_DAY';
    if (daysLeft <= 7) return 'CRITICAL_7_DAYS';
    if (daysLeft <= 15) return 'HIGH_15_DAYS';
    if (daysLeft <= 30) return 'MEDIUM_30_DAYS';
    if (daysLeft <= 60) return 'LOW_60_DAYS';
    return 'OK';
  }

  // ============================================================
  // DEMO DATA
  // ============================================================

  private _demoDriverCompliance(driverId: string) {
    return {
      driverId,
      eligible: true,
      blockingReasons: [],
      warnings: [{ code: 'MEDICAL_CERTIFICATE_UNVERIFIED', message: 'Medical certificate pending verification' }],
      expiringDocuments: [{ type: 'MEDICAL_CERTIFICATE', expiry: new Date('2025-12-31'), daysLeft: 122 }],
      driverStatus: 'ACTIVE',
      availabilityStatus: 'AVAILABLE',
      verificationStatus: 'VERIFIED',
    };
  }

  private _demoVehicleCompliance(vehicleId: string) {
    return {
      vehicleId,
      eligible: true,
      blockingReasons: [],
      warnings: [{ code: 'PUC_UNVERIFIED', message: 'PUC certificate pending verification' }],
      expiringDocuments: [{ type: 'FITNESS_CERTIFICATE', expiry: new Date('2025-09-30'), daysLeft: 30 }],
      vehicleStatus: 'AVAILABLE',
      documentCount: 5,
    };
  }

  private _demoExpiringDocs() {
    const now = new Date();
    return [
      { id: 'doc-001', entityType: 'VEHICLE', entityId: 'veh-001', documentType: 'FITNESS_CERTIFICATE', expiryDate: new Date(now.getTime() + 30 * 86400000), daysLeft: 30, urgency: 'MEDIUM_30_DAYS' },
      { id: 'doc-002', entityType: 'DRIVER', entityId: 'drv-001', documentType: 'POLICE_VERIFICATION', expiryDate: new Date(now.getTime() + 15 * 86400000), daysLeft: 15, urgency: 'HIGH_15_DAYS' },
      { id: 'doc-003', entityType: 'VEHICLE', entityId: 'veh-003', documentType: 'PUC', expiryDate: new Date(now.getTime() - 5 * 86400000), daysLeft: -5, urgency: 'EXPIRED' },
    ];
  }
}
