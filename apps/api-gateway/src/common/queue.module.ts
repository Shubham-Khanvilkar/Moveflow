import { Module, Global, Logger } from '@nestjs/common';

@Global()
@Module({
  providers: [
    {
      provide: 'BullQueueService',
      useFactory: () => {
        const logger = new Logger('QueueModule');
        try {
          // BullMQ/Redis is optional - only connect if REDIS_HOST is set
          if (process.env.REDIS_HOST || process.env.REDIS_URL) {
            logger.log('Redis configured but optional - running without queue');
          } else {
            logger.log('No Redis configured - queue features disabled');
          }
          return { available: false };
        } catch {
          logger.warn('Redis not available - queue features disabled');
          return { available: false };
        }
      },
    },
  ],
  exports: ['BullQueueService'],
})
export class QueueModule {}
