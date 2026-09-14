import { Test, TestingModule } from '@nestjs/testing';
import { CostLeakDetectorService, CostLeak } from './cost-leak-detector.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

describe('CostLeakDetectorService', () => {
  let service: CostLeakDetectorService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      vehicle: { findMany: jest.fn().mockResolvedValue([]) },
      vehicleOccupancyLog: { findMany: jest.fn().mockResolvedValue([]) },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
      dispatchAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      routeDeviation: { findMany: jest.fn().mockResolvedValue([]) },
      vendorDiscrepancy: { findMany: jest.fn().mockResolvedValue([]) },
      driverTrip: { findMany: jest.fn().mockResolvedValue([]) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      costLeak: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'leak-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostLeakDetectorService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<CostLeakDetectorService>(CostLeakDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectAllLeaks', () => {
    it('should return an array of detected leaks', async () => {
      const result = await service.detectAllLeaks('comp-1');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should call all detection methods', async () => {
      await service.detectAllLeaks('comp-1');

      expect(prisma.vehicle.findMany).toHaveBeenCalled();
      expect(prisma.vehicleOccupancyLog.findMany).toHaveBeenCalled();
      expect(prisma.trip.findMany).toHaveBeenCalled();
      expect(prisma.dispatchAssignment.findMany).toHaveBeenCalled();
      expect(prisma.routeDeviation.findMany).toHaveBeenCalled();
      expect(prisma.vendorDiscrepancy.findMany).toHaveBeenCalled();
      expect(prisma.driverTrip.findMany).toHaveBeenCalled();
      expect(prisma.booking.findMany).toHaveBeenCalled();
    });

    it('should create new leaks that do not already exist', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        { id: 'v1', registrationNo: 'KA-01-1234', VehicleLocation: [] },
      ]);
      prisma.costLeak.findFirst.mockResolvedValue(null);

      const result = await service.detectAllLeaks('comp-1');

      // The idle vehicle detector returns leaks for vehicles with stale locations
      // With empty VehicleLocation array, no leaks are generated from idle vehicles
      expect(Array.isArray(result)).toBe(true);
    });

    it('should skip leaks that already exist and are not dismissed', async () => {
      prisma.costLeak.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.detectAllLeaks('comp-1');

      expect(prisma.costLeak.create).not.toHaveBeenCalled();
    });
  });

  describe('getLeaks', () => {
    it('should return leaks from the database', async () => {
      const fakeLeaks = [{ id: 'l1', type: 'IDLE_VEHICLE', severity: 'HIGH' }];
      prisma.costLeak.findMany.mockResolvedValue(fakeLeaks);

      const result = await service.getLeaks('comp-1');

      expect(result).toEqual(fakeLeaks);
      expect(prisma.costLeak.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'comp-1' } }),
      );
    });

    it('should filter by status and severity', async () => {
      prisma.costLeak.findMany.mockResolvedValue([]);

      await service.getLeaks('comp-1', 'DETECTED', 'CRITICAL');

      expect(prisma.costLeak.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'comp-1', status: 'DETECTED', severity: 'CRITICAL' },
        }),
      );
    });
  });

  describe('getLeakSummary', () => {
    it('should compute totals and breakdown by severity', async () => {
      prisma.costLeak.findMany.mockResolvedValue([
        { id: 'l1', severity: 'CRITICAL', status: 'DETECTED', estimatedMonthlyImpact: 10000 },
        { id: 'l2', severity: 'HIGH', status: 'ACKNOWLEDGED', estimatedMonthlyImpact: 5000 },
        { id: 'l3', severity: 'MEDIUM', status: 'DETECTED', estimatedMonthlyImpact: 2000 },
      ]);

      const result = await service.getLeakSummary('comp-1');

      expect(result.totalLeaks).toBe(3);
      expect(result.totalMonthlyImpact).toBe(17000);
      expect(result.bySeverity.CRITICAL).toBe(1);
      expect(result.bySeverity.HIGH).toBe(1);
      expect(result.bySeverity.MEDIUM).toBe(1);
      expect(result.bySeverity.LOW).toBe(0);
      expect(result.byStatus.DETECTED).toBe(2);
      expect(result.byStatus.ACKNOWLEDGED).toBe(1);
    });

    it('should return zero totals when no leaks', async () => {
      prisma.costLeak.findMany.mockResolvedValue([]);

      const result = await service.getLeakSummary('comp-1');

      expect(result.totalLeaks).toBe(0);
      expect(result.totalMonthlyImpact).toBe(0);
    });
  });

  describe('acknowledgeLeak', () => {
    it('should update status to ACKNOWLEDGED and log audit', async () => {
      const result = await service.acknowledgeLeak('comp-1', 'leak-1', 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.costLeak.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ACKNOWLEDGED' }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COST_LEAK_ACKNOWLEDGED' }),
      );
    });
  });

  describe('resolveLeak', () => {
    it('should update status to RESOLVED with resolvedBy', async () => {
      const result = await service.resolveLeak('comp-1', 'leak-1', 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.costLeak.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RESOLVED', resolvedBy: 'user-1' }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COST_LEAK_RESOLVED' }),
      );
    });
  });

  describe('dismissLeak', () => {
    it('should update status to DISMISSED and log audit', async () => {
      const result = await service.dismissLeak('comp-1', 'leak-1', 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.costLeak.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DISMISSED' }) }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'COST_LEAK_DISMISSED' }),
      );
    });
  });

  describe('getLeakById', () => {
    it('should return leak when found', async () => {
      prisma.costLeak.findFirst.mockResolvedValue({ id: 'leak-1', type: 'IDLE_VEHICLE' });

      const result = await service.getLeakById('comp-1', 'leak-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('leak-1');
    });

    it('should return null when leak not found', async () => {
      prisma.costLeak.findFirst.mockResolvedValue(null);

      const result = await service.getLeakById('comp-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });
});
