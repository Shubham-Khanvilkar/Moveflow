import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InventoryCycleService } from './inventory-cycle.service';

describe('InventoryCycleService', () => {
  let service: InventoryCycleService;
  let prisma: any;
  let audit: any;

  const mockPrisma = {
    isConnected: jest.fn().mockReturnValue(true),
    inventoryCycleCount: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    inventoryCycleCountItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
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
        InventoryCycleService,
        { provide: 'PrismaService', useValue: prisma },
        { provide: 'AuditService', useValue: audit },
      ],
    }).compile();

    service = module.get<InventoryCycleService>(InventoryCycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startCycleCount', () => {
    it('should throw ServiceUnavailableException when DB not connected', async () => {
      prisma.isConnected.mockReturnValue(false);
      await expect(service.startCycleCount('comp1', { warehouseId: 'wh1', items: [] }, 'user1'))
        .rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw BadRequestException when no items provided', async () => {
      await expect(service.startCycleCount('comp1', { warehouseId: 'wh1', items: [] }, 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should create cycle count with items', async () => {
      prisma.inventoryCycleCount.create.mockResolvedValue({
        id: 'cc1',
        status: 'IN_PROGRESS',
        items: [{ itemId: 'item1', expectedQuantity: 10 }],
      });

      const result = await service.startCycleCount('comp1', {
        warehouseId: 'wh1',
        items: [{ itemId: 'item1', expectedQuantity: 10 }],
      }, 'user1');

      expect(result.id).toBe('cc1');
      expect(result.totalItems).toBe(1);
      expect(prisma.inventoryCycleCount.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ warehouseId: 'wh1', totalItems: 1 }),
      }));
    });
  });

  describe('updateCycleCount', () => {
    it('should throw NotFoundException when cycle count not found', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue(null);
      await expect(service.updateCycleCount('comp1', 'cc1', 'item1', { countedQuantity: 5 }, 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cycle count not in progress', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue({ id: 'cc1', status: 'COMPLETED' });
      await expect(service.updateCycleCount('comp1', 'cc1', 'item1', { countedQuantity: 5 }, 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when item not in cycle count', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue({ id: 'cc1', status: 'IN_PROGRESS' });
      prisma.inventoryCycleCountItem.findFirst.mockResolvedValue(null);
      await expect(service.updateCycleCount('comp1', 'cc1', 'item1', { countedQuantity: 5 }, 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should update item with MATCHED status when variance is 0', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue({ id: 'cc1', status: 'IN_PROGRESS' });
      prisma.inventoryCycleCountItem.findFirst.mockResolvedValue({ id: 'cci1', expectedQuantity: 10 });
      prisma.inventoryCycleCountItem.update.mockResolvedValue({ id: 'cci1', status: 'MATCHED', variance: 0 });

      const result = await service.updateCycleCount('comp1', 'cc1', 'item1', { countedQuantity: 10 }, 'user1');

      expect(result.status).toBe('MATCHED');
      expect(result.variance).toBe(0);
    });

    it('should update item with DISCREPANCY status when variance exists', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue({ id: 'cc1', status: 'IN_PROGRESS' });
      prisma.inventoryCycleCountItem.findFirst.mockResolvedValue({ id: 'cci1', expectedQuantity: 10 });
      prisma.inventoryCycleCountItem.update.mockResolvedValue({ id: 'cci1', status: 'DISCREPANCY', variance: 5 });

      const result = await service.updateCycleCount('comp1', 'cc1', 'item1', { countedQuantity: 15 }, 'user1');

      expect(result.status).toBe('DISCREPANCY');
      expect(result.variance).toBe(5);
    });
  });

  describe('completeCycleCount', () => {
    it('should throw NotFoundException when cycle count not found', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue(null);
      await expect(service.completeCycleCount('comp1', 'cc1', 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when items still pending', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue({
        id: 'cc1', status: 'IN_PROGRESS',
        items: [{ status: 'PENDING' }, { status: 'MATCHED' }],
      });
      await expect(service.completeCycleCount('comp1', 'cc1', 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should complete cycle count and count discrepancies', async () => {
      prisma.inventoryCycleCount.findFirst.mockResolvedValue({
        id: 'cc1', status: 'IN_PROGRESS',
        items: [{ status: 'MATCHED' }, { status: 'DISCREPANCY' }, { status: 'DISCREPANCY' }],
      });
      prisma.inventoryCycleCount.update.mockResolvedValue({ id: 'cc1', status: 'COMPLETED', discrepancyCount: 2 });

      const result = await service.completeCycleCount('comp1', 'cc1', 'user1');

      expect(result.status).toBe('COMPLETED');
      expect(result.discrepancyCount).toBe(2);
    });
  });

  describe('getOverdueCounts', () => {
    it('should return overdue cycle counts', async () => {
      prisma.inventoryCycleCount.findMany.mockResolvedValue([{ id: 'cc1' }]);
      prisma.inventoryCycleCount.count.mockResolvedValue(1);

      const result = await service.getOverdueCounts('comp1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getReconciliationSummary', () => {
    it('should calculate accuracy rate correctly', async () => {
      prisma.inventoryCycleCount.findMany.mockResolvedValue([
        {
          items: [
            { status: 'MATCHED', variance: 0 },
            { status: 'MATCHED', variance: 0 },
            { status: 'DISCREPANCY', variance: 5 },
            { status: 'DISCREPANCY', variance: -3 },
          ],
        },
      ]);

      const result = await service.getReconciliationSummary('comp1', {});

      expect(result.totalCycleCounts).toBe(1);
      expect(result.totalItems).toBe(4);
      expect(result.matchedItems).toBe(2);
      expect(result.discrepancyItems).toBe(2);
      expect(result.totalVariance).toBe(8);
      expect(result.accuracyRate).toBe(50);
    });

    it('should return 0 accuracy when no items', async () => {
      prisma.inventoryCycleCount.findMany.mockResolvedValue([]);
      const result = await service.getReconciliationSummary('comp1', {});
      expect(result.accuracyRate).toBe(0);
    });
  });
});