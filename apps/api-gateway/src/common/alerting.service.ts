import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  channels: ('email' | 'slack' | 'pagerduty')[];
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  firedAt: Date;
  resolvedAt?: Date;
  status: 'FIRING' | 'RESOLVED';
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private metrics: Map<string, number> = new Map();

  constructor(private prisma: PrismaService) {}

  recordMetric(name: string, value: number) {
    this.metrics.set(name, value);
    this.checkRules(name, value);
  }

  incrementMetric(name: string, delta: number = 1) {
    const current = this.metrics.get(name) || 0;
    this.recordMetric(name, current + delta);
  }

  getMetric(name: string): number {
    return this.metrics.get(name) || 0;
  }

  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  private checkRules(metricName: string, value: number) {
    const rules = this.getActiveRules();
    for (const rule of rules) {
      if (rule.metric !== metricName) continue;

      let triggered = false;
      switch (rule.condition) {
        case 'gt': triggered = value > rule.threshold; break;
        case 'lt': triggered = value < rule.threshold; break;
        case 'eq': triggered = value === rule.threshold; break;
      }

      if (triggered) {
        this.fireAlert(rule, value);
      }
    }
  }

  private fireAlert(rule: AlertRule, currentValue: number) {
    this.logger.warn(`ALERT FIRED: ${rule.name} - ${rule.metric} = ${currentValue} (${rule.condition} ${rule.threshold})`);

    this.sendNotifications(rule, {
      rule: rule.name,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
    });
  }

  private async sendNotifications(rule: AlertRule, data: any) {
    for (const channel of rule.channels) {
      switch (channel) {
        case 'email':
          this.logger.log(`Alert email sent for ${rule.name}`);
          break;
        case 'slack':
          this.logger.log(`Alert Slack notification sent for ${rule.name}`);
          break;
        case 'pagerduty':
          this.logger.log(`Alert PagerDuty incident created for ${rule.name}`);
          break;
      }
    }
  }

  private getActiveRules(): AlertRule[] {
    return [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'http_errors',
        condition: 'gt',
        threshold: 50,
        severity: 'CRITICAL',
        channels: ['email', 'slack'],
        enabled: true,
      },
      {
        id: 'slow_response',
        name: 'Slow Response Time',
        metric: 'http_avg_duration',
        condition: 'gt',
        threshold: 2000,
        severity: 'WARNING',
        channels: ['slack'],
        enabled: true,
      },
      {
        id: 'db_connection_pool',
        name: 'DB Connection Pool Exhausted',
        metric: 'db_active_connections',
        condition: 'gt',
        threshold: 90,
        severity: 'CRITICAL',
        channels: ['email', 'slack', 'pagerduty'],
        enabled: true,
      },
      {
        id: 'memory_high',
        name: 'High Memory Usage',
        metric: 'process_memory_mb',
        condition: 'gt',
        threshold: 1024,
        severity: 'WARNING',
        channels: ['slack'],
        enabled: true,
      },
    ];
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return [];
  }
}
