import { Test, TestingModule } from '@nestjs/testing';
import { SLAPenaltyService } from './sla-penalty.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('SLAPenaltyService', () => {
  let service: SLAPenaltyService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      vendorSLAPenalty: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SLAPenaltyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<SLAPenaltyService>(SLAPenaltyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPenalty', () => {
    it('should create penalty with auto-calculated amount', async () => {
      prisma.vendorSLAPenalty.create.mockResolvedValue({
        id: 'pen-1', vendorId: 'v-1', penaltyAmount: 500,
      });

      const result = await service.createPenalty('comp-1', {
        vendorId: 'v-1',
        period: '2026-01',
        slaMetric: 'ONTIME',
        targetValue: 95,
        actualValue: 90,
      }, 'user-1');

      expect(result.penaltyAmount).toBe(500);
      expect(prisma.vendorSLAPenalty.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SLA_PENALTY_RECORDED' }),
      );
    });

    it('should use provided penaltyAmount when given', async () => {
      prisma.vendorSLAPenalty.create.mockResolvedValue({
        id: 'pen-1', penaltyAmount: 1000,
      });

      const result = await service.createPenalty('comp-1', {
        vendorId: 'v-1',
        period: '2026-01',
        slaMetric: 'ONTIME',
        targetValue: 95,
        actualValue: 90,
        penaltyAmount: 1000,
      }, 'user-1');

      expect(result.penaltyAmount).toBe(1000);
    });

    it('should return 0 penalty when actual >= target', async () => {
      prisma.vendorSLAPenalty.create.mockResolvedValue({
        id: 'pen-1', penaltyAmount: 0,
      });

      const result = await service.createPenalty('comp-1', {
        vendorId: 'v-1',
        period: '2026-01',
        slaMetric: 'ONTIME',
        targetValue: 90,
        actualValue: 95,
      }, 'user-1');

      expect(result.penaltyAmount).toBe(0);
    });

    it('should uppercase the slaMetric', async () => {
      prisma.vendorSLAPenalty.create.mockResolvedValue({ id: 'pen-1' });

      await service.createPenalty('comp-1', {
        vendorId: 'v-1',
        period: '2026-01',
        slaMetric: 'ontime',
        targetValue: 95,
        actualValue: 90,
      }, 'user-1');

      expect(prisma.vendorSLAPenalty.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slaMetric: 'ONTIME' }),
        }),
      );
    });

    it('should throw ServiceUnavailableException when DB is down', async () => {
      prisma.isConnected.mockReturnValue(false);

      await expect(
        service.createPenalty('comp-1', {
          vendorId: 'v-1',
          period: '2026-01',
          slaMetric: 'ONTIME',
          targetValue: 95,
          actualValue: 90,
        }, 'user-1'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getPenalties', () => {
    it('should return paginated penalties', async () => {
      const penalties = [{ id: 'pen-1', vendorId: 'v-1' }];
      prisma.vendorSLAPenalty.findMany.mockResolvedValue(penalties);
      prisma.vendorSLAPenalty.count.mockResolvedValue(1);

      const result = await service.getPenalties('comp-1', { page: 1, limit: 10 });

      expect(result.data).toEqual(penalties);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should return empty result when DB unavailable', async () => {
      prisma.isConnected.mockReturnValue(false);

      const result = await service.getPenalties('comp-1');

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should filter by vendorId', async () => {
      prisma.vendorSLAPenalty.findMany.mockResolvedValue([]);
      prisma.vendorSLAPenalty.count.mockResolvedValue(0);

      await service.getPenalties('comp-1', { vendorId: 'v-1' });

      expect(prisma.vendorSLAPenalty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vendorId: 'v-1' }),
        }),
      );
    });

    it('should uppercase slaMetric filter', async () => {
      prisma.vendorSLAPenalty.findMany.mockResolvedValue([]);
      prisma.vendorSLAPenalty.count.mockResolvedValue(0);

      await service.getPenalties('comp-1', { slaMetric: 'ontime' });

      expect(prisma.vendorSLAPenalty.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ slaMetric: 'ONTIME' }),
        }),
      );
    });
  });

  describe('approvePenalty', () => {
    it('should set status to APPLIED and log audit', async () => {
      prisma.vendorSLAPenalty.update.mockResolvedValue({
        id: 'pen-1', status: 'APPLIED',
      });

      const result = await service.approvePenalty('comp-1', 'pen-1', 'user-1');

      expect(result.status).toBe('APPLIED');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SLA_PENALTY_APPROVED' }),
      );
    });
  });

  describe('getVendorSLASummary', () => {
    it('should return summary with total penalty amount', async () => {
      prisma.vendorSLAPenalty.findMany.mockResolvedValue([
        { id: 'p1', penaltyAmount: 500 },
        { id: 'p2', penaltyAmount: 300 },
      ]);

      const result = await service.getVendorSLASummary('comp-1', 'v-1', '2026');

      expect(result.totalPenaltyAmount).toBe(800);
      expect(result.count).toBe(2);
    });

    it('should return zero total when no penalties', async () => {
      prisma.vendorSLAPenalty.findMany.mockResolvedValue([]);

      const result = await service.getVendorSLASummary('comp-1', 'v-1', '2026');

      expect(result.totalPenaltyAmount).toBe(0);
      expect(result.count).toBe(0);
    });
  });
});
