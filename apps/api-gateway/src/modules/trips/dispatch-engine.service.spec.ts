import { Test, TestingModule } from '@nestjs/testing';
import { DispatchEngineService } from './dispatch-engine.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  booking: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  driverProfile: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  trip: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  vehicle: {
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
  bookingPassenger: {
    findMany: jest.fn(),
  },
  tripPassenger: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const TEST_COMPANY = { id: 'company-1' };

describe('DispatchEngineService', () => {
  let service: DispatchEngineService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchEngineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(DispatchEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('autoDispatch', () => {
    it('should throw NotFoundException for non-existent booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      await expect(
        service.autoDispatch(TEST_COMPANY.id, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return null when no drivers available', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'bk-1',
        status: 'APPROVED',
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
      });
      mockPrisma.driverProfile.findMany.mockResolvedValue([]);

      const result = await service.autoDispatch(TEST_COMPANY.id, 'bk-1');
      expect(result).toBeNull();
    });

    it('should auto-dispatch and create trip', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'bk-1',
        status: 'APPROVED',
        serviceType: 'CAB',
        type: 'CAB',
        date: new Date(),
        pickupTime: new Date(),
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Mumbai',
        dropLatitude: 18.52,
        dropLongitude: 73.8567,
        dropAddress: 'Pune',
        passengerCount: 2,
      });
      mockPrisma.driverProfile.findMany.mockResolvedValue([
        {
          id: 'drv-1',
          userId: 'u1',
          rating: 4.5,
          totalTrips: 100,
          status: 'ACTIVE',
          availabilityStatus: 'AVAILABLE',
          User: { name: 'Driver 1' },
          Vehicle: {
            id: 'v1',
            vehicleType: 'CAB',
            latitude: 19.08,
            longitude: 72.88,
          },
        },
      ]);
      mockPrisma.trip.create.mockResolvedValue({ id: 'trip-1', tripCode: 'TRIP-123' });
      mockPrisma.bookingPassenger.findMany.mockResolvedValue([]);

      const result = await service.autoDispatch(TEST_COMPANY.id, 'bk-1');
      expect(result).not.toBeNull();
      expect(result!.driverId).toBe('u1');
      expect(result!.vehicleId).toBe('v1');
      expect(result!.tripCode).toBeDefined();
      expect(mockPrisma.trip.create).toHaveBeenCalled();
      expect(mockPrisma.dispatchAssignment.create).toHaveBeenCalled();
      expect(mockPrisma.booking.update).toHaveBeenCalled();
    });
  });

  describe('manualDispatch', () => {
    it('should throw NotFoundException for non-existent trip', async () => {
      mockPrisma.trip.findFirst.mockResolvedValue(null);
      await expect(
        service.manualDispatch(TEST_COMPANY.id, 'nonexistent', 'drv-1', 'v-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trip not in SCHEDULED status', async () => {
      mockPrisma.trip.findFirst.mockResolvedValue({ id: 'trip-1', status: 'IN_TRANSIT' });
      await expect(
        service.manualDispatch(TEST_COMPANY.id, 'trip-1', 'drv-1', 'v-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should manually dispatch with driver and vehicle', async () => {
      mockPrisma.trip.findFirst.mockResolvedValue({ id: 'trip-1', status: 'SCHEDULED' });
      mockPrisma.driverProfile.findFirst.mockResolvedValue({
        id: 'drv-1',
        userId: 'u1',
        status: 'ACTIVE',
        availabilityStatus: 'AVAILABLE',
      });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1', status: 'AVAILABLE' });
      mockPrisma.trip.update.mockResolvedValue({});
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      const result = await service.manualDispatch(TEST_COMPANY.id, 'trip-1', 'drv-1', 'v-1', 'admin-1');
      expect(result.tripId).toBe('trip-1');
      expect(result.driverId).toBe('u1');
      expect(result.vehicleId).toBe('v-1');
      expect(result.dispatchedBy).toBe('admin-1');
      expect(mockPrisma.dispatchAssignment.create).toHaveBeenCalled();
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ASSIGNED' }) }),
      );
    });
  });

  describe('getDispatchSLA', () => {
    it('should return real SLA metrics', async () => {
      const now = new Date();
      mockPrisma.trip.findMany.mockResolvedValue([
        {
          id: 't1',
          status: 'COMPLETED',
          createdAt: new Date(now.getTime() - 300000),
          scheduledPickupTime: new Date(now.getTime() - 240000),
          actualPickupTime: new Date(now.getTime() - 250000),
        },
        {
          id: 't2',
          status: 'IN_TRANSIT',
          createdAt: new Date(now.getTime() - 120000),
          scheduledPickupTime: new Date(now.getTime() - 60000),
          actualPickupTime: new Date(now.getTime() - 70000),
        },
      ]);

      const result = await service.getDispatchSLA(TEST_COMPANY.id);
      expect(result).toHaveProperty('totalTrips', 2);
      expect(result).toHaveProperty('avgDispatchMinutes');
      expect(result).toHaveProperty('slaTargetMinutes', 5);
      expect(result).toHaveProperty('slaCompliance');
      expect(result).toHaveProperty('onTimeDeparture');
      expect(result).toHaveProperty('statusBreakdown');
    });
  });

  describe('dispatchFactors', () => {
    it('should return 5 dispatch factors', async () => {
      const result = await service.dispatchFactors(TEST_COMPANY.id);
      expect(result.factors).toHaveLength(5);
      expect(result.factors[0]).toHaveProperty('name');
      expect(result.factors[0]).toHaveProperty('weight');
      expect(result.factors[0]).toHaveProperty('description');
      expect(result.algorithm).toBe('WEIGHTED_SCORING');
    });
  });

  describe('dispatchOverrideAudit', () => {
    it('should throw NotFoundException for non-existent trip', async () => {
      mockPrisma.trip.findFirst.mockResolvedValue(null);
      await expect(
        service.dispatchOverrideAudit(TEST_COMPANY.id, 'nonexistent', 'admin-1', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should record an override audit entry', async () => {
      mockPrisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1',
        driverId: 'drv-1',
        vehicleId: 'v-1',
      });
      mockPrisma.dispatchAssignment.create.mockResolvedValue({});

      const result = await service.dispatchOverrideAudit(TEST_COMPANY.id, 'trip-1', 'admin-1', 'Driver unavailable');
      expect(result.recorded).toBe(true);
      expect(result.tripId).toBe('trip-1');
      expect(result.reason).toBe('Driver unavailable');
      expect(mockPrisma.dispatchAssignment.create).toHaveBeenCalled();
    });
  });
});
