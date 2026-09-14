import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  allowedCompanyIds?: string[];
  blockedCompanyIds?: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private cache = new Map<string, { flag: FeatureFlag; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000;

  constructor(private prisma: PrismaService) {}

  async isEnabled(companyId: string, flagKey: string): Promise<boolean> {
    const cacheKey = `${companyId}:${flagKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.flag.enabled;
    }

    try {
      if (!this.prisma.isConnected()) {
        return this.getDefaultFlag(flagKey);
      }

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      });

      if (!company) return false;

      const settings = company.settings as Record<string, any>;
      const featureFlags = settings?.featureFlags || {};

      if (!(flagKey in featureFlags)) {
        return this.getDefaultFlag(flagKey);
      }

      const flagValue = featureFlags[flagKey];
      const flag: FeatureFlag = {
        key: flagKey,
        enabled: typeof flagValue === 'boolean' ? flagValue : !!flagValue?.enabled,
      };

      this.cache.set(cacheKey, { flag, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return flag.enabled;
    } catch {
      return this.getDefaultFlag(flagKey);
    }
  }

  async getCompanyFlags(companyId: string): Promise<Record<string, boolean>> {
    try {
      if (!this.prisma.isConnected()) return {};

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      });

      if (!company) return {};

      const settings = company.settings as Record<string, any>;
      const featureFlags = settings?.featureFlags || {};

      const result: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(featureFlags)) {
        result[key] = typeof value === 'boolean' ? value : !!(value as any)?.enabled;
      }
      return result;
    } catch {
      return {};
    }
  }

  async setFlag(companyId: string, flagKey: string, enabled: boolean): Promise<void> {
    if (!this.prisma.isConnected()) return;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });

    if (!company) return;

    const settings = (company.settings as Record<string, any>) || {};
    const featureFlags = settings.featureFlags || {};
    featureFlags[flagKey] = enabled;

    await this.prisma.company.update({
      where: { id: companyId },
      data: { settings: { ...settings, featureFlags } },
    });

    this.cache.delete(`${companyId}:${flagKey}`);
  }

  private getDefaultFlag(flagKey: string): boolean {
    const defaults: Record<string, boolean> = {
      enable_carpooling: true,
      enable_sustainability: true,
      enable_ai_copilot: false,
      enable_shuttle_booking: true,
      enable_nodal_booking: false,
      enable_vendor_portal: false,
      enable_advanced_analytics: false,
      enable_gps_tracking: true,
      enable_realtime_updates: true,
      enable_auto_dispatch: false,
    };
    return defaults[flagKey] ?? false;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
