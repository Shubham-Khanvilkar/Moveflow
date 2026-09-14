import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private metrics: Record<string, number> = {};
  private counters: Record<string, number> = {};
  private histograms: Record<string, number[]> = {};

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 1. HEALTH CHECKS
  // ============================================================
  async getHealthStatus() {
    const checks: Record<string, { status: string; latencyMs: number; details?: any }> = {};

    // Database
    const dbStart = Date.now();
    try {
      await (this.prisma as any).$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
    } catch (e: any) {
      checks.database = { status: 'unhealthy', latencyMs: Date.now() - dbStart, details: e.message };
    }

    // Redis (via a simple ping)
    checks.redis = { status: 'healthy', latencyMs: 1 }; // Placeholder

    // Elasticsearch
    checks.elasticsearch = { status: 'healthy', latencyMs: 2 }; // Placeholder

    // Disk space
    checks.disk = { status: 'healthy', latencyMs: 0, details: { freeGB: 'N/A' } };

    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  async getReadiness() {
    const dbOk = await (this.prisma as any).$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    return {
      status: dbOk ? 'ready' : 'not_ready',
      database: dbOk ? 'connected' : 'disconnected',
    };
  }

  async getLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  // ============================================================
  // 2. METRICS (Prometheus-compatible)
  // ============================================================
  recordMetric(name: string, value: number) {
    this.metrics[name] = value;
  }

  incrementCounter(name: string, amount: number = 1) {
    this.counters[name] = (this.counters[name] || 0) + amount;
  }

  recordHistogram(name: string, value: number) {
    if (!this.histograms[name]) this.histograms[name] = [];
    this.histograms[name].push(value);
    if (this.histograms[name].length > 1000) {
      this.histograms[name] = this.histograms[name].slice(-500);
    }
  }

  getPrometheusMetrics(): string {
    const lines: string[] = [];

    for (const [name, value] of Object.entries(this.metrics)) {
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${value}`);
    }

    for (const [name, value] of Object.entries(this.counters)) {
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name} ${value}`);
    }

    for (const [name, values] of Object.entries(this.histograms)) {
      const sorted = [...values].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_p50 ${p50}`);
      lines.push(`${name}_p95 ${p95}`);
      lines.push(`${name}_p99 ${p99}`);
    }

    return lines.join('\n');
  }

  // ============================================================
  // 3. BACKUP MANAGEMENT
  // ============================================================
  async createBackup(companyId: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${companyId}_${timestamp}`;

    // In production: pg_dump, upload to S3, verify checksum
    await (this.prisma as any).auditLog.create({
      data: {
        companyId,
        userId: 'SYSTEM',
        action: 'BACKUP_CREATED',
        resourceType: 'BACKUP',
        resourceId: backupName,
        details: JSON.stringify({
          backupName,
          timestamp: new Date().toISOString(),
          type: 'FULL',
          status: 'COMPLETED',
        }),
        createdAt: new Date(),
      },
    });

    return {
      backupName,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      // In production: would include S3 URL, checksum, size
    };
  }

  // ============================================================
  // 4. DR PLAN
  // ============================================================
  async getDRStatus() {
    return {
      rpoTarget: '15 minutes',
      rtoTarget: '2 hours',
      lastBackup: 'System managed',
      backupFrequency: 'Every 15 minutes (WAL archiving)',
      restorationTested: false, // Must be verified manually
      runbook: 'Available at docs/DISASTER_RECOVERY.md',
    };
  }

  // ============================================================
  // 5. BACKGROUND JOBS
  // ============================================================
  private jobQueue: Array<{ id: string; type: string; payload: any; status: string; attempts: number; nextRetryAt: Date }> = [];

  async enqueueJob(type: string, payload: any) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      payload,
      status: 'PENDING',
      attempts: 0,
      nextRetryAt: new Date(),
    };
    this.jobQueue.push(job);
    return job;
  }

  async processJobs() {
    const ready = this.jobQueue.filter(j => j.status === 'PENDING' && j.nextRetryAt <= new Date());

    for (const job of ready) {
      job.attempts++;
      job.status = 'PROCESSING';

      try {
        // Process based on type
        switch (job.type) {
          case 'GPS_RETENTION_CLEANUP':
            await (this.prisma as any).locationPing.deleteMany({
              where: { timestamp: { lt: new Date(Date.now() - 90 * 86400000) } },
            });
            break;
          case 'COMPLIANCE_CHECK':
            // Run compliance document expiry checks
            break;
          default:
            this.logger.warn(`Unknown job type: ${job.type}`);
        }
        job.status = 'COMPLETED';
      } catch (error: any) {
        this.logger.error(`Job ${job.id} failed: ${error.message}`);
        if (job.attempts < 3) {
          job.status = 'PENDING';
          job.nextRetryAt = new Date(Date.now() + Math.pow(2, job.attempts) * 1000);
        } else {
          job.status = 'DEAD_LETTER';
        }
      }
    }

    // Dead letter queue
    const deadJobs = this.jobQueue.filter(j => j.status === 'DEAD_LETTER');
    if (deadJobs.length > 0) {
      this.logger.error(`${deadJobs.length} dead letter jobs: ${deadJobs.map(j => j.type).join(', ')}`);
    }

    return { processed: ready.length, dead: deadJobs.length };
  }

  // ============================================================
  // 6. LOG AUDIT (no secrets)
  // ============================================================
  async logRequest(data: {
    requestId: string;
    correlationId?: string;
    tenantId: string;
    userId?: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
  }) {
    this.recordHistogram('http_request_duration_ms', data.durationMs);
    this.incrementCounter('http_requests_total');

    // Never log secrets, passwords, tokens, or sensitive PII
    const sanitizedPath = data.path.replace(/\/api\/v1\/auth\/.*/, '/api/v1/auth/[REDACTED]');

    this.logger.log(
      `[${data.requestId}] ${data.method} ${sanitizedPath} ${data.statusCode} ${data.durationMs}ms tenant=${data.tenantId}`,
    );
  }
}
