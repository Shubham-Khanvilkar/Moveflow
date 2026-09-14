import { Test, TestingModule } from '@nestjs/testing';
import { TripService } from './trip.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY, TEST_EMPLOYEE, TEST_VEHICLE } from '../../../test/test-utils';
import { WebhookDispatcherService } from '../notifications/webhook-dispatcher.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';

describe('Trip Integration', () => {
  let service: TripService;
  let prisma: any;
  let audit: any;
  let webhookDispatcher: any;
  let notificationChannels: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();
    webhookDispatcher = { dispatch: jest.fn().mockResolvedValue(undefined) };
    notificationChannels = { send: jest.fn().mockResolvedValue({ sent: ['EMAIL'], failed: [] }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: WebhookDispatcherService, useValue: webhookDispatcher },
        { provide: NotificationChannelsService, useValue: notificationChannels },
      ],
    }).compile();

    service = module.get(TripService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Booking → Approval → Dispatch → Trip', () => {
    it('should complete full booking lifecycle', async () => {
      // Create booking
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.transportBan.findFirst.mockResolvedValue(null);
      prisma.transportPolicy.findFirst.mockResolvedValue({ requireApproval: false });
      prisma.booking.create.mockResolvedValue({
        id: 'bk-1',
        bookingCode: 'BK-TEST-001',
        status: 'REQUESTED',
        approvalStatus: 'NOT_REQUIRED',
      });
      prisma.notification.create.mockResolvedValue({});

      const booking = await service.createBooking(TEST_COMPANY.id, TEST_EMPLOYEE.id, {
        serviceType: 'CAB',
        date: '2026-01-15',
        pickupTime: '09:00',
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Home',
        dropLatitude: 18.52,
        dropLongitude: 73.8567,
        dropAddress: 'Office',
      });

      expect(booking.status).toBe('REQUESTED');

      // Dispatch trip
      prisma.booking.findFirst.mockResolvedValue({
        id: 'bk-1',
        companyId: TEST_COMPANY.id,
        status: 'REQUESTED',
      });
      prisma.driverProfile.findFirst.mockResolvedValue({
        id: 'drv-1',
        userId: 'driver-user-1',
        status: 'ACTIVE',
      });
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v1',
        status: 'AVAILABLE',
      });
      prisma.trip.create.mockResolvedValue({
        id: 'trip-1',
        tripCode: 'TRIP-TEST-001',
        status: 'SCHEDULED',
      });
      prisma.dispatchAssignment.create.mockResolvedValue({});
      prisma.driverTrip.create.mockResolvedValue({});
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'ASSIGNED' });
      prisma.driverProfile.update.mockResolvedValue({});
      prisma.booking.update.mockResolvedValue({});
      prisma.bookingPassenger.findMany.mockResolvedValue([]);
      prisma.notification.create.mockResolvedValue({});

      const trip = await service.dispatchTrip(TEST_COMPANY.id, 'bk-1', 'driver-user-1', 'v1', 'admin-1');
      expect(trip.status).toBe('SCHEDULED');
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ASSIGNED' }) }),
      );
    });
  });

  describe('Approval Policy', () => {
    it('should set PENDING_APPROVAL when policy requires approval', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.transportBan.findFirst.mockResolvedValue(null);
      prisma.transportPolicy.findFirst.mockResolvedValue({ requireApproval: true });
      prisma.booking.create.mockResolvedValue({
        id: 'bk-2',
        status: 'PENDING_APPROVAL',
        approvalStatus: 'PENDING',
      });
      prisma.notification.create.mockResolvedValue({});

      const booking = await service.createBooking(TEST_COMPANY.id, TEST_EMPLOYEE.id, {
        serviceType: 'CAB',
        date: '2026-01-15',
        pickupTime: '09:00',
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Home',
        dropLatitude: 18.52,
        dropLongitude: 73.8567,
        dropAddress: 'Office',
      });

      expect(booking.status).toBe('PENDING_APPROVAL');
      expect(booking.approvalStatus).toBe('PENDING');
    });
  });

  describe('Booking Guards', () => {
    it('should reject booking for ineligible employee', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        status: 'ACTIVE',
        transportEligibility: 'INELIGIBLE',
      });

      await expect(
        service.createBooking(TEST_COMPANY.id, TEST_EMPLOYEE.id, {
          serviceType: 'CAB',
          date: '2026-01-15',
          pickupTime: '09:00',
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          pickupAddress: 'Home',
          dropLatitude: 18.52,
          dropLongitude: 73.8567,
          dropAddress: 'Office',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject booking for employee with active ban', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.transportBan.findFirst.mockResolvedValue({
        id: 'ban-1',
        status: 'ACTIVE',
      });

      await expect(
        service.createBooking(TEST_COMPANY.id, TEST_EMPLOYEE.id, {
          serviceType: 'CAB',
          date: '2026-01-15',
          pickupTime: '09:00',
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          pickupAddress: 'Home',
          dropLatitude: 18.52,
          dropLongitude: 73.8567,
          dropAddress: 'Office',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Trip State Transitions', () => {
    it('should transition trip through valid states', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1',
        companyId: TEST_COMPANY.id,
        status: 'SCHEDULED',
      });
      prisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        status: 'SCHEDULED',
      });
      prisma.trip.update.mockResolvedValue({
        id: 'trip-1',
        status: 'DISPATCHED',
      });
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.auditLog.create.mockResolvedValue({});

      const trip = await service.transitionTripState(
        TEST_COMPANY.id,
        'trip-1',
        'DISPATCH',
        'admin-1',
      );
      expect(trip.status).toBe('DISPATCHED');
    });

    it('should reject invalid state transitions', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1',
        companyId: TEST_COMPANY.id,
        status: 'COMPLETED',
      });

      await expect(
        service.transitionTripState(TEST_COMPANY.id, 'trip-1', 'DISPATCH', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GPS Recording', () => {
    it('should record GPS and upsert vehicle location', async () => {
      prisma.locationPing.findUnique.mockResolvedValue(null);
      prisma.locationPing.create.mockResolvedValue({
        id: 'ping-1',
        vehicleId: 'v1',
        latitude: 19.076,
        longitude: 72.8777,
      });
      prisma.latestVehicleLocation.upsert.mockResolvedValue({});
      prisma.geofence.findMany.mockResolvedValue([]);

      const result = await service.recordGPSLocation(TEST_COMPANY.id, 'v1', {
        latitude: 19.076,
        longitude: 72.8777,
        speed: 45,
      });

      expect(result.latitude).toBe(19.076);
      expect(prisma.latestVehicleLocation.upsert).toHaveBeenCalled();
    });

    it('should return existing ping for duplicate eventId', async () => {
      prisma.locationPing.findUnique.mockResolvedValue({
        id: 'existing-ping',
        eventId: 'event-123',
      });

      const result = await service.recordGPSLocation(TEST_COMPANY.id, 'v1', {
        latitude: 19.076,
        longitude: 72.8777,
        eventId: 'event-123',
      });

      expect(result.id).toBe('existing-ping');
      expect(prisma.locationPing.create).not.toHaveBeenCalled();
    });
  });

  describe('Geofence Check', () => {
    it('should trigger event when vehicle enters geofence', async () => {
      prisma.geofence.findMany.mockResolvedValue([
        {
          id: 'gf-1',
          companyId: TEST_COMPANY.id,
          name: 'Office Zone',
          latitude: 19.076,
          longitude: 72.8777,
          radius: 500,
          isActive: true,
        },
      ]);
      prisma.geofenceEvent.findFirst.mockResolvedValue(null);
      prisma.geofenceEvent.create.mockResolvedValue({
        id: 'event-1',
        geofenceId: 'gf-1',
        action: 'ENTER',
      });

      const events = await service.checkGeofence(TEST_COMPANY.id, 'v1', 19.076, 72.8777);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].action).toBe('ENTER');
    });

    it('should return empty when outside all geofences', async () => {
      prisma.geofence.findMany.mockResolvedValue([
        {
          id: 'gf-1',
          latitude: 19.076,
          longitude: 72.8777,
          radius: 100,
          isActive: true,
        },
      ]);

      const events = await service.checkGeofence(TEST_COMPANY.id, 'v1', 20.0, 73.0);
      expect(events).toHaveLength(0);
    });
  });

  describe('Passenger Manifest', () => {
    it('should copy BookingPassengers to TripPassengers on dispatch', async () => {
      prisma.booking.findFirst.mockResolvedValue({
        id: 'bk-1',
        companyId: TEST_COMPANY.id,
        status: 'REQUESTED',
      });
      prisma.driverProfile.findFirst.mockResolvedValue({
        id: 'drv-1', userId: 'driver-1', status: 'ACTIVE',
      });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });
      prisma.trip.create.mockResolvedValue({ id: 'trip-1', tripCode: 'TRIP-001', status: 'SCHEDULED' });
      prisma.dispatchAssignment.create.mockResolvedValue({});
      prisma.driverTrip.create.mockResolvedValue({});
      prisma.vehicle.update.mockResolvedValue({});
      prisma.driverProfile.update.mockResolvedValue({});
      prisma.booking.update.mockResolvedValue({});
      prisma.bookingPassenger.findMany.mockResolvedValue([
        { bookingId: 'bk-1', userId: 'emp-1', passengerName: 'Employee 1' },
        { bookingId: 'bk-1', userId: 'emp-2', passengerName: 'Employee 2' },
      ]);
      prisma.tripPassenger.create.mockResolvedValue({});
      prisma.notification.create.mockResolvedValue({});

      await service.dispatchTrip(TEST_COMPANY.id, 'bk-1', 'driver-1', 'v1', 'admin-1');

      expect(prisma.tripPassenger.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Available Resources', () => {
    it('should return active drivers', async () => {
      prisma.driverProfile.findMany.mockResolvedValue([
        { id: 'd1', user: { id: 'u1', name: 'Driver 1' } },
      ]);

      const result = await service.getAvailableDrivers(TEST_COMPANY.id);
      expect(result.data).toHaveLength(1);

      const findManyCall = prisma.driverProfile.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe('ACTIVE');
    });

    it('should return available vehicles', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        { id: 'v1', registrationNo: 'MH-01' },
      ]);

      const result = await service.getAvailableVehicles(TEST_COMPANY.id);
      expect(result.data).toHaveLength(1);

      const findManyCall = prisma.vehicle.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe('AVAILABLE');
    });
  });
});
