import { Test, TestingModule } from '@nestjs/testing';
import { SafetyIncidentService } from './safety-incident.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

describe('SafetyIncidentService', () => {
  let service: SafetyIncidentService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      vehicle: {
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      incident: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      sOSAlert: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyIncidentService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<SafetyIncidentService>(SafetyIncidentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reportIncident', () => {
    it('should create an incident and log audit', async () => {
      const fakeIncident = { id: 'inc-1', type: 'ACCIDENT', status: 'REPORTED' };
      prisma.incident.create.mockResolvedValue(fakeIncident);

      const result = await service.reportIncident('comp-1', {
        incidentType: 'ACCIDENT',
        description: 'Minor fender bender',
        reportedBy: 'user-1',
      });

      expect(result).toEqual(fakeIncident);
      expect(prisma.incident.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INCIDENT_REPORTED', entityId: 'inc-1' }),
      );
    });

    it('should throw ServiceUnavailableException when DB is down', async () => {
      prisma.isConnected.mockReturnValue(false);

      await expect(
        service.reportIncident('comp-1', {
          incidentType: 'ACCIDENT',
          description: 'test',
          reportedBy: 'user-1',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getIncidents', () => {
    it('should return paginated incidents', async () => {
      const fakeIncidents = [{ id: 'inc-1' }, { id: 'inc-2' }];
      prisma.incident.findMany.mockResolvedValue(fakeIncidents);
      prisma.incident.count.mockResolvedValue(2);

      const result = await service.getIncidents('comp-1', { page: 1, limit: 10 });

      expect(result.incidents).toEqual(fakeIncidents);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should cap limit at 100', async () => {
      prisma.incident.findMany.mockResolvedValue([]);
      prisma.incident.count.mockResolvedValue(0);

      await service.getIncidents('comp-1', { limit: 200 });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should filter by status and incidentType', async () => {
      prisma.incident.findMany.mockResolvedValue([]);
      prisma.incident.count.mockResolvedValue(0);

      await service.getIncidents('comp-1', { status: 'REPORTED', incidentType: 'ACCIDENT' });

      expect(prisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'REPORTED', type: 'ACCIDENT' }),
        }),
      );
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update status and log audit', async () => {
      prisma.incident.findFirst.mockResolvedValue({ id: 'inc-1', companyId: 'comp-1' });
      prisma.incident.update.mockResolvedValue({ id: 'inc-1', status: 'RESOLVED' });

      const result = await service.updateIncidentStatus('comp-1', 'inc-1', 'RESOLVED', 'user-1');

      expect(result.status).toBe('RESOLVED');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INCIDENT_STATUS_UPDATED' }),
      );
    });

    it('should throw NotFoundException if incident not found', async () => {
      prisma.incident.findFirst.mockResolvedValue(null);

      await expect(
        service.updateIncidentStatus('comp-1', 'nonexistent', 'RESOLVED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reportBreakdown', () => {
    it('should create breakdown incident and mark vehicle inactive', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'veh-1', companyId: 'comp-1' });
      prisma.incident.create.mockResolvedValue({ id: 'inc-1', type: 'VEHICLE_BREAKDOWN' });

      const result = await service.reportBreakdown('comp-1', {
        vehicleId: 'veh-1',
        breakdownType: 'ENGINE_FAILURE',
        description: 'Engine stalled',
        reportedBy: 'user-1',
      });

      expect(result).toBeDefined();
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'INACTIVE' }) }),
      );
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.reportBreakdown('comp-1', {
          vehicleId: 'nonexistent',
          breakdownType: 'FLAT_TIRE',
          description: 'Flat tire',
          reportedBy: 'user-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('triggerSOS', () => {
    it('should create SOS alert', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1', companyId: 'comp-1' });
      prisma.sOSAlert.create.mockResolvedValue({ id: 'sos-1', status: 'OPEN' });

      const result = await service.triggerSOS('comp-1', 'user-1', {
        latitude: 12.97,
        longitude: 77.59,
      });

      expect(result.status).toBe('OPEN');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SOS_TRIGGERED' }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.triggerSOS('comp-1', 'nonexistent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveBreakdowns', () => {
    it('should return empty array when DB unavailable', async () => {
      prisma.isConnected.mockReturnValue(false);

      const result = await service.getActiveBreakdowns('comp-1');
      expect(result).toEqual([]);
    });
  });

  describe('getActiveSOSAlerts', () => {
    it('should return active SOS alerts', async () => {
      prisma.sOSAlert.findMany.mockResolvedValue([{ id: 'sos-1', status: 'OPEN' }]);

      const result = await service.getActiveSOSAlerts('comp-1');

      expect(result).toHaveLength(1);
      expect(prisma.sOSAlert.findMany).toHaveBeenCalled();
    });
  });
});
