import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CommissionEngineService } from './commission-engine.service';

describe('CommissionEngineService', () => {
  let service: CommissionEngineService;
  let prisma: any;
  let audit: any;

  const mockPrisma = {
    isConnected: jest.fn().mockReturnValue(true),
    driverProfile: {
      findFirst: jest.fn(),
    },
    trip: {
      findMany: jest.fn(),
    },
    tripCost: {
      findFirst: jest.fn(),
    },
    driverPayout: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
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
        CommissionEngineService,
        { provide: 'PrismaService', useValue: prisma },
        { provide: 'AuditService', useValue: audit },
      ],
    }).compile();

    service = module.get<CommissionEngineService>(CommissionEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePayout', () => {
    it('should throw ServiceUnavailableException when DB not connected', async () => {
      prisma.isConnected.mockReturnValue(false);
      await expect(service.calculatePayout('comp1', 'dr1', { from: '2024-01-01', to: '2024-01-31' }, 'user1'))
        .rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw NotFoundException when driver not found', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue(null);
      await expect(service.calculatePayout('comp1', 'dr1', { from: '2024-01-01', to: '2024-01-31' }, 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should calculate payout with trips and commission', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'dr1', commissionRate: 0.2 });
      prisma.trip.findMany.mockResolvedValue([
        { id: 't1', distanceKm: 10, actualDuration: 30 },
        { id: 't2', distanceKm: 15, actualDuration: 45 },
      ]);
      prisma.tripCost.findFirst.mockResolvedValue({ amount: 1000 });
      prisma.driverPayout.create.mockResolvedValue({ id: 'p1', netPayout: 1600 });

      const result = await service.calculatePayout('comp1', 'dr1', { from: '2024-01-01', to: '2024-01-31' }, 'user1');

      expect(result).toEqual(expect.objectContaining({ id: 'p1' }));
      expect(prisma.driverPayout.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ commissionRate: 0.2, status: 'CALCULATED' }),
      }));
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYOUT_CALCULATED' }));
    });

    it('should use default commission rate when driver has none', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'dr1' });
      prisma.trip.findMany.mockResolvedValue([{ id: 't1' }]);
      prisma.tripCost.findFirst.mockResolvedValue({ amount: 1000 });
      prisma.driverPayout.create.mockResolvedValue({ id: 'p1', commissionRate: 0.15 });

      await service.calculatePayout('comp1', 'dr1', { from: '2024-01-01', to: '2024-01-31' }, 'user1');

      expect(prisma.driverPayout.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ commissionRate: 0.15 }),
      }));
    });
  });

  describe('previewPayout', () => {
    it('should throw NotFoundException when driver not found', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue(null);
      await expect(service.previewPayout('comp1', 'dr1', { from: '2024-01-01', to: '2024-01-31' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should return preview without creating payout', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'dr1', firstName: 'John', lastName: 'Doe', commissionRate: 0.1 });
      prisma.trip.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      prisma.tripCost.findFirst.mockResolvedValue({ amount: 500 });

      const result = await service.previewPayout('comp1', 'dr1', { from: '2024-01-01', to: '2024-01-31' });

      expect(result).toEqual(expect.objectContaining({
        driverId: 'dr1',
        driverName: 'John Doe',
        tripCount: 2,
        totalEarnings: 1000,
        commissionRate: 0.1,
        status: 'PREVIEW',
      }));
      expect(prisma.driverPayout.create).not.toHaveBeenCalled();
    });
  });

  describe('approvePayout', () => {
    it('should throw NotFoundException when payout not found', async () => {
      prisma.driverPayout.findFirst.mockResolvedValue(null);
      await expect(service.approvePayout('comp1', 'p1', 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payout not in CALCULATED status', async () => {
      prisma.driverPayout.findFirst.mockResolvedValue({ id: 'p1', status: 'APPROVED' });
      await expect(service.approvePayout('comp1', 'p1', 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should approve payout successfully', async () => {
      prisma.driverPayout.findFirst.mockResolvedValue({ id: 'p1', status: 'CALCULATED', driverId: 'dr1', netPayout: 1000 });
      prisma.driverPayout.update.mockResolvedValue({ id: 'p1', status: 'APPROVED' });

      const result = await service.approvePayout('comp1', 'p1', 'user1', { notes: 'Approved' });

      expect(result.status).toBe('APPROVED');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYOUT_APPROVED' }));
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard aggregates', async () => {
      prisma.driverPayout.aggregate
        .mockResolvedValueOnce({ _sum: { netPayout: 5000, commissionAmount: 1000, totalEarnings: 6000 }, _count: 10 })
        .mockResolvedValueOnce({ _sum: { netPayout: 3000 }, _count: 6 })
        .mockResolvedValueOnce({ _sum: { netPayout: 2000 }, _count: 4 });

      const result = await service.getDashboard('comp1', { from: '2024-01-01', to: '2024-01-31' });

      expect(result.totalEarnings).toBe(6000);
      expect(result.totalCommission).toBe(1000);
      expect(result.totalPayouts).toBe(5000);
      expect(result.totalPayoutCount).toBe(10);
      expect(result.approvedAmount).toBe(3000);
      expect(result.approvedCount).toBe(6);
      expect(result.pendingAmount).toBe(2000);
      expect(result.pendingCount).toBe(4);
    });
  });

  describe('listPayouts', () => {
    it('should return paginated payouts', async () => {
      prisma.driverPayout.findMany.mockResolvedValue([{ id: 'p1', driver: { firstName: 'John', lastName: 'Doe' } }]);
      prisma.driverPayout.count.mockResolvedValue(1);

      const result = await service.listPayouts('comp1', { page: 1, limit: 20, status: 'CALCULATED' });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});