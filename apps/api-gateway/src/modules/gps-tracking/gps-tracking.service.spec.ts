import { Test, TestingModule } from '@nestjs/testing';
import { GPSTrackingService } from './gps-tracking.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { EventsGateway } from '../../common/events.gateway';
import { NotFoundException } from '@nestjs/common';

describe('GPSTrackingService', () => {
  let service: GPSTrackingService;
  let prisma: any;
  let audit: any;
  let eventsGateway: any;

  beforeEach(async () => {
    prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      gPSLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      vehicleLocation: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      geofence: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      geofenceEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      routeDeviation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { log: jest.fn() };
    eventsGateway = {
      broadcastToCompany: jest.fn(),
      broadcastToTrip: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GPSTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get(GPSTrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateLocation', () => {
    it('should store GPS ping and upsert vehicle location', async () => {
      prisma.gPSLog.create.mockResolvedValue({ id: 'log-1' });
      prisma.vehicleLocation.upsert.mockResolvedValue({ id: 'loc-1', vehicleId: 'v-1' });
      prisma.geofence.findMany.mockResolvedValue([]);

      const result = await service.updateLocation('company-1', {
        vehicleId: 'v-1',
        latitude: 19.076,
        longitude: 72.8777,
        speed: 45,
        heading: 90,
      });

      expect(result.gpsLog.id).toBe('log-1');
      expect(result.vehicleLocation.id).toBe('loc-1');
      expect(prisma.gPSLog.create).toHaveBeenCalled();
      expect(prisma.vehicleLocation.upsert).toHaveBeenCalled();
    });
  });

  describe('getVehicleLocations', () => {
    it('should return all vehicle locations for company', async () => {
      prisma.vehicleLocation.findMany.mockResolvedValue([
        { id: 'loc-1', vehicleId: 'v-1', latitude: 19.076 },
        { id: 'loc-2', vehicleId: 'v-2', latitude: 19.08 },
      ]);

      const result = await service.getVehicleLocations('company-1');

      expect(result).toHaveLength(2);
      expect(prisma.vehicleLocation.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        orderBy: { lastUpdated: 'desc' },
      });
    });
  });

  describe('getVehicleLocation', () => {
    it('should return location for specific vehicle', async () => {
      prisma.vehicleLocation.findFirst.mockResolvedValue({
        id: 'loc-1',
        vehicleId: 'v-1',
        latitude: 19.076,
      });

      const result = await service.getVehicleLocation('company-1', 'v-1');

      expect(result.id).toBe('loc-1');
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicleLocation.findFirst.mockResolvedValue(null);

      await expect(
        service.getVehicleLocation('company-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVehicleHistory', () => {
    it('should return GPS history for vehicle in date range', async () => {
      prisma.gPSLog.findMany.mockResolvedValue([
        { id: 'log-1', vehicleId: 'v-1', recordedAt: new Date('2026-01-01') },
        { id: 'log-2', vehicleId: 'v-1', recordedAt: new Date('2026-01-02') },
      ]);

      const result = await service.getVehicleHistory(
        'company-1',
        'v-1',
        '2026-01-01',
        '2026-01-31',
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('createGeofence', () => {
    it('should create geofence and log audit', async () => {
      prisma.geofence.create.mockResolvedValue({
        id: 'gf-1',
        name: 'Office Zone',
        latitude: 19.076,
        longitude: 72.8777,
        radius: 500,
      });

      const result = await service.createGeofence('company-1', {
        name: 'Office Zone',
        latitude: 19.076,
        longitude: 72.8777,
        radius: 500,
      }, 'admin-1');

      expect(result.name).toBe('Office Zone');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'GEOFENCE_CREATED' }),
      );
    });
  });

  describe('getGeofences', () => {
    it('should return all geofences for company', async () => {
      prisma.geofence.findMany.mockResolvedValue([
        { id: 'gf-1', name: 'Office Zone' },
        { id: 'gf-2', name: 'Warehouse Zone' },
      ]);

      const result = await service.getGeofences('company-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('updateGeofence', () => {
    it('should update geofence and log audit', async () => {
      prisma.geofence.findFirst.mockResolvedValue({
        id: 'gf-1',
        name: 'Office Zone',
        companyId: 'company-1',
      });
      prisma.geofence.update.mockResolvedValue({
        id: 'gf-1',
        name: 'Updated Zone',
      });

      const result = await service.updateGeofence('company-1', 'gf-1', {
        name: 'Updated Zone',
      }, 'admin-1');

      expect(result.name).toBe('Updated Zone');
    });

    it('should throw NotFoundException when geofence not found', async () => {
      prisma.geofence.findFirst.mockResolvedValue(null);

      await expect(
        service.updateGeofence('company-1', 'nonexistent', { name: 'Test' }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteGeofence', () => {
    it('should delete geofence and log audit', async () => {
      prisma.geofence.findFirst.mockResolvedValue({
        id: 'gf-1',
        companyId: 'company-1',
      });
      prisma.geofence.delete.mockResolvedValue({});

      const result = await service.deleteGeofence('company-1', 'gf-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'GEOFENCE_DELETED' }),
      );
    });

    it('should throw NotFoundException when geofence not found', async () => {
      prisma.geofence.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteGeofence('company-1', 'nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRouteDeviations', () => {
    it('should return route deviations', async () => {
      prisma.routeDeviation.findMany.mockResolvedValue([
        { id: 'dev-1', status: 'PENDING' },
        { id: 'dev-2', status: 'RESOLVED' },
      ]);

      const result = await service.getRouteDeviations('company-1');

      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      prisma.routeDeviation.findMany.mockResolvedValue([
        { id: 'dev-1', status: 'PENDING' },
      ]);

      await service.getRouteDeviations('company-1', 'PENDING');

      const findManyCall = prisma.routeDeviation.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe('PENDING');
    });
  });

  describe('resolveRouteDeviation', () => {
    it('should resolve route deviation', async () => {
      prisma.routeDeviation.findFirst.mockResolvedValue({
        id: 'dev-1',
        status: 'PENDING',
      });
      prisma.routeDeviation.update.mockResolvedValue({
        id: 'dev-1',
        status: 'RESOLVED',
        reviewedBy: 'admin-1',
      });

      const result = await service.resolveRouteDeviation('company-1', 'dev-1', 'admin-1');

      expect(result.status).toBe('RESOLVED');
    });

    it('should throw NotFoundException when deviation not found', async () => {
      prisma.routeDeviation.findFirst.mockResolvedValue(null);

      await expect(
        service.resolveRouteDeviation('company-1', 'nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLiveMap', () => {
    it('should return vehicles, geofences, and recent events', async () => {
      prisma.vehicleLocation.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.geofence.findMany.mockResolvedValue([{ id: 'gf-1' }]);
      prisma.geofenceEvent.findMany.mockResolvedValue([{ id: 'evt-1' }]);

      const result = await service.getLiveMap('company-1');

      expect(result.vehicles).toHaveLength(1);
      expect(result.geofences).toHaveLength(1);
      expect(result.recentEvents).toHaveLength(1);
    });
  });
});
