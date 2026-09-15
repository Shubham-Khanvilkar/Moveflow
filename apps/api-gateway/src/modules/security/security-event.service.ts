import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000;
const BRUTE_FORCE_THRESHOLD = 5;

export interface SecurityEventInput {
  eventCode: string;
  email?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  companyId?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  constructor(private prisma: PrismaService) {}

  async logEvent(input: SecurityEventInput): Promise<void> {
    if (!this.prisma.isConnected()) return;

    try {
      await this.prisma.auditEvent.create({
        data: {
          eventCode: input.eventCode,
          action: input.eventCode,
          actorUserId: input.userId || null,
          actorRole: 'SYSTEM',
          actorDomain: 'INTERNAL',
          resourceType: 'SecurityEvent',
          resourceId: input.userId || input.email || null,
          companyId: input.companyId || null,
          ipAddress: input.ipAddress || null,
          deviceInfo: input.userAgent || null,
          result: input.eventCode.startsWith('FAILED_') ? 'FAILURE' : 'SUCCESS',
          riskLevel: input.riskLevel,
          oldValue: input.email ? { email: input.email } : undefined,
          newValue: input.metadata
            ? { description: input.description, ...input.metadata }
            : input.description
              ? { description: input.description }
              : undefined,
        },
      });

      if (input.riskLevel === 'CRITICAL' || input.riskLevel === 'HIGH') {
        this.logger.warn(
          `SECURITY [${input.riskLevel}] ${input.eventCode} — IP: ${input.ipAddress || 'unknown'} — ${input.email || input.userId || 'unknown'}`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Failed to log security event: ${err.message}`);
    }
  }

  async checkBruteForce(ipAddress: string): Promise<boolean> {
    if (!this.prisma.isConnected() || !ipAddress) return false;

    try {
      const windowStart = new Date(Date.now() - BRUTE_FORCE_WINDOW_MS);
      const count = await this.prisma.auditEvent.count({
        where: {
          ipAddress,
          eventCode: { in: ['FAILED_LOGIN_INVALID_CREDENTIALS', 'FAILED_LOGIN_USER_NOT_FOUND', 'FAILED_LOGIN_ACCOUNT_LOCKED'] },
          createdAt: { gte: windowStart },
        },
      });
      return count >= BRUTE_FORCE_THRESHOLD;
    } catch {
      return false;
    }
  }

  async getFailedLoginAttempts(ipAddress: string, windowMinutes: number = 10): Promise<number> {
    if (!this.prisma.isConnected() || !ipAddress) return 0;

    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
      return await this.prisma.auditEvent.count({
        where: {
          ipAddress,
          eventCode: { in: ['FAILED_LOGIN_INVALID_CREDENTIALS', 'FAILED_LOGIN_USER_NOT_FOUND', 'FAILED_LOGIN_ACCOUNT_LOCKED'] },
          createdAt: { gte: windowStart },
        },
      });
    } catch {
      return 0;
    }
  }

  async getSecurityEvents(params: {
    eventCode?: string;
    riskLevel?: string;
    ipAddress?: string;
    email?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    if (!this.prisma.isConnected()) return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { resourceType: 'SecurityEvent' };
    if (params.eventCode) where.eventCode = params.eventCode;
    if (params.riskLevel) where.riskLevel = params.riskLevel;
    if (params.ipAddress) where.ipAddress = params.ipAddress;
    if (params.email) where.oldValue = { path: ['email'], equals: params.email };
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSecuritySummary() {
    if (!this.prisma.isConnected()) {
      return { total: 0, byRiskLevel: {}, topIPs: [], recent24h: 0 };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, byRiskLevelRaw, topIPs, recent24h] = await Promise.all([
      this.prisma.auditEvent.count({ where: { resourceType: 'SecurityEvent' } }),
      this.prisma.auditEvent.groupBy({
        by: ['riskLevel'],
        where: { resourceType: 'SecurityEvent' },
        _count: { riskLevel: true },
      }),
      this.prisma.auditEvent.groupBy({
        by: ['ipAddress'],
        where: {
          resourceType: 'SecurityEvent',
          riskLevel: { in: ['HIGH', 'CRITICAL'] },
          createdAt: { gte: twentyFourHoursAgo },
        },
        _count: { ipAddress: true },
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10,
      }),
      this.prisma.auditEvent.count({
        where: {
          resourceType: 'SecurityEvent',
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

    const riskLevelMap: Record<string, number> = {};
    for (const r of byRiskLevelRaw) {
      riskLevelMap[r.riskLevel || 'UNKNOWN'] = r._count.riskLevel;
    }

    return {
      total,
      byRiskLevel: riskLevelMap,
      topIPs: topIPs.map(ip => ({
        ipAddress: ip.ipAddress,
        count: ip._count.ipAddress,
      })),
      recent24h,
    };
  }
}
