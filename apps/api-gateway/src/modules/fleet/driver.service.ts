import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class DriverService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // VALID STATE TRANSITIONS
  // ============================================================

  private static DRIVER_STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING_VERIFICATION: ['ACTIVE', 'REJECTED'],
    ACTIVE: ['SUSPENDED', 'INACTIVE'],
    SUSPENDED: ['ACTIVE'],
    INACTIVE: ['ACTIVE'],
    BLOCKED: ['ACTIVE'],
    REJECTED: [],
  };

  private validateStatusTransition(current: string, next: string) {
    const allowed = DriverService.DRIVER_STATUS_TRANSITIONS[current];
    if (!allowed || !allowed.includes(next)) {
      throw new BadRequestException(`INVALID_STATE_TRANSITION: Cannot move from ${current} to ${next}`);
    }
  }

  // ============================================================
  // DRIVER CRUD
  // ============================================================

  async createDriver(companyId: string, performedBy: string, data: {
    userId?: string;
    driverCode: string;
    firstName: string;
    lastName: string;
    mobile: string;
    email?: string;
    licenseNo: string;
    licenseExpiry: string;
    licenseCategory?: string;
    vendorId?: string;
    city?: string;
    state?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Uniqueness checks
    const existingCode = await this.prisma.driverProfile.findFirst({
      where: { companyId, driverCode: data.driverCode },
    });
    if (existingCode) throw new ConflictException(`Driver code "${data.driverCode}" already exists`);

    const driver = await this.prisma.driverProfile.create({
      data: {
        companyId,
        userId: data.userId || `temp-${Date.now()}`,
        driverCode: data.driverCode,
        licenseNo: data.licenseNo,
        licenseExpiry: new Date(data.licenseExpiry),
        licenseCategory: data.licenseCategory,
        vendorId: data.vendorId,
        status: 'PENDING_VERIFICATION',
        availabilityStatus: 'OFF_DUTY',
        verificationStatus: 'PENDING',
        city: data.city,
        state: data.state,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
      },
      include: { user: { select: { id: true, name: true, email: true } } } as any,
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_CREATED',
      entity: 'DriverProfile', entityId: driver.id,
      newValue: { driverCode: data.driverCode, name: `${data.firstName} ${data.lastName}` },
    });

    return driver;
  }

  async listDrivers(companyId: string, params: {
    page?: number; limit?: number; search?: string;
    status?: string; availability?: string; vendorId?: string;
    verification?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params.search) {
      where.OR = [
        { driverCode: { contains: params.search } },
        { user: { name: { contains: params.search } } },
        { user: { phone: { contains: params.search } } },
      ];
    }
    if (params.status) where.status = params.status;
    if (params.availability) where.availabilityStatus = params.availability;
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.verification) where.verificationStatus = params.verification;

    const [drivers, total] = await Promise.all([
      this.prisma.driverProfile.findMany({
        where, skip, take: limit,
        include: {
          User: { select: { id: true, name: true, email: true, phone: true } },
          Vendor: { select: { id: true, name: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverProfile.count({ where }),
    ]);

    return {
      data: drivers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDriver(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const driver = await this.prisma.driverProfile.findFirst({
      where: { id: driverId, companyId },
      include: {
        User: { select: { id: true, name: true, email: true, phone: true } },
        Vendor: { select: { id: true, name: true } },
        vehicle: { select: { id: true, registrationNo: true, vehicleType: true, make: true, model: true } },
        complianceStatus: true,
      } as any,
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async updateDriver(companyId: string, performedBy: string, driverId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
    if (!existing) throw new NotFoundException('Driver not found');

    const allowed = ['licenseNo', 'licenseExpiry', 'licenseCategory', 'vendorId', 'city', 'state', 'emergencyContactName', 'emergencyContactPhone'];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = key === 'licenseExpiry' ? new Date(data[key]) : data[key];
    }

    const updated = await this.prisma.driverProfile.update({
      where: { id: driverId }, data: updateData,
      include: { user: { select: { name: true, email: true } } } as any,
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_UPDATED',
      entity: 'DriverProfile', entityId: driverId, newValue: updateData,
    });

    return updated;
  }

  // ============================================================
  // STATUS TRANSITIONS
  // ============================================================

  async verifyDriver(companyId: string, performedBy: string, driverId: string) {
    return this.changeStatus(companyId, performedBy, driverId, 'ACTIVE', 'VERIFIED');
  }

  async suspendDriver(companyId: string, performedBy: string, driverId: string, reason?: string) {
    return this.changeStatus(companyId, performedBy, driverId, 'SUSPENDED', undefined, reason);
  }

  async activateDriver(companyId: string, performedBy: string, driverId: string) {
    return this.changeStatus(companyId, performedBy, driverId, 'ACTIVE', undefined);
  }

  private async changeStatus(companyId: string, performedBy: string, driverId: string, newStatus: string, verificationStatus?: string, reason?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
    if (!existing) throw new NotFoundException('Driver not found');

    this.validateStatusTransition(existing.status, newStatus);

    const updateData: any = { status: newStatus as any };
    if (verificationStatus) updateData.verificationStatus = verificationStatus as any;
    if (newStatus === 'SUSPENDED') updateData.availabilityStatus = 'UNAVAILABLE';

    const updated = await this.prisma.driverProfile.update({
      where: { id: driverId }, data: updateData,
    });

    await this.audit.log({
      companyId, userId: performedBy,
      action: `DRIVER_${newStatus.toUpperCase()}`, entity: 'DriverProfile', entityId: driverId,
      oldValue: { status: existing.status }, newValue: { status: newStatus, reason },
    });

    return updated;
  }

  // ============================================================
  // DRIVER DOCUMENTS
  // ============================================================

  async listDocuments(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.complianceDocument.findMany({
      where: { companyId, entityType: 'DRIVER', entityId: driverId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(companyId: string, performedBy: string, driverId: string, data: {
    documentType: string;
    documentNumber: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    fileType?: string;
    notes?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const doc = await this.prisma.complianceDocument.create({
      data: {
        companyId, entityType: 'DRIVER', entityId: driverId,
        documentType: data.documentType as any,
        documentNumber: data.documentNumber,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        issuingAuthority: data.issuingAuthority,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        fileType: data.fileType,
        status: 'UPLOADED',
        verificationStatus: 'PENDING',
        uploadedById: performedBy,
        notes: data.notes,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_DOCUMENT_UPLOADED',
      entity: 'ComplianceDocument', entityId: doc.id,
      newValue: { documentType: data.documentType, driverId },
    });

    return doc;
  }

  async verifyDocument(companyId: string, performedBy: string, documentId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const doc = await this.prisma.complianceDocument.findFirst({ where: { id: documentId, companyId } });
    if (!doc) throw new NotFoundException('Document not found');

    const updated = await this.prisma.complianceDocument.update({
      where: { id: documentId },
      data: {
        status: 'VERIFIED' as any,
        verificationStatus: 'APPROVED' as any,
        verifiedById: performedBy,
        verifiedAt: new Date(),
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_DOCUMENT_VERIFIED',
      entity: 'ComplianceDocument', entityId: documentId,
    });

    return updated;
  }

  async rejectDocument(companyId: string, performedBy: string, documentId: string, reason: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const updated = await this.prisma.complianceDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED' as any,
        verificationStatus: 'REJECTED' as any,
        rejectedById: performedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_DOCUMENT_REJECTED',
      entity: 'ComplianceDocument', entityId: documentId,
      newValue: { reason },
    });

    return updated;
  }

  // ============================================================
  // DRIVER COMPLIANCE
  // ============================================================

  async checkCompliance(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const driver = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const now = new Date();
    const blockingReasons: Array<{ code: string; message: string }> = [];
    const warnings: Array<{ code: string; message: string }> = [];
    const expiringDocuments: Array<{ type: string; expiry: Date; daysLeft: number }> = [];

    // Check driver status
    if (driver.status !== 'ACTIVE') {
      blockingReasons.push({ code: 'DRIVER_INACTIVE', message: `Driver status is ${driver.status}` });
    }

    // Check license expiry
    if (driver.licenseExpiry < now) {
      blockingReasons.push({ code: 'DRIVER_LICENSE_EXPIRED', message: 'Driving license has expired' });
    } else {
      const daysLeft = Math.ceil((driver.licenseExpiry.getTime() - now.getTime()) / 86400000);
      if (daysLeft <= 30) {
        warnings.push({ code: 'DRIVER_LICENSE_EXPIRING', message: `License expires in ${daysLeft} days` });
        expiringDocuments.push({ type: 'DRIVING_LICENSE', expiry: driver.licenseExpiry, daysLeft });
      }
    }

    // Check documents
    const documents = await this.prisma.complianceDocument.findMany({
      where: { companyId, entityType: 'DRIVER', entityId: driverId },
    });

    for (const doc of documents) {
      if (doc.expiryDate && doc.expiryDate < now) {
        if (doc.verificationStatus !== 'REJECTED') {
          blockingReasons.push({ code: `${doc.documentType}_EXPIRED`, message: `${doc.documentType} has expired` });
        }
      } else if (doc.expiryDate) {
        const daysLeft = Math.ceil((doc.expiryDate.getTime() - now.getTime()) / 86400000);
        if (daysLeft <= 30) {
          warnings.push({ code: `${doc.documentType}_EXPIRING`, message: `${doc.documentType} expires in ${daysLeft} days` });
          expiringDocuments.push({ type: doc.documentType, expiry: doc.expiryDate, daysLeft });
        }
      }
      if (doc.verificationStatus === 'PENDING') {
        warnings.push({ code: `${doc.documentType}_UNVERIFIED`, message: `${doc.documentType} is pending verification` });
      }
    }

    return {
      driverId,
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
  // CHECK-IN / CHECK-OUT / BREAK
  // ============================================================

  async checkIn(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const driver = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
    if (!driver) throw new NotFoundException('Driver not found');
    if (driver.status !== 'ACTIVE') throw new BadRequestException(`DRIVER_INACTIVE: Cannot check in with status ${driver.status}`);

    const compliance = await this.checkCompliance(companyId, driverId);
    if (!compliance.eligible) {
      throw new BadRequestException(`DRIVER_NOT_ELIGIBLE: ${compliance.blockingReasons.map(b => b.message).join('; ')}`);
    }

    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { availabilityStatus: 'AVAILABLE' },
    });

    const session = await this.prisma.driverWorkSession.create({
      data: { companyId, driverId, status: 'ACTIVE' },
    });

    await this.audit.log({
      companyId, userId: driverId, action: 'DRIVER_CHECK_IN',
      entity: 'DriverProfile', entityId: driverId,
    });

    return { checkedIn: true, sessionId: session.id };
  }

  async checkOut(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const driver = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
    if (!driver) throw new NotFoundException('Driver not found');

    // Check for active trips
    const activeTrips = await this.prisma.trip.count({
      where: { companyId, driverId, status: { in: ['SCHEDULED', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'BOARDING', 'IN_TRANSIT'] } },
    });
    if (activeTrips > 0) {
      throw new BadRequestException('Cannot check out with active trips');
    }

    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { availabilityStatus: 'OFF_DUTY' },
    });

    // Complete active session
    const activeSession = await this.prisma.driverWorkSession.findFirst({
      where: { companyId, driverId, status: { in: ['ACTIVE', 'ON_BREAK'] } },
    });
    if (activeSession) {
      const totalSessionMinutes = Math.round((Date.now() - activeSession.startedAt.getTime()) / 60000);
      // Subtract break duration to get actual driving time
      const breakMinutes = activeSession.breakDuration || 0;
      const totalDrivingMinutes = Math.max(0, totalSessionMinutes - breakMinutes);
      await this.prisma.driverWorkSession.update({
        where: { id: activeSession.id },
        data: {
          endedAt: new Date(),
          status: 'COMPLETED',
          totalDrivingMinutes,
          breakEndedAt: activeSession.status === 'ON_BREAK' ? new Date() : activeSession.breakEndedAt,
        },
      });
    }

    await this.audit.log({
      companyId, userId: driverId, action: 'DRIVER_CHECK_OUT',
      entity: 'DriverProfile', entityId: driverId,
    });

    return { checkedOut: true };
  }

  async startBreak(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const session = await this.prisma.driverWorkSession.findFirst({
      where: { companyId, driverId, status: 'ACTIVE' },
    });
    if (!session) throw new BadRequestException('No active work session');

    await this.prisma.driverWorkSession.update({
      where: { id: session.id },
      data: { status: 'ON_BREAK', breakStartedAt: new Date() },
    });

    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { availabilityStatus: 'ON_BREAK' },
    });

    await this.audit.log({
      companyId, userId: driverId, action: 'DRIVER_BREAK_START',
      entity: 'DriverWorkSession', entityId: session.id,
    });

    return { breakStarted: true };
  }

  async endBreak(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const session = await this.prisma.driverWorkSession.findFirst({
      where: { companyId, driverId, status: 'ON_BREAK' },
    });
    if (!session) throw new BadRequestException('No active break');

    const breakDuration = session.breakStartedAt
      ? Math.round((Date.now() - session.breakStartedAt.getTime()) / 60000)
      : 0;

    await this.prisma.driverWorkSession.update({
      where: { id: session.id },
      data: { status: 'ACTIVE', breakEndedAt: new Date(), breakDuration: { increment: breakDuration } },
    });

    await this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { availabilityStatus: 'AVAILABLE' },
    });

    await this.audit.log({
      companyId, userId: driverId, action: 'DRIVER_BREAK_END',
      entity: 'DriverWorkSession', entityId: session.id,
      newValue: { breakDuration },
    });

    return { breakEnded: true, breakDuration };
  }

  // ============================================================
  // SHIFTS
  // ============================================================

  async listShifts(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.driverShift.findMany({
      where: { companyId, driverId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createShift(companyId: string, driverId: string, data: {
    shiftName: string; startTime: string; endTime: string;
    breakDuration?: number; effectiveFrom?: string; effectiveTo?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Deactivate previous active shift
    await this.prisma.driverShift.updateMany({
      where: { companyId, driverId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.driverShift.create({
      data: {
        companyId, driverId,
        shiftName: data.shiftName,
        startTime: data.startTime,
        endTime: data.endTime,
        breakDuration: data.breakDuration || 60,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
        isActive: true,
      },
    });
  }

  // ============================================================
  // VEHICLE ASSIGNMENTS
  // ============================================================

  async listVehicleAssignments(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.driverVehicleAssignment.findMany({
      where: { companyId, driverId },
      include: { vehicle: { select: { id: true, registrationNo: true, vehicleType: true } } } as any,
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignVehicle(companyId: string, performedBy: string, driverId: string, vehicleId: string, type?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const driver = await this.prisma.driverProfile.findFirst({ where: { id: driverId, companyId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.status !== 'AVAILABLE') throw new BadRequestException(`Vehicle is ${vehicle.status}`);

    // Deactivate previous assignments
    await this.prisma.driverVehicleAssignment.updateMany({
      where: { companyId, driverId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', endAt: new Date() },
    });

    const assignment = await this.prisma.driverVehicleAssignment.create({
      data: {
        companyId, driverId, vehicleId,
        assignmentType: type || 'PRIMARY',
        assignedBy: performedBy,
      },
    });

    // Link driver to vehicle
    await this.prisma.driverProfile.update({ where: { id: driverId }, data: { vehicleId } });
    await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ASSIGNED' } });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_VEHICLE_ASSIGNED',
      entity: 'DriverVehicleAssignment', entityId: assignment.id,
      newValue: { driverId, vehicleId, type },
    });

    return assignment;
  }
}
