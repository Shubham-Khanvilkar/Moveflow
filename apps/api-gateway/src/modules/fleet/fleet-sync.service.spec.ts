import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { FleetSyncService } from './fleet-sync.service';

describe('FleetSyncService', () => {
  let service: FleetSyncService;
  let prisma: any;
  let audit: any;

  const mockPrisma = {
    isConnected: jest.fn().mockReturnValue(true),
    vehicle: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    fleetSyncLog: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = mockPrisma;
    audit = mockAudit;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetSyncService,
        { provide: 'PrismaService', useValue: prisma },
        { provide: 'AuditService', useValue: audit },
      ],
    }).compile();

    service = module.get<FleetSyncService>(FleetSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncFromSource', () => {
    it('should throw ServiceUnavailableException when DB not connected', async () => {
      prisma.isConnected.mockReturnValue(false);
      await expect(service.syncFromSource('comp1', 'CSV', [], 'user1'))
        .rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw BadRequestException for invalid source', async () => {
      await expect(service.syncFromSource('comp1', 'INVALID', [], 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should create sync log and process items', async () => {
      prisma.fleetSyncLog.create.mockResolvedValue({ id: 'sync1', status: 'RUNNING' });
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({ id: 'v1' });
      prisma.fleetSyncLog.update.mockResolvedValue({});
      prisma.fleetSyncLog.update.mockResolvedValue({});

      const result = await service.syncFromSource('comp1', 'CSV', [
        { registrationNo: 'MH01AB1234', vehicleType: 'SEDAN' },
      ], 'user1');

      expect(result).toEqual(expect.objectContaining({ syncId: 'sync1', created: 1, updated: 0 }));
      expect(prisma.fleetSyncLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ source: 'CSV', totalRecords: 1 }),
      }));
    });

    it('should update existing vehicle', async () => {
      prisma.fleetSyncLog.create.mockResolvedValue({ id: 'sync1' });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', registrationNo: 'MH01AB1234' });
      prisma.vehicle.update.mockResolvedValue({});
      prisma.fleetSyncLog.update.mockResolvedValue({});

      const result = await service.syncFromSource('comp1', 'API', [
        { registrationNo: 'MH01AB1234', vehicleType: 'SUV' },
      ], 'user1');

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it('should handle failed items', async () => {
      prisma.fleetSyncLog.create.mockResolvedValue({ id: 'sync1' });
      prisma.vehicle.findFirst.mockRejectedValue(new Error('DB error'));
      prisma.fleetSyncLog.update.mockResolvedValue({});

      const result = await service.syncFromSource('comp1', 'CSV', [
        { registrationNo: 'MH01AB1234' },
      ], 'user1');

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getSyncStatus', () => {
    it('should throw ServiceUnavailableException when DB not connected', async () => {
      prisma.isConnected.mockReturnValue(false);
      await expect(service.getSyncStatus('comp1', 'sync1'))
        .rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw NotFoundException when sync log not found', async () => {
      prisma.fleetSyncLog.findFirst.mockResolvedValue(null);
      await expect(service.getSyncStatus('comp1', 'sync1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should return sync log', async () => {
      prisma.fleetSyncLog.findFirst.mockResolvedValue({ id: 'sync1', status: 'COMPLETED' });
      const result = await service.getSyncStatus('comp1', 'sync1');
      expect(result.id).toBe('sync1');
    });
  });

  describe('runFullSync', () => {
    it('should run full sync and validate vehicles', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        { id: 'v1', registrationNo: 'MH01AB1234', vehicleType: 'SEDAN', status: 'AVAILABLE' },
        { id: 'v2', registrationNo: '', vehicleType: '', status: 'INACTIVE' },
      ]);
      prisma.fleetSyncLog.create.mockResolvedValue({ id: 'sync1' });
      prisma.fleetSyncLog.update.mockResolvedValue({});

      const result = await service.runFullSync('comp1', 'user1');

      expect(result.status).toBe('COMPLETED');
      expect(result.vehicleCount).toBe(2);
      expect(result.issueCount).toBe(2);
      expect(result.issues).toContainEqual({ vehicleId: 'v2', issue: 'MISSING_REGISTRATION' });
      expect(result.issues).toContainEqual({ vehicleId: 'v2', issue: 'MISSING_VEHICLE_TYPE' });
    });
  });

  describe('getSyncHistory', () => {
    it('should return paginated sync history', async () => {
      prisma.fleetSyncLog.findMany.mockResolvedValue([{ id: 'sync1' }]);
      prisma.fleetSyncLog.count.mockResolvedValue(1);

      const result = await service.getSyncHistory('comp1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});