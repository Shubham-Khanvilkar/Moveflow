import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// Phase 20: Feature Flag Service — company-level, environment-level, global flags
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  // In-memory cache for hot flags
  private cache = new Map<string, { value: boolean; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(private prisma: PrismaService) {}

  // Check if a feature is enabled for a company
  async isEnabled(companyId: string, flagCode: string): Promise<boolean> {
    const cacheKey = `${companyId}:${flagCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const flag = await (this.prisma as any).featureFlag.findFirst({
      where: {
        OR: [
          { companyId, flagCode, isActive: true },
          { companyId: null, flagCode, isActive: true },
        ],
      },
      orderBy: { companyId: 'desc' }, // company-specific wins over global
    });

    const value = flag?.enabled ?? false;
    this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return value;
  }

  // Set a feature flag
  async setFlag(companyId: string | null, flagCode: string, enabled: boolean, setByUserId: string, reason?: string) {
    return (this.prisma as any).featureFlag.upsert({
      where: {
        companyId_flagCode: { companyId: companyId || '', flagCode },
      },
      update: { enabled, isActive: true },
      create: {
        companyId: companyId || null,
        flagCode,
        enabled,
        isActive: true,
        setByUserId,
        reason,
      },
    });
  }

  // List all flags for a company
  async listFlags(companyId: string) {
    return (this.prisma as any).featureFlag.findMany({
      where: {
        OR: [
          { companyId },
          { companyId: null },
        ],
      },
      orderBy: [{ companyId: 'desc' }, { flagCode: 'asc' }],
    });
  }

  // Invalidate cache for a company
  invalidateCache(companyId: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${companyId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  // Phase 20: Canary deployment tracking
  async getCanaryStatus(companyId: string) {
    const flags = await this.listFlags(companyId);
    return {
      companyId,
      totalFlags: flags.length,
      enabledFlags: flags.filter((f: any) => f.enabled).length,
      disabledFlags: flags.filter((f: any) => !f.enabled).length,
      flags: flags.map((f: any) => ({
        code: f.flagCode,
        enabled: f.enabled,
        setBy: f.setByUserId,
        reason: f.reason,
      })),
    };
  }
}
