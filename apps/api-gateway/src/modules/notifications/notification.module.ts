import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationMultiChannelService } from './notification-multi-channel.service';
import { NotificationChannelsService } from './notification-channels.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { BulkNotificationService } from './bulk-notification.service';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationMultiChannelService, NotificationChannelsService, WebhookDispatcherService, BulkNotificationService, AuditService],
  exports: [NotificationService, NotificationMultiChannelService, NotificationChannelsService, WebhookDispatcherService, BulkNotificationService],
})
export class NotificationModule {}
