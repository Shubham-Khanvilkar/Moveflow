import { Module } from '@nestjs/common';
import { TripService } from './trip.service';
import { TripsController } from './trips.controller';
import { DispatchEngineService } from './dispatch-engine.service';
import { DispatchBoardService } from './dispatch-board.service';
import { DispatchController } from './dispatch.controller';
import { RouteMatchService } from './route-match.service';
import { RouteMatchController } from './route-match.controller';
import { ETAService } from './eta.service';
import { ETAController } from './eta.controller';
import { GPSBatchService } from './gps-batch.service';
import { GPSAlertService } from './gps-alert.service';
import { AIAuthorizationService } from './ai-authorization.service';
import { RouteOptimizationService } from './route-optimization.service';
import { TripReassignmentService } from './trip-reassignment.service';
import { TripReassignmentController } from './trip-reassignment.controller';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';
import { EventsGateway } from '../../common/events.gateway';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [DatabaseModule, AuthModule, NotificationModule],
  providers: [
    TripService,
    DispatchEngineService,
    DispatchBoardService,
    RouteMatchService,
    ETAService,
    GPSBatchService,
    GPSAlertService,
    AIAuthorizationService,
    RouteOptimizationService,
    TripReassignmentService,
    AuditService,
    EventsGateway,
  ],
  controllers: [
    TripsController,
    DispatchController,
    RouteMatchController,
    ETAController,
    TripReassignmentController,
  ],
  exports: [
    TripService,
    DispatchEngineService,
    DispatchBoardService,
    RouteMatchService,
    ETAService,
    GPSBatchService,
    GPSAlertService,
    AIAuthorizationService,
    RouteOptimizationService,
    TripReassignmentService,
  ],
})
export class TripsModule {}
