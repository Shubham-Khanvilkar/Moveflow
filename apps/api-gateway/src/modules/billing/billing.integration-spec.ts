import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY, TEST_RATE_CARD } from '../../../test/test-utils';

describe('Billing Integration', () => {
  let service: BillingService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Rate Card CRUD', () => {
    it('should create a rate card with unique code', async () => {
      prisma.rateCard.findFirst.mockResolvedValue(null);
      prisma.rateCard.create.mockResolvedValue({
        id: 'rc-1',
        code: 'RC-NEW-001',
        name: 'New Rate',
        baseFare: 100,
        perKmRate: 12,
        effectiveFrom: new Date(),
      });

      const result = await service.createRateCard(
        TEST_COMPANY.id,
        {
          code: 'RC-NEW-001',
          name: 'New Rate',
          baseFare: 100,
          perKmRate: 12,
          effectiveFrom: new Date().toISOString(),
        },
        'admin-1',
      );

      expect(result.code).toBe('RC-NEW-001');
      expect(audit.log).toHaveBeenCalled();
    });

    it('should reject duplicate rate card code', async () => {
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'existing',
        code: 'RC-DUP',
      });

      await expect(
        service.createRateCard(
          TEST_COMPANY.id,
          {
            code: 'RC-DUP',
            name: 'Duplicate',
            baseFare: 100,
            perKmRate: 12,
            effectiveFrom: new Date().toISOString(),
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should list rate cards with filters', async () => {
      prisma.rateCard.findMany.mockResolvedValue([
        { id: 'rc-1', code: 'RC-001', isActive: true },
      ]);

      const result = await service.getRateCards(TEST_COMPANY.id, { isActive: 'true' });
      expect(result).toHaveLength(1);
    });

    it('should delete a rate card', async () => {
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'rc-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.rateCard.delete.mockResolvedValue({ id: 'rc-1' });

      const result = await service.deleteRateCard(TEST_COMPANY.id, 'rc-1', 'admin-1');
      expect(result.deleted).toBe(true);
    });
  });

  describe('Trip Cost Calculation', () => {
    it('should calculate cost with base fare + distance + waiting', async () => {
      prisma.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        companyId: TEST_COMPANY.id,
        actualDistance: 25,
        actualDuration: 45,
        vehicleType: 'SEDAN',
        serviceType: 'CAB',
      });
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'rc-1',
        baseFare: 100,
        perKmRate: 12,
        minimumKm: 4,
        minimumFare: 150,
        freeWaitingMinutes: 15,
        waitingChargePerMin: 5,
        effectiveFrom: new Date(),
        effectiveTo: null,
        priority: 1,
      });
      prisma.tripCostSnapshot.create.mockResolvedValue({
        id: 'snapshot-1',
        tripId: 'trip-1',
        baseFare: 100,
        distanceCost: 300,
        waitingCost: 150,
        totalAmount: 550,
      });
      prisma.tripCost.upsert.mockResolvedValue({});

      const result = await service.calculateTripCost('trip-1', TEST_COMPANY.id);

      expect(result.baseFare).toBe(100);
      expect(result.distanceCost).toBe(300);
      expect(result.waitingCost).toBe(150);
      expect(result.totalAmount).toBe(550);
    });

    it('should apply minimum fare when total is below threshold', async () => {
      prisma.trip.findUnique.mockResolvedValue({
        id: 'trip-2',
        companyId: TEST_COMPANY.id,
        actualDistance: 1,
        actualDuration: 5,
        vehicleType: 'SEDAN',
        serviceType: 'CAB',
      });
      prisma.rateCard.findFirst.mockResolvedValue({
        id: 'rc-1',
        baseFare: 100,
        perKmRate: 12,
        minimumKm: 4,
        minimumFare: 150,
        freeWaitingMinutes: 15,
        waitingChargePerMin: 5,
        effectiveFrom: new Date(),
        effectiveTo: null,
        priority: 1,
      });
      prisma.tripCostSnapshot.create.mockResolvedValue({
        id: 'snapshot-2',
        totalAmount: 150,
      });
      prisma.tripCost.upsert.mockResolvedValue({});

      const result = await service.calculateTripCost('trip-2', TEST_COMPANY.id);

      expect(result.totalAmount).toBe(150);
    });

    it('should throw BadRequestException when no active rate card', async () => {
      prisma.trip.findUnique.mockResolvedValue({
        id: 'trip-3',
        companyId: TEST_COMPANY.id,
        actualDistance: 10,
        vehicleType: 'BUS',
        serviceType: 'BUS',
      });
      prisma.rateCard.findFirst.mockResolvedValue(null);

      await expect(service.calculateTripCost('trip-3', TEST_COMPANY.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Cost Center Summary', () => {
    it('should aggregate trip costs and invoices per cost center', async () => {
      prisma.costCenter.findMany.mockResolvedValue([
        {
          id: 'cc-1',
          code: 'TR001',
          name: 'Transport',
          tripCosts: [
            { amount: 500 },
            { amount: 300 },
          ],
          vendorInvoices: [
            { amount: 1000, status: 'PAID' },
            { amount: 500, status: 'PENDING' },
          ],
        },
      ]);

      const result = await service.getCostCenterSummary(TEST_COMPANY.id);

      expect(result.costCenters).toHaveLength(1);
      expect(result.costCenters[0].tripCount).toBe(2);
      expect(result.costCenters[0].tripSpend).toBe(800);
      expect(result.totalSpend).toBe(800);
    });
  });

  describe('Vendor Invoice Summary', () => {
    it('should group invoices by vendor with paid/pending split', async () => {
      prisma.vendorInvoice.findMany.mockResolvedValue([
        { vendorId: 'v1', amount: 10000, status: 'PAID' },
        { vendorId: 'v1', amount: 5000, status: 'PENDING' },
        { vendorId: 'v1', amount: 5000, status: 'PAID' },
        { vendorId: 'v2', amount: 8000, status: 'PENDING' },
      ]);

      const result = await service.getVendorInvoiceSummary(TEST_COMPANY.id);

      expect(result.invoices).toHaveLength(2);
      expect(result.totalAmount).toBe(28000);
      const v1 = result.invoices.find((i: any) => i.vendorId === 'v1');
      expect(v1.invoiceCount).toBe(3);
      expect(v1.paidAmount).toBe(15000);
      expect(v1.pendingAmount).toBe(5000);
    });
  });
});
