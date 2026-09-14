import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      isConnected: jest.fn().mockReturnValue(true),
       trip: { findUnique: jest.fn(), findFirst: jest.fn() },
      rateCard: { findFirst: jest.fn() },
      tripCostSnapshot: { create: jest.fn(), findFirst: jest.fn() },
      tripCost: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      costCenter: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
      vendorInvoice: { findMany: jest.fn() },
    };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateTripCost', () => {
    const tripId = 'trip-1';
    const companyId = 'company-1';

    it('should calculate trip cost successfully', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1', distanceKm: 16.5, actualDuration: 30, plannedDuration: 25,
      });
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'rc-1', perKmRate: 12, baseFare: 150, minimumKm: 3, minimumFare: 100,
        waitingChargePerMin: 2, freeWaitingMinutes: 10, nightChargeType: 'FLAT',
        nightChargeValue: 0, acType: 'AC', costCenterId: 'cc-1', priority: 1,
      });
      prisma.tripCostSnapshot.create.mockResolvedValue({
        id: 'snapshot-1', tripId, totalAmount: 348,
      });
      prisma.tripCost.findFirst.mockResolvedValue(null);
      prisma.tripCost.create.mockResolvedValue({});

      const result: any = await service.calculateTripCost(tripId, companyId);

      expect(result.id).toBe('snapshot-1');
      expect(result.totalAmount).toBe(348);
      expect(prisma.tripCostSnapshot.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TRIP_COST_CALCULATED' }),
      );
    });

    it('should throw NotFoundException for non-existent trip', async () => {
      prisma.trip.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateTripCost('nonexistent', companyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no active rate card', async () => {
      prisma.trip.findFirst.mockResolvedValue({ id: 'trip-1', distanceKm: 10 });
      prisma.rateCard.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateTripCost(tripId, companyId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply minimum fare when total is below threshold', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1', distanceKm: 1, actualDuration: 5,
      });
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'rc-1', perKmRate: 12, baseFare: 150, minimumKm: 3, minimumFare: 500,
        waitingChargePerMin: 2, freeWaitingMinutes: 10, nightChargeType: 'FLAT',
        nightChargeValue: 0, acType: 'AC', costCenterId: 'cc-1',
      });
      prisma.tripCostSnapshot.create.mockResolvedValue({
        id: 'snapshot-1', totalAmount: 500,
      });
      prisma.tripCost.findFirst.mockResolvedValue(null);
      prisma.tripCost.create.mockResolvedValue({});

      const result: any = await service.calculateTripCost(tripId, companyId);
      expect(result.totalAmount).toBe(500);
    });

    it('should update existing trip cost record', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1', distanceKm: 16.5, actualDuration: 30,
      });
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'rc-1', perKmRate: 12, baseFare: 150, minimumKm: 3, minimumFare: 100,
        waitingChargePerMin: 2, freeWaitingMinutes: 10, nightChargeType: 'FLAT',
        nightChargeValue: 0, acType: 'AC', costCenterId: 'cc-1',
      });
      prisma.tripCostSnapshot.create.mockResolvedValue({
        id: 'snapshot-1', totalAmount: 348,
      });
      prisma.tripCost.findFirst.mockResolvedValue({ id: 'existing-cost' });
      prisma.tripCost.update.mockResolvedValue({});

      await service.calculateTripCost(tripId, companyId);

      expect(prisma.tripCost.update).toHaveBeenCalled();
      expect(prisma.tripCost.create).not.toHaveBeenCalled();
    });

    it('should calculate waiting cost beyond free minutes', async () => {
      prisma.trip.findFirst.mockResolvedValue({
        id: 'trip-1', distanceKm: 10, actualDuration: 30,
      });
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'rc-1', perKmRate: 10, baseFare: 100, minimumKm: 3, minimumFare: 100,
        waitingChargePerMin: 5, freeWaitingMinutes: 10, nightChargeType: 'FLAT',
        nightChargeValue: 0, acType: 'AC', costCenterId: 'cc-1',
      });
      prisma.tripCostSnapshot.create.mockResolvedValue({
        id: 'snapshot-1', totalAmount: 300,
      });
      prisma.tripCost.findFirst.mockResolvedValue(null);
      prisma.tripCost.create.mockResolvedValue({});

      const result: any = await service.calculateTripCost(tripId, companyId);

      expect(result.totalAmount).toBe(300);
    });
  });

  describe('getTripCostSnapshot', () => {
    it('should return trip cost snapshot', async () => {
      prisma.tripCostSnapshot.findFirst.mockResolvedValue({
        id: 'snapshot-1', tripId: 'trip-1', totalAmount: 348,
      });

      const result: any = await service.getTripCostSnapshot('trip-1');

      expect(result.id).toBe('snapshot-1');
      expect(result.totalAmount).toBe(348);
    });

    it('should return null when no snapshot exists', async () => {
      prisma.tripCostSnapshot.findFirst.mockResolvedValue(null);

      const result = await service.getTripCostSnapshot('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('listCostCenters', () => {
    const companyId = 'company-1';

    it('should return paginated cost centers', async () => {
      prisma.costCenter.findMany.mockResolvedValue([
        { id: 'cc-1', code: 'ENG', name: 'Engineering' },
        { id: 'cc-2', code: 'HR', name: 'Human Resources' },
      ]);
      prisma.costCenter.count.mockResolvedValue(2);

      const result = await service.listCostCenters(companyId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should apply search filter', async () => {
      prisma.costCenter.findMany.mockResolvedValue([]);
      prisma.costCenter.count.mockResolvedValue(0);

      await service.listCostCenters(companyId, { search: 'eng' });

      const findManyCall = prisma.costCenter.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
    });

    it('should return empty list when no cost centers', async () => {
      prisma.costCenter.findMany.mockResolvedValue([]);
      prisma.costCenter.count.mockResolvedValue(0);

      const result = await service.listCostCenters(companyId);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('createCostCenter', () => {
    const companyId = 'company-1';
    const createdBy = 'admin-1';

    it('should create a cost center successfully', async () => {
      prisma.costCenter.create.mockResolvedValue({
        id: 'cc-new', companyId, code: 'MKT', name: 'Marketing',
      });

      const result = await service.createCostCenter(
        companyId, { code: 'MKT', name: 'Marketing' }, createdBy,
      );

      expect(result.code).toBe('MKT');
      expect(result.name).toBe('Marketing');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COST_CENTER_CREATED' }),
      );
    });

    it('should throw ServiceUnavailableException when DB is disconnected', async () => {
      prisma.isConnected.mockReturnValue(false);

      await expect(service.createCostCenter(
        companyId, { code: 'MKT', name: 'Marketing' }, createdBy,
      )).rejects.toThrow('Database unavailable');
    });
  });

  describe('getCostCenterSummary', () => {
    const companyId = 'company-1';

    it('should return cost center summary with spend data', async () => {
      prisma.costCenter.findMany.mockResolvedValue([
        {
          id: 'cc-1', code: 'ENG', name: 'Engineering',
          tripCosts: [{ amount: 5000 }, { amount: 3000 }],
          vendorInvoices: [
            { amount: 1000, status: 'PAID' },
            { amount: 2000, status: 'PENDING' },
          ],
        },
      ]);

      const result = await service.getCostCenterSummary(companyId);

      expect(result.costCenters).toHaveLength(1);
      expect(result.costCenters[0].tripSpend).toBe(8000);
      expect(result.costCenters[0].invoicePaid).toBe(1000);
      expect(result.costCenters[0].invoiceTotal).toBe(3000);
      expect(result.totalSpend).toBe(8000);
    });

    it('should return empty summary when no cost centers', async () => {
      prisma.costCenter.findMany.mockResolvedValue([]);

      const result = await service.getCostCenterSummary(companyId);

      expect(result.costCenters).toHaveLength(0);
      expect(result.totalSpend).toBe(0);
    });
  });

  describe('getVendorInvoiceSummary', () => {
    const companyId = 'company-1';

    it('should return vendor invoice summary', async () => {
      prisma.vendorInvoice.findMany.mockResolvedValue([
        { vendorId: 'vendor-1', amount: 5000, status: 'PAID' },
        { vendorId: 'vendor-1', amount: 3000, status: 'PENDING' },
        { vendorId: 'vendor-2', amount: 2000, status: 'PAID' },
      ]);

      const result = await service.getVendorInvoiceSummary(companyId);

      expect(result.invoices).toHaveLength(2);
      expect(result.totalAmount).toBe(10000);
    });

    it('should filter by vendor ID', async () => {
      prisma.vendorInvoice.findMany.mockResolvedValue([
        { vendorId: 'vendor-1', amount: 5000, status: 'PAID' },
      ]);

      await service.getVendorInvoiceSummary(companyId, { vendorId: 'vendor-1' });

      const findManyCall = prisma.vendorInvoice.findMany.mock.calls[0][0];
      expect(findManyCall.where.vendorId).toBe('vendor-1');
    });

    it('should filter by date range', async () => {
      prisma.vendorInvoice.findMany.mockResolvedValue([]);

      await service.getVendorInvoiceSummary(companyId, {
        from: '2026-01-01', to: '2026-12-31',
      });

      const findManyCall = prisma.vendorInvoice.findMany.mock.calls[0][0];
      expect(findManyCall.where.createdAt.gte).toBeDefined();
      expect(findManyCall.where.createdAt.lte).toBeDefined();
    });

    it('should return empty when no invoices', async () => {
      prisma.vendorInvoice.findMany.mockResolvedValue([]);

      const result = await service.getVendorInvoiceSummary(companyId);

      expect(result.invoices).toHaveLength(0);
      expect(result.totalAmount).toBe(0);
    });
  });
});
