import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedCompanies: string[];
  deniedCompanies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RolloutConfig {
  flagKey: string;
  strategy: 'PERCENTAGE' | 'COMPANY_LIST' | 'CANARY';
  percentage?: number;
  canaryCompanies?: string[];
  stages: RolloutStage[];
  currentStage: number;
  rollbackVersion?: string;
}

export interface RolloutStage {
  name: string;
  percentage: number;
  companies: string[];
  activatedAt?: Date;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private flags: Map<string, FeatureFlag> = new Map();

  constructor(private prisma: PrismaService) {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags() {
    const defaults: FeatureFlag[] = [
      { key: 'BREAKDOWN_REPLACEMENT_V2', name: 'Breakdown Replacement V2', description: 'Enhanced breakdown replacement engine', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'AI_DISPATCH', name: 'AI Dispatch', description: 'AI-powered automatic dispatch', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'NEW_BILLING_ENGINE', name: 'New Billing Engine', description: 'Enhanced billing with GST and maker-checker', enabled: true, rolloutPercentage: 100, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'NEW_NODAL_ENGINE', name: 'New Nodal Engine', description: 'Geospatial nodal recommendation engine', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'CARPOOLING', name: 'Carpooling', description: 'Intra-organizational ride sharing', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'WORKPLACE_MANAGEMENT', name: 'Workplace Management', description: 'Desk, room, parking, visitor management', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'EV_DASHBOARD', name: 'EV Dashboard', description: 'Electric vehicle monitoring and sustainability', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'DIGITAL_TWIN', name: 'Digital Twin', description: 'Fleet digital twin for simulation', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'PREDICTIVE_MAINTENANCE', name: 'Predictive Maintenance', description: 'ML-based vehicle failure prediction', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'VOICE_COMMANDS', name: 'Voice Commands', description: 'Voice-controlled driver operations', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'MULTI_MODAL_TRIP', name: 'Multi-Modal Trip', description: 'Combine cab + metro + shuttle trips', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
      { key: 'WEATHER_ROUTING', name: 'Weather-Aware Routing', description: 'Weather-influenced route optimization', enabled: false, rolloutPercentage: 0, allowedCompanies: [], deniedCompanies: [], createdAt: new Date(), updatedAt: new Date() },
    ];
    for (const flag of defaults) {
      this.flags.set(flag.key, flag);
    }
  }

  // ============================================================
  // 1. FLAG EVALUATION
  // ============================================================
  isEnabled(key: string, companyId?: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;
    if (flag.deniedCompanies.includes(companyId || '')) return false;
    if (flag.allowedCompanies.length > 0 && companyId && !flag.allowedCompanies.includes(companyId)) return false;
    return true;
  }

  // ============================================================
  // 2. FLAG MANAGEMENT
  // ============================================================
  async createFlag(data: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>) {
    const flag: FeatureFlag = { ...data, createdAt: new Date(), updatedAt: new Date() };
    this.flags.set(flag.key, flag);
    await this.audit('FEATURE_FLAG_CREATED', flag.key, { enabled: flag.enabled });
    return flag;
  }

  async toggleFlag(key: string, enabled: boolean) {
    const flag = this.flags.get(key);
    if (!flag) return null;
    flag.enabled = enabled;
    flag.updatedAt = new Date();
    await this.audit('FEATURE_FLAG_TOGGLED', key, { enabled });
    return flag;
  }

  async getAllFlags() {
    return Array.from(this.flags.values());
  }

  // ============================================================
  // 3. STAGED ROLLOUT
  // ============================================================
  async startStagedRollout(key: string, stages: RolloutStage[]) {
    const flag = this.flags.get(key);
    if (!flag) return null;

    const config: RolloutConfig = {
      flagKey: key,
      strategy: 'PERCENTAGE',
      stages,
      currentStage: 0,
    };

    // Activate first stage
    if (stages.length > 0) {
      stages[0].activatedAt = new Date();
      flag.rolloutPercentage = stages[0].percentage;
      if (stages[0].companies.length > 0) {
        flag.allowedCompanies = stages[0].companies;
      }
      flag.enabled = true;
    }

    await this.audit('ROLLOUT_STARTED', key, { stages: stages.length });
    return config;
  }

  async advanceRollout(key: string) {
    const flag = this.flags.get(key);
    if (!flag) return null;

    // Simple: increase percentage by 25%
    flag.rolloutPercentage = Math.min(100, flag.rolloutPercentage + 25);
    flag.updatedAt = new Date();

    if (flag.rolloutPercentage >= 100) {
      flag.enabled = true;
      await this.audit('ROLLOUT_COMPLETED', key, { percentage: 100 });
    } else {
      await this.audit('ROLLOUT_ADVANCED', key, { percentage: flag.rolloutPercentage });
    }

    return flag;
  }

  // ============================================================
  // 4. ROLLBACK
  // ============================================================
  async rollbackFlag(key: string, reason: string) {
    const flag = this.flags.get(key);
    if (!flag) return null;

    flag.enabled = false;
    flag.rolloutPercentage = 0;
    flag.allowedCompanies = [];
    flag.updatedAt = new Date();

    await this.audit('FEATURE_FLAG_ROLLED_BACK', key, { reason });
    return flag;
  }

  // ============================================================
  // 5. TEST COMPANY
  // ============================================================
  async getTestCompany() {
    // Internal test company uses synthetic data
    const testCompany = await (this.prisma as any).company.findFirst({
      where: { name: 'INTERNAL_TEST_COMPANY' },
    });
    return testCompany;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private async audit(action: string, flagKey: string, details: any) {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          companyId: 'SYSTEM' as any,
          userId: 'SYSTEM',
          action,
          resourceType: 'FEATURE_FLAG',
          resourceId: flagKey,
          details: JSON.stringify(details),
          createdAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.error(`Audit failed: ${(e as Error).message}`);
    }
  }
}
