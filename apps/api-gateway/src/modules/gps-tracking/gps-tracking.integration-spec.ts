import { Test, TestingModule } from '@nestjs/testing';
import { GPSTrackingService } from './gps-tracking.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotFoundException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY } from '../../../test/test-utils';

describe('GPS Tracking Integration', () => {
  let service: GPSTrackingService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GPSTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(GPSTrackingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GPS Location Recording', () => {
    it('should create GPS log and upsert vehicle location', async () => {
      prisma.gPSLog.create.mockResolvedValue({
        id: 'log-1',
        vehicleId: 'v1',
        latitude: 19.076,
        longitude: 72.8777,
        recordedAt: new Date(),
      });
      prisma.vehicleLocation.upsert.mockResolvedValue({
        id: 'vl-1',
        vehicleId: 'v1',
        latitude: 19.076,
        longitude: 72.8777,
        lastUpdated: new Date(),
      });
      prisma.geofence.findMany.mockResolvedValue([]);

      const result = await service.updateLocation(TEST_COMPANY.id, {
        vehicleId: 'v1',
        latitude: 19.076,
        longitude: 72.8777,
        speed: 45,
        heading: 180,
      });

      expect(result.gpsLog.latitude).toBe(19.076);
      expect(prisma.vehicleLocation.upsert).toHaveBeenCalled();
    });
  });

  describe('Vehicle Locations', () => {
    it('should return all vehicle locations for company', async () => {
      prisma.vehicleLocation.findMany.mockResolvedValue([
        { id: 'vl-1', vehicleId: 'v1', latitude: 19.076 },
        { id: 'vl-2', vehicleId: 'v2', latitude: 18.52 },
      ]);

      const result = await service.getVehicleLocations(TEST_COMPANY.id);
      expect(result).toHaveLength(2);
    });

    it('should return single vehicle location', async () => {
      prisma.vehicleLocation.findFirst.mockResolvedValue({
        id: 'vl-1',
        vehicleId: 'v1',
        latitude: 19.076,
      });

      const result = await service.getVehicleLocation(TEST_COMPANY.id, 'v1');
      expect(result.vehicleId).toBe('v1');
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      prisma.vehicleLocation.findFirst.mockResolvedValue(null);

      await expect(service.getVehicleLocation(TEST_COMPANY.id, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('GPS History', () => {
    it('should return GPS history for vehicle in date range', async () => {
      prisma.gPSLog.findMany.mockResolvedValue([
        { id: 'log-1', vehicleId: 'v1', latitude: 19.076, recordedAt: new Date() },
        { id: 'log-2', vehicleId: 'v1', latitude: 19.08, recordedAt: new Date() },
      ]);

      const from = new Date(Date.now() - 3600000).toISOString();
      const to = new Date().toISOString();

      const result = await service.getVehicleHistory(TEST_COMPANY.id, 'v1', from, to);
      expect(result).toHaveLength(2);

      const findManyCall = prisma.gPSLog.findMany.mock.calls[0][0];
      expect(findManyCall.where.vehicleId).toBe('v1');
    });
  });

  describe('Geofence Management', () => {
    it('should create a geofence', async () => {
      prisma.geofence.create.mockResolvedValue({
        id: 'gf-1',
        companyId: TEST_COMPANY.id,
        name: 'Office Zone',
        type: 'CUSTOM',
        latitude: 19.076,
        longitude: 72.8777,
        radius: 500,
      });

      const result = await service.createGeofence(
        TEST_COMPANY.id,
        { name: 'Office Zone', latitude: 19.076, longitude: 72.8777, radius: 500 },
        'admin-1',
      );

      expect(result.name).toBe('Office Zone');
      expect(audit.log).toHaveBeenCalled();
    });

    it('should return all geofences', async () => {
      prisma.geofence.findMany.mockResolvedValue([
        { id: 'gf-1', name: 'Office' },
        { id: 'gf-2', name: 'Warehouse' },
      ]);

      const result = await service.getGeofences(TEST_COMPANY.id);
      expect(result).toHaveLength(2);
    });

    it('should update a geofence', async () => {
      prisma.geofence.findFirst.mockResolvedValue({
        id: 'gf-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.geofence.update.mockResolvedValue({
        id: 'gf-1',
        name: 'Updated Zone',
        radius: 1000,
      });

      const result = await service.updateGeofence(
        TEST_COMPANY.id,
        'gf-1',
        { name: 'Updated Zone', radius: 1000 },
        'admin-1',
      );

      expect(result.name).toBe('Updated Zone');
    });

    it('should delete a geofence', async () => {
      prisma.geofence.findFirst.mockResolvedValue({
        id: 'gf-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.geofence.delete.mockResolvedValue({ id: 'gf-1' });

      const result = await service.deleteGeofence(TEST_COMPANY.id, 'gf-1', 'admin-1');
      expect(result.success).toBe(true);
    });
  });

  describe('Geofence Events', () => {
    it('should return geofence events', async () => {
      prisma.geofenceEvent.findMany.mockResolvedValue([
        { id: 'evt-1', geofenceId: 'gf-1', action: 'ENTER', geofence: { name: 'Office' } },
      ]);

      const result = await service.getGeofenceEvents(TEST_COMPANY.id);
      expect(result).toHaveLength(1);
    });
  });

  describe('Route Deviations', () => {
    it('should return route deviations', async () => {
      prisma.routeDeviation.findMany.mockResolvedValue([
        { id: 'rd-1', vehicleId: 'v1', status: 'DETECTED' },
      ]);

      const result = await service.getRouteDeviations(TEST_COMPANY.id);
      expect(result).toHaveLength(1);
    });

    it('should resolve a route deviation', async () => {
      prisma.routeDeviation.findFirst.mockResolvedValue({
        id: 'rd-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.routeDeviation.update.mockResolvedValue({
        id: 'rd-1',
        status: 'RESOLVED',
        reviewedBy: 'admin-1',
      });

      const result = await service.resolveRouteDeviation(TEST_COMPANY.id, 'rd-1', 'admin-1');
      expect(result.status).toBe('RESOLVED');
    });
  });

  describe('Live Map', () => {
    it('should aggregate vehicles, geofences, and events', async () => {
      prisma.vehicleLocation.findMany.mockResolvedValue([
        { id: 'vl-1', vehicleId: 'v1' },
      ]);
      prisma.geofence.findMany.mockResolvedValue([
        { id: 'gf-1', name: 'Office' },
      ]);
      prisma.geofenceEvent.findMany.mockResolvedValue([
        { id: 'evt-1', action: 'ENTER' },
      ]);

      const result = await service.getLiveMap(TEST_COMPANY.id);

      expect(result.vehicles).toHaveLength(1);
      expect(result.geofences).toHaveLength(1);
      expect(result.recentEvents).toHaveLength(1);
    });
  });
});
