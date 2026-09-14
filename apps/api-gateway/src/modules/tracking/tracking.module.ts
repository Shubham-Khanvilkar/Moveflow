import { Module } from '@nestjs/common';
import { EnhancedTrackingService } from './enhanced-tracking.service';
import { GeofenceEngine } from '../../common/maps/geofence-engine';
import { RouteDeviationDetector } from '../../common/maps/route-deviation';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [EnhancedTrackingService, GeofenceEngine, RouteDeviationDetector],
  exports: [EnhancedTrackingService, GeofenceEngine, RouteDeviationDetector],
})
export class TrackingModule {}
