import { Module } from '@nestjs/common';
import { GPSTrackingController } from './gps-tracking.controller';
import { GPSTrackingService } from './gps-tracking.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { EventsGateway } from '../../common/events.gateway';
import { AuthModule } from '../auth/auth.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [AuthModule, TrackingModule],
  controllers: [GPSTrackingController],
  providers: [GPSTrackingService, PrismaService, AuditService, EventsGateway],
  exports: [GPSTrackingService],
})
export class GPSTrackingModule {}
