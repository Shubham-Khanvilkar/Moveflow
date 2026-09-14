import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private prisma: PrismaService) {}

  async enforceRetentionPolicy() {
    const policies = await (this.prisma as any).dataRetentionPolicy.findMany({
      where: { autoDelete: true },
    });

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      try {
        const result = await this.deleteOldRecords(policy.entityType, policy.companyId, cutoffDate);
        this.logger.log(`Retention cleanup: ${policy.entityType} — ${result} records deleted for company ${policy.companyId}`);
        
        await (this.prisma as any).dataRetentionPolicy.update({
          where: { id: policy.id },
          data: { lastCleanupAt: new Date() },
        });
      } catch (error: any) {
        this.logger.error(`Retention cleanup failed for ${policy.entityType}: ${error.message}`);
      }
    }
  }

  private async deleteOldRecords(entityType: string, companyId: string, cutoffDate: Date): Promise<number> {
    const modelMap: Record<string, string> = {
      'GPS_POINT': 'gPSLog',
      'AUDIT_LOG': 'auditLog',
      'NOTIFICATION': 'notification',
    };
    
    const modelName = modelMap[entityType];
    if (!modelName) return 0;

    const result = await (this.prisma as any)[modelName].deleteMany({
      where: {
        companyId,
        createdAt: { lt: cutoffDate },
      },
    });
    return result.count;
  }

  async getDefaultPolicies(companyId: string) {
    return [
      { entityType: 'GPS_POINT', retentionDays: 90, autoDelete: true },
      { entityType: 'AUDIT_LOG', retentionDays: 365, autoDelete: false },
      { entityType: 'NOTIFICATION', retentionDays: 30, autoDelete: true },
    ];
  }
}
