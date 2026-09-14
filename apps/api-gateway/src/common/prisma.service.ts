import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

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
}
