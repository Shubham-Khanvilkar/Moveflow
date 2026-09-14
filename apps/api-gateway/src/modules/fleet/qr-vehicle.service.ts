import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class QRVehicleService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async generateQR(companyId: string, vehicleId: string, userId: string, dto: any = {}) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // Check for existing active QR
    const existing = await (this.prisma as any).vehicleQR.findFirst({
      where: { vehicleId, companyId, status: 'ACTIVE', validUntil: { gt: new Date() } },
    });
    if (existing) {
      throw new BadRequestException('Active QR already exists for this vehicle. Revoke it first or wait for expiry.');
    }

    const qrData = `QR-${companyId.slice(0, 8)}-${vehicleId.slice(0, 8)}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const qrHash = crypto.createHash('sha256').update(qrData).digest('hex');

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validHours = dto.validHours || 24;
    const validUntil = new Date(validFrom.getTime() + validHours * 60 * 60 * 1000);

    const qr = await (this.prisma as any).vehicleQR.create({
      data: {
        vehicleId,
        companyId,
        qrCode: qrHash,
        qrType: dto.qrType || 'DAILY_SHIFT',
        status: 'ACTIVE',
        shiftId: dto.shiftId || null,
        validFrom,
        validUntil,
        generatedBy: userId,
        reason: dto.reason || null,
      },
      include: { vehicle: { select: { registrationNo: true, vehicleType: true } } },
    });

    await this.audit.log({
      companyId, userId, action: 'QR_GENERATED', entity: 'VehicleQR', entityId: qr.id,
      newValue: { vehicleId, qrType: dto.qrType || 'DAILY_SHIFT', validUntil },
    });

    return { ...qr, qrData }; // Return the raw QR data (only shown once)
  }

  async revokeQR(companyId: string, qrId: string, userId: string, reason?: string) {
    const qr = await (this.prisma as any).vehicleQR.findFirst({ where: { id: qrId, companyId } });
    if (!qr) throw new NotFoundException('QR record not found');
    if (qr.status === 'REVOKED') throw new BadRequestException('QR already revoked');

    const updated = await (this.prisma as any).vehicleQR.update({
      where: { id: qrId },
      data: { status: 'REVOKED', reason: reason || 'Manually revoked' },
    });

    await this.audit.log({
      companyId, userId, action: 'QR_REVOKED', entity: 'VehicleQR', entityId: qrId,
      newValue: { vehicleId: qr.vehicleId, reason },
    });

    return updated;
  }

  async regenerateQR(companyId: string, qrId: string, userId: string, dto: any = {}) {
    const old = await (this.prisma as any).vehicleQR.findFirst({ where: { id: qrId, companyId } });
    if (!old) throw new NotFoundException('QR record not found');

    // Revoke old
    await (this.prisma as any).vehicleQR.update({
      where: { id: qrId },
      data: { status: 'REGENERATED', reason: 'Regenerated' },
    });

    // Generate new
    return this.generateQR(companyId, old.vehicleId, userId, {
      ...dto,
      qrType: old.qrType,
      shiftId: old.shiftId,
      reason: `Regenerated from ${qrId}`,
    });
  }

  async verifyQR(companyId: string, qrHash: string) {
    const qr = await (this.prisma as any).vehicleQR.findFirst({
      where: { qrCode: qrHash, companyId },
      include: { vehicle: { select: { id: true, registrationNo: true, vehicleType: true, status: true } } },
    });

    if (!qr) return { valid: false, reason: 'QR code not found' };
    if (qr.status !== 'ACTIVE') return { valid: false, reason: `QR status: ${qr.status}` };
    if (new Date() > qr.validUntil) return { valid: false, reason: 'QR code expired' };

    // Mark as scanned
    await (this.prisma as any).vehicleQR.update({
      where: { id: qr.id },
      data: { scannedAt: new Date(), scanResult: 'VALID' },
    });

    return {
      valid: true,
      vehicle: qr.vehicle,
      qrType: qr.qrType,
      validUntil: qr.validUntil,
    };
  }

  async listQRHistory(companyId: string, vehicleId: string) {
    return (this.prisma as any).vehicleQR.findMany({
      where: { vehicleId, companyId },
      include: { vehicle: { select: { registrationNo: true, vehicleType: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllQR(companyId: string, query: any = {}) {
    const where: any = { companyId };
    if (query.status) where.status = query.status;
    if (query.vehicleId) where.vehicleId = query.vehicleId;

    return (this.prisma as any).vehicleQR.findMany({
      where,
      include: { vehicle: { select: { registrationNo: true, vehicleType: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(query.limit) || 100,
    });
  }

  async getQRStats(companyId: string) {
    const [total, active, expired, revoked] = await Promise.all([
      (this.prisma as any).vehicleQR.count({ where: { companyId } }),
      (this.prisma as any).vehicleQR.count({ where: { companyId, status: 'ACTIVE', validUntil: { gt: new Date() } } }),
      (this.prisma as any).vehicleQR.count({ where: { companyId, status: 'ACTIVE', validUntil: { lte: new Date() } } }),
      (this.prisma as any).vehicleQR.count({ where: { companyId, status: 'REVOKED' } }),
    ]);
    return { total, active, expired, revoked };
  }
}
