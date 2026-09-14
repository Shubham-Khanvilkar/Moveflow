import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as crypto from 'crypto';

export class GenerateQRDto {
  vehicleId: string;
  qrType?: string;
  shiftId?: string;
  validFrom?: string;
  validUntil?: string;
  reason?: string;
}

export class ScanQRDto {
  qrCode: string;
  scannedBy: string;
  location?: { latitude: number; longitude: number };
}

@Injectable()
export class VehicleQRService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Generate a new QR code for a vehicle.
   * QR is duty-bound: tied to a specific vehicle, shift, and time window.
   */
  async generate(companyId: string, dto: GenerateQRDto, userId: string) {
    // Verify vehicle exists and belongs to company
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // Check for existing active QR for this vehicle+shift
    const existing = await this.prisma.vehicleQR.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        shiftId: dto.shiftId || null,
        status: 'ACTIVE',
        validUntil: { gte: new Date() },
      },
    });

    if (existing) {
      throw new BadRequestException('An active QR already exists for this vehicle/shift. Revoke it first.');
    }

    const now = new Date();
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : now;
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(now.getTime() + 12 * 60 * 60 * 1000); // Default 12 hours

    if (validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    // Generate unique QR code
    const qrCode = `NAVIRA-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

    const qr = await this.prisma.vehicleQR.create({
      data: {
        vehicleId: dto.vehicleId,
        companyId,
        qrCode,
        qrType: dto.qrType || 'DAILY_SHIFT',
        shiftId: dto.shiftId,
        validFrom,
        validUntil,
        generatedBy: userId,
        reason: dto.reason,
      },
    });

    await this.audit.log({
      userId, action: 'VEHICLE_QR_GENERATED', entity: 'VehicleQR',
      entityId: qr.id, companyId,
      newValue: { vehicleId: dto.vehicleId, qrType: dto.qrType, validUntil },
    });

    return qr;
  }

  /**
   * Scan and validate a QR code.
   * Returns validation result and vehicle info if valid.
   */
  async scan(companyId: string, dto: ScanQRDto, userId: string) {
    const qr = await this.prisma.vehicleQR.findFirst({
      where: { qrCode: dto.qrCode },
      include: { vehicle: true },
    });

    if (!qr) {
      return { valid: false, error: 'QR code not found' };
    }

    if (qr.companyId !== companyId) {
      return { valid: false, error: 'QR code belongs to a different company' };
    }

    if (qr.status === 'REVOKED') {
      return { valid: false, error: 'QR code has been revoked' };
    }

    if (qr.status === 'EXPIRED' || qr.validUntil < new Date()) {
      await this.prisma.vehicleQR.update({
        where: { id: qr.id },
        data: { status: 'EXPIRED' },
      });
      return { valid: false, error: 'QR code has expired' };
    }

    if (qr.validFrom > new Date()) {
      return { valid: false, error: 'QR code is not yet valid' };
    }

    // Mark as scanned
    const updated = await this.prisma.vehicleQR.update({
      where: { id: qr.id },
      data: {
        scannedAt: new Date(),
        scannedBy: userId,
        scanResult: 'VALID',
      },
    });

    await this.audit.log({
      userId, action: 'VEHICLE_QR_SCANNED', entity: 'VehicleQR',
      entityId: qr.id, companyId,
      newValue: { vehicleId: qr.vehicleId, vehiclePlate: qr.vehicle.registrationNo },
    });

    return {
      valid: true,
      qr: updated,
      vehicle: {
        id: qr.vehicle.id,
        registrationNo: qr.vehicle.registrationNo,
        vehicleType: qr.vehicle.vehicleType,
      },
    };
  }

  /**
   * Revoke a QR code.
   */
  async revoke(companyId: string, qrId: string, userId: string, reason?: string) {
    const qr = await this.prisma.vehicleQR.findFirst({
      where: { id: qrId, companyId },
    });
    if (!qr) throw new NotFoundException('QR code not found');

    if (qr.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot revoke QR in ${qr.status} status`);
    }

    const updated = await this.prisma.vehicleQR.update({
      where: { id: qrId },
      data: { status: 'REVOKED', reason: reason || qr.reason },
    });

    await this.audit.log({
      userId, action: 'VEHICLE_QR_REVOKED', entity: 'VehicleQR',
      entityId: qrId, companyId,
      oldValue: { status: 'ACTIVE' },
      newValue: { status: 'REVOKED', reason },
    });

    return updated;
  }

  /**
   * Get all QR codes for a vehicle.
   */
  async getVehicleQRs(companyId: string, vehicleId: string) {
    return this.prisma.vehicleQR.findMany({
      where: { vehicleId, companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all active QR codes.
   */
  async getActiveQRs(companyId: string) {
    return this.prisma.vehicleQR.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        validUntil: { gte: new Date() },
      },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get QR scan history.
   */
  async getScanHistory(companyId: string, vehicleId?: string) {
    const where: any = { companyId, scannedAt: { not: null } };
    if (vehicleId) where.vehicleId = vehicleId;

    return this.prisma.vehicleQR.findMany({
      where,
      include: { vehicle: true },
      orderBy: { scannedAt: 'desc' },
      take: 100,
    });
  }
}
