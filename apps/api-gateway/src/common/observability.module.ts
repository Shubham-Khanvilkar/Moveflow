import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StructuredLogger } from './structured-logger.service';

interface Metrics {
  requests: { total: number; errors: number; latencySum: number };
  websocket: { connections: number; messagesSent: number };
  database: { queries: number; errors: number };
  cache: { hits: number; misses: number };
}

@Global()
@Module({
  providers: [
    {
      provide: StructuredLogger,
      useFactory: () => new StructuredLogger('Navira'),
    },
  ],
  exports: [StructuredLogger],
})
export class ObservabilityModule implements OnModuleInit, OnModuleDestroy {
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private readonly metrics: Metrics = {
    requests: { total: 0, errors: 0, latencySum: 0 },
    websocket: { connections: 0, messagesSent: 0 },
    database: { queries: 0, errors: 0 },
    cache: { hits: 0, misses: 0 },
  };

  constructor(private readonly logger: StructuredLogger) {}

  onModuleInit(): void {
    // Log metrics every 60 seconds
    this.metricsInterval = setInterval(() => {
      this.logMetrics();
    }, 60000);

    this.logger.log('Observability module initialized');
  }

  onModuleDestroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  recordRequest(durationMs: number, isError: boolean): void {
    this.metrics.requests.total++;
    this.metrics.requests.latencySum += durationMs;
    if (isError) this.metrics.requests.errors++;
  }

  recordWebSocket(event: 'connect' | 'disconnect' | 'message'): void {
    if (event === 'connect') this.metrics.websocket.connections++;
    if (event === 'disconnect') this.metrics.websocket.connections--;
    if (event === 'message') this.metrics.websocket.messagesSent++;
  }

  recordDatabaseQuery(isError: boolean): void {
    this.metrics.database.queries++;
    if (isError) this.metrics.database.errors++;
  }

  recordCacheHit(): void {
    this.metrics.cache.hits++;
  }

  recordCacheMiss(): void {
    this.metrics.cache.misses++;
  }

  private logMetrics(): void {
    const avgLatency =
      this.metrics.requests.total > 0
        ? this.metrics.requests.latencySum / this.metrics.requests.total
        : 0;

    this.logger.log('Application metrics', undefined, {
      requests: {
        total: this.metrics.requests.total,
        errors: this.metrics.requests.errors,
        errorRate: `${((this.metrics.requests.errors / this.metrics.requests.total) * 100).toFixed(2)}%`,
        avgLatencyMs: avgLatency.toFixed(2),
      },
      websocket: { ...this.metrics.websocket },
      database: {
        ...this.metrics.database,
        errorRate:
          this.metrics.database.queries > 0
            ? `${((this.metrics.database.errors / this.metrics.database.queries) * 100).toFixed(2)}%`
            : '0%',
      },
      cache: {
        ...this.metrics.cache,
        hitRate:
          this.metrics.cache.hits + this.metrics.cache.misses > 0
            ? `${((this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) * 100).toFixed(2)}%`
            : '0%',
      },
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      },
    });
  }
}
