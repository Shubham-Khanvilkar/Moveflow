import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TripService } from './trip.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripService: TripService) {}

  // ============================================================
  // BOOKINGS
  // ============================================================

  @Get('bookings')
  async listBookings(@Request() req: any, @Query() q: any) {
    return this.tripService.listBookings(req.user.companyId, req.user.sub, q);
  }

  @Get('bookings/:id')
  async getBooking(@Request() req: any, @Param('id') id: string) {
    return this.tripService.getBooking(req.user.companyId, id);
  }

  @Post('bookings')
  async createBooking(@Request() req: any, @Body() body: any) {
    return this.tripService.createBooking(req.user.companyId, req.user.sub, body);
  }

  @Post('bookings/:id/approve')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'MANAGER', 'DISPATCHER')
  async approveBooking(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { approved: boolean; reason?: string },
  ) {
    return this.tripService.approveBooking(
      req.user.companyId,
      id,
      req.user.sub,
      body.approved,
      body.reason,
    );
  }

  // ============================================================
  // DISPATCH
  // ============================================================

  @Get()
  async listTrips(@Request() req: any, @Query() q: any) {
    return this.tripService.listTrips(req.user.companyId, q);
  }

  @Get(':id')
  async getTrip(@Request() req: any, @Param('id') id: string) {
    return this.tripService.getTrip(req.user.companyId, id);
  }

  @Post('drivers/available')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async getAvailableDrivers(@Request() req: any) {
    return this.tripService.getAvailableDrivers(req.user.companyId);
  }

  @Post('vehicles/available')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async getAvailableVehicles(@Request() req: any) {
    return this.tripService.getAvailableVehicles(req.user.companyId);
  }

  @Post('dispatch/:bookingId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async dispatchTrip(
    @Request() req: any,
    @Param('bookingId') bookingId: string,
    @Body() body: { driverId: string; vehicleId: string },
  ) {
    return this.tripService.dispatchTrip(
      req.user.companyId,
      bookingId,
      body.driverId,
      body.vehicleId,
      req.user.sub,
    );
  }

  // ============================================================
  // TRIP STATE TRANSITIONS
  // ============================================================

  @Post(':id/transition')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'DRIVER')
  async transitionTrip(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { action: string; metadata?: Record<string, any> },
  ) {
    return this.tripService.transitionTripState(
      req.user.companyId,
      id,
      body.action as any,
      req.user.sub,
      body.metadata,
    );
  }

  // ============================================================
  // GPS TRACKING
  // ============================================================

  @Post('gps/:vehicleId')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN')
  async recordGPS(
    @Request() req: any,
    @Param('vehicleId') vehicleId: string,
    @Body() body: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      tripId?: string;
      eventId?: string;
    },
  ) {
    return this.tripService.recordGPSLocation(
      req.user.companyId,
      vehicleId,
      body,
    );
  }

  // ============================================================
  // BREAKDOWN & REPLACEMENT
  // ============================================================

  @Post(':id/breakdown/replacement')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
  async findReplacement(
    @Request() req: any,
    @Param('id') tripId: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.tripService.findReplacement(
      req.user.companyId,
      tripId,
      body.latitude,
      body.longitude,
    );
  }

  // ============================================================
  // PASSENGER OPERATIONS
  // ============================================================

  @Get(':id/passengers')
  async getTripPassengers(@Request() req: any, @Param('id') tripId: string) {
    return this.tripService.getTripPassengers(req.user.companyId, tripId);
  }

  @Post(':id/passengers/:userId/transition')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN', 'COMPANY_ADMIN')
  async transitionPassenger(
    @Request() req: any,
    @Param('id') tripId: string,
    @Param('userId') userId: string,
    @Body() body: {
      action: string;
      seatNumber?: number;
      pickupLatitude?: number;
      pickupLongitude?: number;
      dropLatitude?: number;
      dropLongitude?: number;
      boardedImage?: string;
    },
  ) {
    return this.tripService.transitionPassenger(
      req.user.companyId,
      tripId,
      userId,
      body.action,
      {
        seatNumber: body.seatNumber,
        pickupLatitude: body.pickupLatitude,
        pickupLongitude: body.pickupLongitude,
        dropLatitude: body.dropLatitude,
        dropLongitude: body.dropLongitude,
        boardedImage: body.boardedImage,
      },
    );
  }

  // ============================================================
  // GEOFENCE CHECK
  // ============================================================

  @Post('geofence/check')
  @Roles('DRIVER', 'DISPATCHER', 'TRANSPORT_ADMIN')
  async checkGeofence(
    @Request() req: any,
    @Body() body: { vehicleId: string; latitude: number; longitude: number },
  ) {
    return this.tripService.checkGeofence(
      req.user.companyId,
      body.vehicleId,
      body.latitude,
      body.longitude,
    );
  }

  // ============================================================
  // HEALTH CHECK
  // ============================================================

  @Get('health')
  async health() {
    return { status: 'ok', service: 'trips', timestamp: new Date().toISOString() };
  }
}
