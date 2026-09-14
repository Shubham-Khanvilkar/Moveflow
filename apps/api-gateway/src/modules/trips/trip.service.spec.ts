import { Test, TestingModule } from '@nestjs/testing';
import { TripService } from './trip.service';
import { PrismaService } from '../../common/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhookDispatcherService } from '../notifications/webhook-dispatcher.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';

jest.mock('./trip-state-machine', () => ({
  TripStateMachine: {
    canTransition: jest.fn().mockReturnValue(true),
    getValidActions: jest.fn().mockReturnValue(['DRIVER_ACCEPT', 'START_TRIP']),
    transition: jest.fn().mockReturnValue('IN_TRANSIT'),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TripStateMachine } = require('./trip-state-machine');

const mockPrisma = {
  isConnected: jest.fn().mockReturnValue(true),
  user: {
    findFirst: jest.fn(),
  },
  transportBan: {
    findFirst: jest.fn(),
  },
  transportPolicy: {
    findFirst: jest.fn(),
  },
  booking: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    findMany: jest.fn(),
  },
  bookingPassenger: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  trip: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  dispatchAssignment: {
    create: jest.fn(),
  },
  driverTrip: {
    create: jest.fn(),
  },
  driverProfile: {
    findFirst: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    update: jest.fn(),
  },
  vehicle: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  tripPassenger: {
    create: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(mockPrisma)),
  auditLog: {
    create: jest.fn(),
  },
  incident: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  replacementAssignment: {
    create: jest.fn(),
  },
  geofence: {
    findMany: jest.fn(),
  },
  geofenceEvent: {
    create: jest.fn(),
  },
  locationPing: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  latestVehicleLocation: {
    upsert: jest.fn(),
  },
  vehicleOccupancyLog: {
    create: jest.fn(),
  },
};

const mockWebhookDispatcher = {
  dispatch: jest.fn().mockResolvedValue(undefined),
};

const mockNotificationChannels = {
  send: jest.fn().mockResolvedValue({ sent: ['EMAIL'], failed: [] }),
};

describe('TripService', () => {
  let service: TripService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookDispatcherService, useValue: mockWebhookDispatcher },
        { provide: NotificationChannelsService, useValue: mockNotificationChannels },
      ],
    }).compile();

    service = module.get(TripService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBooking', () => {
    const companyId = 'company-1';
    const userId = 'user-1';
    const bookingData = {
      serviceType: 'CAB' as const,
      date: '2026-09-15',
      pickupTime: '09:00',
      pickupLatitude: 19.0596,
      pickupLongitude: 72.8656,
      pickupAddress: 'BKC, Mumbai',
      dropLatitude: 19.1197,
      dropLongitude: 72.9050,
      dropAddress: 'Powai, Mumbai',
      passengerCount: 1,
    };

    it('should create a booking successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        transportEligibility: 'ELIGIBLE',
        status: 'ACTIVE',
      });
      mockPrisma.transportBan.findFirst.mockResolvedValue(null);
      mockPrisma.transportPolicy.findFirst.mockResolvedValue({ requireApproval: false });
      mockPrisma.booking.create.mockResolvedValue({
        id: 'booking-1',
        bookingCode: 'BK-123',
        status: 'REQUESTED',
      });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.createBooking(companyId, userId, bookingData);

      expect(result.id).toBe('booking-1');
      expect(result.status).toBe('REQUESTED');
      expect(mockPrisma.booking.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createBooking(companyId, userId, bookingData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for ineligible employee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        transportEligibility: 'INELIGIBLE',
        status: 'ACTIVE',
      });

      await expect(
        service.createBooking(companyId, userId, bookingData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for inactive employee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        transportEligibility: 'ELIGIBLE',
        status: 'INACTIVE',
      });

      await expect(
        service.createBooking(companyId, userId, bookingData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for employee with active ban', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        transportEligibility: 'ELIGIBLE',
        status: 'ACTIVE',
      });
      mockPrisma.transportBan.findFirst.mockResolvedValue({
        id: 'ban-1',
        status: 'ACTIVE',
      });

      await expect(
        service.createBooking(companyId, userId, bookingData),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set PENDING_APPROVAL status when policy requires approval', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        transportEligibility: 'ELIGIBLE',
        status: 'ACTIVE',
      });
      mockPrisma.transportBan.findFirst.mockResolvedValue(null);
      mockPrisma.transportPolicy.findFirst.mockResolvedValue({ requireApproval: true });
      mockPrisma.booking.create.mockResolvedValue({
        id: 'booking-1',
        status: 'PENDING_APPROVAL',
      });
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.createBooking(companyId, userId, bookingData);

      expect(result.status).toBe('PENDING_APPROVAL');
      const createCall = mockPrisma.booking.create.mock.calls[0][0];
      expect(createCall.data.approvalStatus).toBe('PENDING');
    });
  });

  describe('approveBooking', () => {
    it('should approve a pending booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        bookingCode: 'BK-123',
        approvalStatus: 'PENDING',
        requesterId: 'user-1',
      });
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.approveBooking('company-1', 'booking-1', 'mgr-1', true);

      expect(result.success).toBe(true);
      expect(result.status).toBe('APPROVED');
    });

    it('should reject a pending booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        bookingCode: 'BK-123',
        approvalStatus: 'PENDING',
        requesterId: 'user-1',
      });
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.approveBooking(
        'company-1',
        'booking-1',
        'mgr-1',
        false,
        'Budget constraints',
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('REJECTED');
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.approveBooking('company-1', 'nonexistent', 'mgr-1', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when booking not pending', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        approvalStatus: 'APPROVED',
      });

      await expect(
        service.approveBooking('company-1', 'booking-1', 'mgr-1', true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dispatchTrip', () => {
    it('should dispatch a trip successfully', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'APPROVED',
        type: 'CAB',
        date: new Date(),
        pickupTime: new Date(),
        pickupLatitude: 19.05,
        pickupLongitude: 72.86,
        pickupAddress: 'BKC',
        dropLatitude: 19.11,
        dropLongitude: 72.90,
        dropAddress: 'Powai',
        passengerCount: 1,
      });
      mockPrisma.driverProfile.findFirst.mockResolvedValue({
        id: 'driver-1',
        userId: 'driver-user-1',
        status: 'ACTIVE',
      });
      mockPrisma.vehicle.findFirst.mockResolvedValue({
        id: 'vehicle-1',
        status: 'AVAILABLE',
      });
      mockPrisma.trip.create.mockResolvedValue({
        id: 'trip-1',
        tripCode: 'TRIP-123',
      });
      mockPrisma.dispatchAssignment.create.mockResolvedValue({});
      mockPrisma.driverTrip.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});
      mockPrisma.driverProfile.update.mockResolvedValue({});
      mockPrisma.booking.update.mockResolvedValue({});
      mockPrisma.bookingPassenger.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.dispatchTrip(
        'company-1',
        'booking-1',
        'driver-1',
        'vehicle-1',
        'admin-1',
      );

      expect(result.id).toBe('trip-1');
      expect(mockPrisma.trip.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.dispatchTrip('company-1', 'nonexistent', 'driver-1', 'vehicle-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when booking cannot be dispatched', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'REJECTED',
      });

      await expect(
        service.dispatchTrip('company-1', 'booking-1', 'driver-1', 'vehicle-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when driver not available', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'APPROVED',
      });
      mockPrisma.driverProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.dispatchTrip('company-1', 'booking-1', 'driver-1', 'vehicle-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when vehicle not available', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking-1',
        status: 'APPROVED',
      });
      mockPrisma.driverProfile.findFirst.mockResolvedValue({
        id: 'driver-1',
        status: 'ACTIVE',
      });
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.dispatchTrip('company-1', 'booking-1', 'driver-1', 'vehicle-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transitionTripState', () => {
    it('should transition trip state successfully', async () => {
      TripStateMachine.canTransition.mockReturnValue(true);
      TripStateMachine.transition.mockReturnValue('IN_TRANSIT');

      mockPrisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1',
        status: 'SCHEDULED',
        startedAt: null,
        vehicleId: 'vehicle-1',
        driverId: 'driver-user-1',
      });
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        status: 'SCHEDULED',
      });
      mockPrisma.trip.update.mockResolvedValue({ id: 'trip-1', status: 'IN_TRANSIT' });
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.transitionTripState(
        'company-1',
        'trip-1',
        'START_TRIP',
        'driver-1',
      );

      expect(result.status).toBe('IN_TRANSIT');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent trip', async () => {
      mockPrisma.trip.findFirst.mockResolvedValue(null);

      await expect(
        service.transitionTripState('company-1', 'nonexistent', 'START_TRIP', 'driver-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const { TripStateMachine } = require('./trip-state-machine');
      TripStateMachine.canTransition.mockReturnValue(false);
      TripStateMachine.getValidActions.mockReturnValue(['COMPLETE_TRIP']);

      mockPrisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1',
        status: 'COMPLETED',
      });

      await expect(
        service.transitionTripState('company-1', 'trip-1', 'START_TRIP', 'driver-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordGPSLocation', () => {
    it('should record GPS location', async () => {
      mockPrisma.locationPing.findUnique.mockResolvedValue(null);
      mockPrisma.locationPing.create.mockResolvedValue({ id: 'ping-1' });
      mockPrisma.latestVehicleLocation.upsert.mockResolvedValue({});
      mockPrisma.geofence.findMany.mockResolvedValue([]);

      const result = await service.recordGPSLocation('company-1', 'vehicle-1', {
        latitude: 19.05,
        longitude: 72.86,
        speed: 45,
      });

      expect(result.id).toBe('ping-1');
    });

    it('should return existing ping for duplicate eventId', async () => {
      const existingPing = { id: 'existing-ping' };
      mockPrisma.locationPing.findUnique.mockResolvedValue(existingPing);

      const result = await service.recordGPSLocation('company-1', 'vehicle-1', {
        latitude: 19.05,
        longitude: 72.86,
        eventId: 'event-1',
      });

      expect(result).toEqual(existingPing);
      expect(mockPrisma.locationPing.create).not.toHaveBeenCalled();
    });
  });

  describe('checkGeofence', () => {
    it('should trigger geofence event when inside boundary', async () => {
      mockPrisma.geofence.findMany.mockResolvedValue([
        {
          id: 'gf-1',
          name: 'Office Zone',
          type: 'WORKPLACE',
          latitude: 19.05,
          longitude: 72.86,
          radius: 500,
        },
      ]);
      mockPrisma.geofenceEvent.create.mockResolvedValue({});

      const result = await service.checkGeofence('company-1', 'vehicle-1', 19.05, 72.86);

      expect(result).toHaveLength(1);
      expect(result[0].geofenceName).toBe('Office Zone');
      expect(mockPrisma.geofenceEvent.create).toHaveBeenCalled();
    });

    it('should return empty array when outside all geofences', async () => {
      mockPrisma.geofence.findMany.mockResolvedValue([
        {
          id: 'gf-1',
          name: 'Office Zone',
          latitude: 19.05,
          longitude: 72.86,
          radius: 100,
        },
      ]);

      const result = await service.checkGeofence('company-1', 'vehicle-1', 20.0, 73.0);

      expect(result).toHaveLength(0);
    });
  });
});
