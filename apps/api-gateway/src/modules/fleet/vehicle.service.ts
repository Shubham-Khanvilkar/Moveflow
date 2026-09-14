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
export class VehicleService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // VALID STATE TRANSITIONS
  // ============================================================

  private static VEHICLE_STATUS_TRANSITIONS: Record<string, string[]> = {
    PENDING_VERIFICATION: ['AVAILABLE', 'BLOCKED'],
    AVAILABLE: ['ASSIGNED', 'BREAKDOWN', 'MAINTENANCE_REQUIRED', 'BLOCKED', 'RETIRED'],
    ASSIGNED: ['ON_TRIP', 'AVAILABLE'],
    ON_TRIP: ['AVAILABLE', 'BREAKDOWN'],
    BREAKDOWN: ['MAINTENANCE_REQUIRED'],
    MAINTENANCE_REQUIRED: ['UNDER_REPAIR'],
    UNDER_REPAIR: ['MAINTENANCE_CLEARED'],
    MAINTENANCE_CLEARED: ['AVAILABLE'],
    BLOCKED: ['AVAILABLE'],
    RETIRED: [],
  };

  private validateVehicleStatusTransition(current: string, next: string) {
    const allowed = VehicleService.VEHICLE_STATUS_TRANSITIONS[current];
    if (!allowed || !allowed.includes(next)) {
      throw new BadRequestException(
        `INVALID_STATE_TRANSITION: Cannot move vehicle from ${current} to ${next}`,
      );
    }
  }

  // ============================================================
  // VEHICLE CRUD
  // ============================================================

  async createVehicle(companyId: string, performedBy: string, data: {
    registrationNo: string;
    vehicleType: string;
    capacity?: number;
    acType?: string;
    fuelType?: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    ownershipType?: string;
    vendorId?: string;
    isEV?: boolean;
    batteryCapacity?: number;
    estimatedRangeKm?: number;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existingReg = await this.prisma.vehicle.findFirst({
      where: { companyId, registrationNo: data.registrationNo },
    });
    if (existingReg) {
      throw new ConflictException(`Vehicle with registration "${data.registrationNo}" already exists`);
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        companyId,
        registrationNo: data.registrationNo,
        vehicleType: data.vehicleType as any,
        capacity: data.capacity || 4,
        acType: data.acType as any || 'NON_AC',
        fuelType: data.fuelType as any || 'PETROL',
        make: data.make,
        model: data.model,
        year: data.year,
        color: data.color,
        ownershipType: data.ownershipType as any || 'COMPANY_OWNED',
        vendorId: data.vendorId,
        status: 'PENDING_VERIFICATION',
        isEV: data.isEV || false,
        batteryCapacity: data.batteryCapacity,
        estimatedRangeKm: data.estimatedRangeKm,
      },
      include: { vendor: { select: { id: true, name: true } } } as any,
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VEHICLE_CREATED',
      entity: 'Vehicle', entityId: vehicle.id,
      newValue: { registrationNo: data.registrationNo, vehicleType: data.vehicleType },
    });

    return vehicle;
  }

  async listVehicles(companyId: string, params: {
    page?: number; limit?: number; search?: string;
    status?: string; vehicleType?: string; acType?: string;
    fuelType?: string; vendorId?: string; ownershipType?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params.search) {
      where.OR = [
        { registrationNo: { contains: params.search } },
        { make: { contains: params.search } },
        { model: { contains: params.search } },
      ];
    }
    if (params.status) where.status = params.status;
    if (params.vehicleType) where.vehicleType = params.vehicleType;
    if (params.acType) where.acType = params.acType;
    if (params.fuelType) where.fuelType = params.fuelType;
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.ownershipType) where.ownershipType = params.ownershipType;

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where, skip, take: limit,
        include: {
          Vendor: { select: { id: true, name: true } },
          DriverProfile: { select: { id: true, driverCode: true, User: { select: { name: true } } } },
        } as any,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: vehicles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVehicle(companyId: string, vehicleId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
      include: {
        Vendor: { select: { id: true, name: true } },
        DriverProfile: {
          select: { id: true, driverCode: true, User: { select: { name: true, phone: true } } },
        },
        maintenanceRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
        inspections: { orderBy: { createdAt: 'desc' }, take: 10 },
        breakdowns: { orderBy: { reportedAt: 'desc' }, take: 5 },
      } as any,
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async updateVehicle(companyId: string, performedBy: string, vehicleId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!existing) throw new NotFoundException('Vehicle not found');

    const allowed = ['make', 'model', 'year', 'color', 'capacity', 'acType', 'fuelType',
      'ownershipType', 'vendorId', 'isEV', 'batteryCapacity', 'estimatedRangeKm'];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId }, data: updateData,
      include: { vendor: { select: { name: true } } } as any,
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VEHICLE_UPDATED',
      entity: 'Vehicle', entityId: vehicleId, newValue: updateData,
    });

    return updated;
  }

  async deleteVehicle(companyId: string, performedBy: string, vehicleId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.status === 'ON_TRIP') {
      throw new BadRequestException('Cannot delete vehicle during active trip');
    }

    await this.prisma.vehicle.delete({ where: { id: vehicleId } });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VEHICLE_DELETED',
      entity: 'Vehicle', entityId: vehicleId,
    });

    return { id: vehicleId, deleted: true };
  }

  // ============================================================
  // STATUS TRANSITIONS
  // ============================================================

  async verifyVehicle(companyId: string, performedBy: string, vehicleId: string) {
    return this.changeVehicleStatus(companyId, performedBy, vehicleId, 'AVAILABLE');
  }

  async blockVehicle(companyId: string, performedBy: string, vehicleId: string, reason?: string) {
    return this.changeVehicleStatus(companyId, performedBy, vehicleId, 'BLOCKED', reason);
  }

  async unblockVehicle(companyId: string, performedBy: string, vehicleId: string) {
    return this.changeVehicleStatus(companyId, performedBy, vehicleId, 'AVAILABLE');
  }

  async retireVehicle(companyId: string, performedBy: string, vehicleId: string) {
    return this.changeVehicleStatus(companyId, performedBy, vehicleId, 'RETIRED');
  }

  private async changeVehicleStatus(
    companyId: string, performedBy: string, vehicleId: string, newStatus: string, reason?: string,
  ) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!existing) throw new NotFoundException('Vehicle not found');

    this.validateVehicleStatusTransition(existing.status, newStatus);

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: newStatus as any },
    });

    await this.audit.log({
      companyId, userId: performedBy,
      action: `VEHICLE_${newStatus.toUpperCase()}`, entity: 'Vehicle', entityId: vehicleId,
      oldValue: { status: existing.status }, newValue: { status: newStatus, reason },
    });

    return updated;
  }

  // ============================================================
  // VEHICLE DOCUMENTS
  // ============================================================

  async listDocuments(companyId: string, vehicleId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.complianceDocument.findMany({
      where: { companyId, entityType: 'VEHICLE', entityId: vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(companyId: string, performedBy: string, vehicleId: string, data: {
    documentType: string;
    documentNumber: string;
    issueDate?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    provider?: string;
    coverageDetails?: string;
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
        companyId, entityType: 'VEHICLE', entityId: vehicleId,
        documentType: data.documentType as any,
        documentNumber: data.documentNumber,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        issuingAuthority: data.issuingAuthority,
        insuranceProvider: data.provider,
        coverageType: data.coverageDetails,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        fileType: data.fileType,
        status: 'UPLOADED',
        verificationStatus: 'PENDING' as any,
        uploadedById: performedBy,
        notes: data.notes,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VEHICLE_DOCUMENT_UPLOADED',
      entity: 'ComplianceDocument', entityId: doc.id,
      newValue: { documentType: data.documentType, vehicleId },
    });

    return doc;
  }

  async verifyDocument(companyId: string, performedBy: string, documentId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const doc = await this.prisma.complianceDocument.findFirst({ where: { id: documentId, companyId } });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.complianceDocument.update({
      where: { id: documentId },
      data: {
        status: 'VERIFIED' as any,
        verificationStatus: 'APPROVED' as any,
        verifiedById: performedBy,
        verifiedAt: new Date(),
      },
    });
  }

  async rejectDocument(companyId: string, performedBy: string, documentId: string, reason: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const doc = await this.prisma.complianceDocument.update({
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
      companyId, userId: performedBy, action: 'VEHICLE_DOCUMENT_REJECTED',
      entity: 'ComplianceDocument', entityId: documentId,
      newValue: { documentType: doc.documentType, reason },
    });

    return doc;
  }

  // ============================================================
  // VEHICLE COMPLIANCE
  // ============================================================

  async checkCompliance(companyId: string, vehicleId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const now = new Date();
    const blockingReasons: Array<{ code: string; message: string }> = [];
    const warnings: Array<{ code: string; message: string }> = [];
    const expiringDocuments: Array<{ type: string; expiry: Date; daysLeft: number }> = [];

    // Check vehicle status
    const blockedStatuses = ['BREAKDOWN', 'MAINTENANCE_REQUIRED', 'UNDER_REPAIR', 'BLOCKED', 'RETIRED'];
    if (blockedStatuses.includes(vehicle.status)) {
      blockingReasons.push({
        code: 'VEHICLE_STATUS_BLOCKED',
        message: `Vehicle status is ${vehicle.status}`,
      });
    }

    // Check compliance documents
    const docs = await this.prisma.complianceDocument.findMany({
      where: { companyId, entityType: 'VEHICLE', entityId: vehicleId },
    });

    // Mandatory document types
    const mandatoryTypes = ['REGISTRATION', 'INSURANCE', 'PUC', 'PERMIT', 'FITNESS_CERTIFICATE'];
    const foundTypes = new Set(docs.map(d => d.documentType));

    for (const mandatoryType of mandatoryTypes) {
      if (!foundTypes.has(mandatoryType as any)) {
        blockingReasons.push({
          code: `${mandatoryType}_MISSING`,
          message: `Required document ${mandatoryType} not uploaded`,
        });
      }
    }

    for (const doc of docs) {
      if (doc.expiryDate && doc.expiryDate < now) {
        blockingReasons.push({
          code: `${doc.documentType}_EXPIRED`,
          message: `${doc.documentType} has expired on ${doc.expiryDate.toISOString().split('T')[0]}`,
        });
      } else if (doc.expiryDate) {
        const daysLeft = Math.ceil((doc.expiryDate.getTime() - now.getTime()) / 86400000);
        if (daysLeft <= 60) {
          warnings.push({
            code: `${doc.documentType}_EXPIRING`,
            message: `${doc.documentType} expires in ${daysLeft} days`,
          });
          expiringDocuments.push({ type: doc.documentType, expiry: doc.expiryDate, daysLeft });
        }
      }
      if (doc.verificationStatus === 'PENDING') {
        warnings.push({
          code: `${doc.documentType}_UNVERIFIED`,
          message: `${doc.documentType} is pending verification`,
        });
      }
    }

    return {
      vehicleId,
      eligible: blockingReasons.length === 0,
      blockingReasons,
      warnings,
      expiringDocuments,
      vehicleStatus: vehicle.status,
      documentCount: docs.length,
    };
  }

  // ============================================================
  // INSPECTIONS
  // ============================================================

  async listInspections(companyId: string, vehicleId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.vehicleInspection.findMany({
      where: { companyId, vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInspection(companyId: string, performedBy: string, vehicleId: string, data: {
    inspectionType?: string;
    odometerKm?: number;
    checklist?: Array<{ item: string; status: string; notes?: string }>;
    notes?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    // Check for critical failures
    const hasFailures = data.checklist?.some(item => item.status === 'FAIL');

    const inspection = await this.prisma.vehicleInspection.create({
      data: {
        companyId, vehicleId, driverId: performedBy,
        type: (data.inspectionType as any) || 'PRE_TRIP',
        checklist: data.checklist ? JSON.stringify(data.checklist) : [] as any,
        odometer: data.odometerKm,
        notes: data.notes,
        passed: !hasFailures,
      },
    });

    // If critical failure, mark vehicle as maintenance required
    if (hasFailures) {
      const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
      if (vehicle && vehicle.status === 'AVAILABLE') {
        await this.prisma.vehicle.update({
          where: { id: vehicleId },
          data: { status: 'MAINTENANCE_REQUIRED' as any },
        });
      }
    }

    // Validate odometer
    if (data.odometerKm !== undefined) {
      const lastInspection = await this.prisma.vehicleInspection.findFirst({
        where: { companyId, vehicleId, odometer: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      if (lastInspection && lastInspection.odometer && data.odometerKm < lastInspection.odometer) {
        await this.audit.log({
          companyId, userId: performedBy, action: 'ODOMETER_DISCREPANCY_DETECTED',
          entity: 'VehicleInspection', entityId: inspection.id,
          newValue: { odometerKm: data.odometerKm, previousKm: lastInspection.odometer },
        });
      }
    }

    await this.audit.log({
      companyId, userId: performedBy, action: 'VEHICLE_INSPECTION',
      entity: 'VehicleInspection', entityId: inspection.id,
      newValue: { vehicleId, type: data.inspectionType, hasFailures },
    });

    return inspection;
  }

  // ============================================================
  // MAINTENANCE
  // ============================================================

  async listMaintenance(companyId: string, vehicleId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.vehicleMaintenance.findMany({
      where: { companyId, vehicleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMaintenance(companyId: string, performedBy: string, vehicleId: string, data: {
    maintenanceType: string;
    description: string;
    scheduledAt?: string;
    vendorName?: string;
    estimatedCost?: number;
    notes?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const maintenance = await this.prisma.vehicleMaintenance.create({
      data: {
        companyId, vehicleId,
        type: data.maintenanceType as any,
        description: data.description,
        scheduledDate: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
        status: 'SCHEDULED' as any,
        vendor: data.vendorName,
        cost: data.estimatedCost,
        notes: data.notes,
      },
    });

    // Mark vehicle as maintenance required
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (vehicle && vehicle.status === 'AVAILABLE') {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'MAINTENANCE_REQUIRED' as any },
      });
    }

    await this.audit.log({
      companyId, userId: performedBy, action: 'MAINTENANCE_CREATED',
      entity: 'VehicleMaintenance', entityId: maintenance.id,
      newValue: { vehicleId, type: data.maintenanceType },
    });

    return maintenance;
  }

  async startMaintenance(companyId: string, performedBy: string, maintenanceId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const maintenance = await this.prisma.vehicleMaintenance.findFirst({
      where: { id: maintenanceId, companyId },
    });
    if (!maintenance) throw new NotFoundException('Maintenance record not found');

    const updated = await this.prisma.vehicleMaintenance.update({
      where: { id: maintenanceId },
      data: { status: 'IN_PROGRESS' as any },
    });

    // Set vehicle to UNDER_REPAIR
    await this.prisma.vehicle.update({
      where: { id: maintenance.vehicleId },
      data: { status: 'UNDER_REPAIR' as any },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'MAINTENANCE_STARTED',
      entity: 'VehicleMaintenance', entityId: maintenanceId,
    });

    return updated;
  }

  async completeMaintenance(companyId: string, performedBy: string, maintenanceId: string, data?: {
    actualCost?: number; notes?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const maintenance = await this.prisma.vehicleMaintenance.findFirst({
      where: { id: maintenanceId, companyId },
    });
    if (!maintenance) throw new NotFoundException('Maintenance record not found');

    const updated = await this.prisma.vehicleMaintenance.update({
      where: { id: maintenanceId },
      data: {
        status: 'COMPLETED' as any,
        completedDate: new Date(),
        cost: data?.actualCost,
        notes: data?.notes,
      },
    });

    // Clear vehicle maintenance
    await this.prisma.vehicle.update({
      where: { id: maintenance.vehicleId },
      data: { status: 'MAINTENANCE_CLEARED' as any },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'MAINTENANCE_COMPLETED',
      entity: 'VehicleMaintenance', entityId: maintenanceId,
      newValue: { actualCost: data?.actualCost },
    });

    return updated;
  }

  // ============================================================
  // BREAKDOWN FOUNDATION
  // ============================================================

  async reportBreakdown(companyId: string, performedBy: string, vehicleId: string, data: {
    driverId?: string;
    reason: string;
    description?: string;
    locationLat?: number;
    locationLng?: number;
    locationAddress?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // Create breakdown record
    const breakdown = await this.prisma.vehicleBreakdown.create({
      data: {
        companyId, vehicleId,
        driverId: data.driverId || performedBy,
        reportedAt: new Date(),
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        // locationAddress: data.locationAddress, // Not in schema
        reason: data.reason as any,
        description: data.description,
        status: 'REPORTED',
      },
    });

    // Update vehicle status
    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'BREAKDOWN' as any },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'VEHICLE_BREAKDOWN_REPORTED',
      entity: 'VehicleBreakdown', entityId: breakdown.id,
      newValue: { vehicleId, reason: data.reason },
    });

    return breakdown;
  }

  // ============================================================
  // BULK VEHICLE IMPORT
  // ============================================================

  parseVehicleCSV(csvContent: string): any[] {
    const lines = csvContent.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = { rowNumber: i + 1 };
      headers.forEach((header, idx) => {
        const val = (values[idx] || '').trim();
        row[header] = val || undefined;
      });
      if (row.capacity) row.capacity = parseInt(row.capacity);
      if (row.year) row.year = parseInt(row.year);
      rows.push(row);
    }
    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += char; }
    }
    result.push(current);
    return result;
  }

  async bulkImportVehicles(companyId: string, performedBy: string, csvContent: string, dryRun?: boolean) {
    const rows = this.parseVehicleCSV(csvContent);
    const errors: any[] = [];
    const warnings: any[] = [];
    let created = 0;
    let updated = 0;

    for (const row of rows) {
      if (!row.registration_no) {
        errors.push({ rowNumber: row.rowNumber, field: 'registration_no', errorCode: 'REQUIRED', errorMessage: 'Registration number is required' });
        continue;
      }
      if (!row.vehicle_type) {
        errors.push({ rowNumber: row.rowNumber, field: 'vehicle_type', errorCode: 'REQUIRED', errorMessage: 'Vehicle type is required' });
        continue;
      }
      const validTypes = ['CAB', 'SEDAN', 'SUV', 'VAN', 'SHUTTLE', 'BUS'];
      if (row.vehicle_type && !validTypes.includes(row.vehicle_type.toUpperCase())) {
        errors.push({ rowNumber: row.rowNumber, field: 'vehicle_type', errorCode: 'INVALID', errorMessage: `Invalid vehicle type. Must be one of: ${validTypes.join(', ')}` });
      }
    }

    if (errors.length > 0 && !dryRun) {
      return { status: 'VALIDATION_FAILED', totalRows: rows.length, created: 0, updated: 0, failed: errors.length, errors, dryRun };
    }

    if (!dryRun && this.prisma.isConnected()) {
      for (const row of rows) {
        if (errors.some(e => e.rowNumber === row.rowNumber)) continue;
        try {
          const existing = await this.prisma.vehicle.findFirst({
            where: { companyId, registrationNo: row.registration_no.toUpperCase() },
          });

          if (existing) {
            const updateData: any = {};
            if (row.make) updateData.make = row.make;
            if (row.model) updateData.model = row.model;
            if (row.year) updateData.year = row.year;
            if (row.color) updateData.color = row.color;
            if (row.capacity) updateData.capacity = row.capacity;
            if (row.vehicle_type) updateData.vehicleType = row.vehicle_type.toUpperCase();
            if (row.fuel_type) updateData.fuelType = row.fuel_type.toUpperCase();
            if (row.ac_type) updateData.acType = row.ac_type.toUpperCase();
            if (row.ownership_type) updateData.ownershipType = row.ownership_type.toUpperCase();
            if (row.vendor_id) updateData.vendorId = row.vendor_id;

            if (Object.keys(updateData).length > 0) {
              await this.prisma.vehicle.update({ where: { id: existing.id }, data: updateData });
              updated++;
            }
          } else {
            await this.prisma.vehicle.create({
              data: {
                companyId,
                registrationNo: row.registration_no.toUpperCase(),
                vehicleType: (row.vehicle_type || 'SEDAN').toUpperCase() as any,
                capacity: row.capacity || 4,
                acType: (row.ac_type || 'NON_AC').toUpperCase() as any,
                fuelType: (row.fuel_type || 'PETROL').toUpperCase() as any,
                make: row.make,
                model: row.model,
                year: row.year ? parseInt(row.year) : undefined,
                color: row.color,
                ownershipType: (row.ownership_type || 'COMPANY_OWNED').toUpperCase() as any,
                vendorId: row.vendor_id,
                status: 'PENDING_VERIFICATION',
              },
            });
            created++;
          }
        } catch (e: any) {
          errors.push({ rowNumber: row.rowNumber, field: 'general', errorCode: 'DB_ERROR', errorMessage: e.message });
        }
      }
    } else if (dryRun) {
      for (const row of rows) {
        if (!errors.some(e => e.rowNumber === row.rowNumber)) created++;
      }
    }

    await this.audit.log({
      companyId, userId: performedBy, action: 'VEHICLES_BULK_IMPORTED',
      entity: 'Vehicle', entityId: 'bulk',
      newValue: { totalRows: rows.length, created, updated, failed: errors.length, dryRun: !!dryRun },
    });

    return { status: dryRun ? 'DRY_RUN' : 'COMPLETED', totalRows: rows.length, created, updated, failed: errors.length, errors, warnings, dryRun: !!dryRun };
  }

  getVehicleImportTemplate(): string {
    return 'registration_no,vehicle_type,make,model,year,color,capacity,fuel_type,ac_type,ownership_type,vendor_id\nMH-01-AB-1234,SEDAN,Toyota,Innova,2024,White,6,DIESEL,AC,COMPANY_OWNED,\nMH-02-CD-5678,SUV,Mahindra,XUV700,2025,Black,7,PETROL,AC,VENDOR_OWNED,vendor-1\nDL-03-EF-9012,VAN,Force,Traveller,2023,Silver,12,DIESEL,NON_AC,LEASED,';
  }
}
