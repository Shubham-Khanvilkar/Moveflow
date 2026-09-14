import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  incrementCounter(name: string, labels?: Record<string, string>) {
    const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  recordHistogram(name: string, value: number) {
    const values = this.histograms.get(name) || [];
    values.push(value);
    this.histograms.set(name, values);
  }

  setGauge(name: string, value: number) {
    this.gauges.set(name, value);
  }

  getMetrics(): string {
    const lines: string[] = [];
    for (const [key, value] of this.counters) {
      lines.push(`navira_${key} ${value}`);
    }
    for (const [key, values] of this.histograms) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      lines.push(`navira_${key}_avg ${avg}`);
      lines.push(`navira_${key}_count ${values.length}`);
    }
    for (const [key, value] of this.gauges) {
      lines.push(`navira_${key} ${value}`);
    }
    return lines.join('\n');
  }
}
