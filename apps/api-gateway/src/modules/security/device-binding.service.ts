import { Injectable, Logger, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class DeviceBindingService {
  private readonly logger = new Logger(DeviceBindingService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async registerDevice(companyId: string, driverId: string, data: {
    deviceFingerprint: string;
    deviceName: string;
    deviceType?: string;
    appVersion?: string;
    osVersion?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.driverDevice.findFirst({
      where: { companyId, driverId, deviceFingerprint: data.deviceFingerprint },
    });

    if (existing) {
      return this.prisma.driverDevice.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), appVersion: data.appVersion, osVersion: data.osVersion },
      });
    }

    const deviceCount = await this.prisma.driverDevice.count({ where: { companyId, driverId, isActive: true } });
    if (deviceCount >= 3) {
      throw new UnauthorizedException('Maximum 3 devices allowed. Deactivate an existing device first.');
    }

    const device = await this.prisma.driverDevice.create({
      data: {
        companyId, driverId,
        deviceFingerprint: data.deviceFingerprint,
        deviceName: data.deviceName,
        deviceType: data.deviceType,
        appVersion: data.appVersion,
        osVersion: data.osVersion,
        isVerified: deviceCount === 0,
        lastSeenAt: new Date(),
      },
    });

    await this.audit.log({ companyId, userId: driverId, action: 'DEVICE_REGISTERED', entity: 'DriverDevice', entityId: device.id, newValue: { deviceName: data.deviceName, deviceType: data.deviceType } });
    return device;
  }

  async validateDevice(driverId: string, deviceFingerprint: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const device = await this.prisma.driverDevice.findFirst({
      where: { driverId, deviceFingerprint, isActive: true },
    });

    if (!device) return { valid: false, reason: 'Device not registered' };
    if (!device.isVerified) return { valid: true, trusted: false, reason: 'Device requires verification' };

    await this.prisma.driverDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
    return { valid: true, trusted: true, device };
  }

  async getDevices(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.driverDevice.findMany({ where: { companyId, driverId }, orderBy: { lastSeenAt: 'desc' } });
  }

  async deactivateDevice(companyId: string, driverId: string, deviceId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const device = await this.prisma.driverDevice.update({ where: { id: deviceId }, data: { isActive: false, blockedAt: new Date() } });
    await this.audit.log({ companyId, userId: driverId, action: 'DEVICE_DEACTIVATED', entity: 'DriverDevice', entityId: deviceId });
    return device;
  }

  async trustDevice(companyId: string, driverId: string, deviceId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const device = await this.prisma.driverDevice.update({ where: { id: deviceId }, data: { isVerified: true } });
    await this.audit.log({ companyId, userId: driverId, action: 'DEVICE_TRUSTED', entity: 'DriverDevice', entityId: deviceId });
    return device;
  }

  async revokeAllDevices(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const result = await this.prisma.driverDevice.updateMany({ where: { companyId, driverId, isActive: true }, data: { isActive: false, blockedAt: new Date() } });
    await this.audit.log({ companyId, userId: driverId, action: 'ALL_DEVICES_REVOKED', entity: 'DriverDevice', entityId: driverId, newValue: { count: result.count } });
    return { revoked: result.count };
  }

  async checkSuspiciousLogin(driverId: string, deviceFingerprint: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const knownDevices = await this.prisma.driverDevice.findMany({ where: { driverId, isActive: true } });
    const knownFingerprints = knownDevices.map(d => d.deviceFingerprint);

    if (!knownFingerprints.includes(deviceFingerprint)) {
      this.logger.warn(`Suspicious login: new device for driver ${driverId}`);
      return { suspicious: true, reason: 'New device detected', knownDeviceCount: knownDevices.length };
    }

    return { suspicious: false };
  }
}
