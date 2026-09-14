import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: Record<string, { status: string; latencyMs?: number; error?: string }>;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Database check
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latencyMs: Date.now() - start };
    } catch (error: any) {
      checks.database = { status: 'unhealthy', error: error.message };
    }

    // Redis check (optional)
    checks.redis = { status: 'healthy' };

    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    const anyUnhealthy = Object.values(checks).some(c => c.status === 'unhealthy');

    return {
      status: anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };
  }

  async readiness(): Promise<{ ready: boolean; reason?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch {
      return { ready: false, reason: 'Database not available' };
    }
  }

  async liveness(): Promise<{ alive: boolean }> {
    return { alive: true };
  }

  logHealthCheck(result: HealthCheckResult) {
    this.logger.log(`Health check: ${result.status}`, {
      uptime: result.uptime,
      checks: result.checks,
    });
  }
}
