import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async setupMFA(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) throw new UnauthorizedException('Database unavailable — MFA setup requires database connectivity');

    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    await this.prisma.adminMFASecret.upsert({
      where: { userId },
      update: { secret, backupCodes, enabled: false },
      create: { userId, secret, backupCodes, enabled: false },
    });

    await this.audit.log({ companyId, userId, action: 'MFA_SETUP_INITIATED', entity: 'AdminMFASecret', entityId: userId });
    return { secret, backupCodes, qrCodeUrl: `otpauth://totp/NAVIRA:${userId}?secret=${secret}` };
  }

  async verifyAndEnable(companyId: string, userId: string, code: string) {
    if (!this.prisma.isConnected()) throw new UnauthorizedException('Database unavailable — MFA verification requires database connectivity');

    const mfaSecret = await this.prisma.adminMFASecret.findUnique({ where: { userId } });
    if (!mfaSecret) throw new BadRequestException('MFA setup not initiated');

    const valid = this.verifyTOTP(mfaSecret.secret, code);
    if (!valid) throw new BadRequestException('Invalid TOTP code');

    await this.prisma.adminMFASecret.update({ where: { userId }, data: { enabled: true } });
    await this.audit.log({ companyId, userId, action: 'MFA_ENABLED', entity: 'AdminMFASecret', entityId: userId });
    return { enabled: true };
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    if (!this.prisma.isConnected()) throw new UnauthorizedException('Database unavailable — MFA verification requires database connectivity');

    const mfaSecret = await this.prisma.adminMFASecret.findUnique({ where: { userId } });
    if (!mfaSecret?.enabled) return true;

    return this.verifyTOTP(mfaSecret.secret, code);
  }

  async regenerateBackupCodes(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) throw new UnauthorizedException('Database unavailable — MFA requires database connectivity');

    const backupCodes = this.generateBackupCodes();
    await this.prisma.adminMFASecret.update({ where: { userId }, data: { backupCodes } });
    await this.audit.log({ companyId, userId, action: 'MFA_BACKUP_CODES_REGENERATED', entity: 'AdminMFASecret', entityId: userId });
    return { backupCodes };
  }

  async getStatus(userId: string) {
    if (!this.prisma.isConnected()) throw new UnauthorizedException('Database unavailable — MFA status requires database connectivity');

    const mfaSecret = await this.prisma.adminMFASecret.findUnique({ where: { userId } });
    return {
      enabled: mfaSecret?.enabled || false,
      setupCompleted: !!mfaSecret,
    };
  }

  async disableMFA(companyId: string, userId: string, code: string) {
    if (!this.prisma.isConnected()) throw new UnauthorizedException('Database unavailable — MFA requires database connectivity');

    const valid = await this.verifyCode(userId, code);
    if (!valid) throw new BadRequestException('Invalid MFA code');

    await this.prisma.adminMFASecret.update({ where: { userId }, data: { enabled: false } });
    await this.audit.log({ companyId, userId, action: 'MFA_DISABLED', entity: 'AdminMFASecret', entityId: userId });
    return { disabled: true };
  }

  private generateSecret(): string {
    return crypto.randomBytes(20).toString('hex').toUpperCase();
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 8 }, () => crypto.randomInt(100000, 999999).toString());
  }

  private verifyTOTP(secret: string, code: string): boolean {
    const time = Math.floor(Date.now() / 30000);
    for (let i = -1; i <= 1; i++) {
      const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
      hmac.update(Buffer.from([(time + i) >>> 24, (time + i) >>> 16, (time + i) >>> 8, time + i]));
      const hash = hmac.digest();
      const offset = hash[hash.length - 1] & 0x0f;
      const otp = ((hash[offset] & 0x7f) << 24 | (hash[offset + 1] & 0xff) << 16 | (hash[offset + 2] & 0xff) << 8 | hash[offset + 3] & 0xff) % 1000000;
      if (otp.toString().padStart(6, '0') === code) return true;
    }
    return false;
  }
}
