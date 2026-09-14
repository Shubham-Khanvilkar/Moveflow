import { Module } from '@nestjs/common';
import { NotificationCenterController } from './notification-center.controller';
import { NotificationCenterService } from './notification-center.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [NotificationCenterController],
  providers: [NotificationCenterService, PrismaService, AuditService],
  exports: [NotificationCenterService],
})
export class NotificationCenterModule {}
