import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;
  private lastError: string | null = null;
  private errorCount = 0;

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log('Database connected successfully');
    } catch (error: any) {
      this.connected = false;
      this.logger.error(`Database connection failed: ${error.message?.substring(0, 100)}`);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      this.logger.warn('Running without database - some features may be limited');
    }
  }

  async onModuleDestroy() {
    this.connected = false;
    await this.$disconnect();
  }

  /**
   * Check if database is connected.
   * Used by legacy code that checks before making DB calls.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Track transient DB errors for health reporting.
   * Call this when a Prisma query fails with a connection/pool error.
   */
  trackError(error: any): void {
    const msg = error?.message || String(error);
    if (msg.includes('too many clients') || msg.includes('connection pool') || msg.includes('ECONNREFUSED')) {
      this.errorCount++;
      this.lastError = msg.substring(0, 200);
      if (this.errorCount % 10 === 1) {
        this.logger.warn(`DB pool errors: ${this.errorCount} total, last: ${this.lastError}`);
      }
    }
  }

  /**
   * Reset error counter (call after successful queries).
   */
  clearError(): void {
    if (this.errorCount > 0) {
      this.logger.log(`DB pool errors cleared (was ${this.errorCount})`);
    }
    this.errorCount = 0;
    this.lastError = null;
  }
}
