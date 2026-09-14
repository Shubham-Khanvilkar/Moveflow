import { Test, TestingModule } from '@nestjs/testing';
import { ReportEngine } from './report-engine.service';
import { PrismaService } from '../../common/prisma.service';

describe('ReportEngine', () => {
  let service: ReportEngine;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      booking: { groupBy: jest.fn().mockResolvedValue([]) },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
      driverProfile: { findMany: jest.fn().mockResolvedValue([]) },
      transportInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      vehicle: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportEngine,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportEngine>(ReportEngine);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listReports', () => {
    it('should return all built-in reports', () => {
      const reports = service.listReports();

      expect(reports.length).toBeGreaterThanOrEqual(5);
      expect(reports.map(r => r.id)).toContain('booking_summary');
      expect(reports.map(r => r.id)).toContain('trip_analytics');
      expect(reports.map(r => r.id)).toContain('driver_performance');
      expect(reports.map(r => r.id)).toContain('billing_reconciliation');
      expect(reports.map(r => r.id)).toContain('vehicle_utilization');
    });

    it('should return reports with correct structure', () => {
      const reports = service.listReports();

      for (const report of reports) {
        expect(report).toHaveProperty('id');
        expect(report).toHaveProperty('name');
        expect(report).toHaveProperty('description');
        expect(report).toHaveProperty('category');
        expect(report).toHaveProperty('columns');
        expect(report).toHaveProperty('parameters');
        expect(report.columns.length).toBeGreaterThan(0);
      }
    });

    it('should have required date parameters on all reports', () => {
      const reports = service.listReports();

      for (const report of reports) {
        const fromParam = report.parameters.find(p => p.key === 'from');
        const toParam = report.parameters.find(p => p.key === 'to');
        expect(fromParam).toBeDefined();
        expect(toParam).toBeDefined();
        expect(fromParam?.required).toBe(true);
        expect(toParam?.required).toBe(true);
      }
    });
  });

  describe('generateReport - booking_summary', () => {
    it('should generate booking summary report', async () => {
      prisma.booking.groupBy.mockResolvedValue([
        { createdAt: new Date('2026-01-01'), _count: { id: 5 } },
        { createdAt: new Date('2026-01-02'), _count: { id: 3 } },
      ]);

      const result = await service.generateReport('booking_summary', 'comp-1', {
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('total', 5);
      expect(prisma.booking.groupBy).toHaveBeenCalled();
    });

    it('should return empty array when no bookings', async () => {
      prisma.booking.groupBy.mockResolvedValue([]);

      const result = await service.generateReport('booking_summary', 'comp-1', {
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result).toEqual([]);
    });
  });

  describe('generateReport - trip_analytics', () => {
    it('should generate trip analytics report', async () => {
      prisma.trip.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-01'), distanceKm: 25, plannedDuration: 45, passengerCount: 4 },
        { createdAt: new Date('2026-01-01'), distanceKm: 10, plannedDuration: 20, passengerCount: 2 },
      ]);

      const result = await service.generateReport('trip_analytics', 'comp-1', {
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result).toHaveLength(2);
      expect(result[0].totalDistance).toBe(25);
      expect(result[0].avgPassengers).toBe(4);
      expect(prisma.trip.findMany).toHaveBeenCalled();
    });
  });

  describe('generateReport - driver_performance', () => {
    it('should generate driver performance report', async () => {
      prisma.driverProfile.findMany.mockResolvedValue([
        { User: { name: 'John Doe' }, totalTrips: 10 },
        { User: null, totalTrips: 5 },
      ]);

      const result = await service.generateReport('driver_performance', 'comp-1', {
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result).toHaveLength(2);
      expect(result[0].driverName).toBe('John Doe');
      expect(result[1].driverName).toBe('Unknown');
    });
  });

  describe('generateReport - billing_reconciliation', () => {
    it('should generate billing reconciliation report', async () => {
      prisma.transportInvoice.findMany.mockResolvedValue([
        { createdAt: new Date('2026-01-15'), totalAmount: 50000, paidAmount: 40000 },
      ]);

      const result = await service.generateReport('billing_reconciliation', 'comp-1', {
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].totalInvoiced).toBe(50000);
      expect(result[0].totalPaid).toBe(40000);
      expect(result[0].outstanding).toBe(10000);
    });
  });

  describe('generateReport - vehicle_utilization', () => {
    it('should generate vehicle utilization report', async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        { id: 'v-1', registrationNo: 'KA-01-1234' },
        { id: 'v-2', registrationNo: null },
      ]);

      const result = await service.generateReport('vehicle_utilization', 'comp-1', {
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(result).toHaveLength(2);
      expect(result[0].vehicleId).toBe('KA-01-1234');
      expect(result[1].vehicleId).toBe('v-2');
    });
  });

  describe('generateReport - invalid report', () => {
    it('should throw error for unknown report id', async () => {
      await expect(
        service.generateReport('nonexistent_report', 'comp-1', { from: new Date(), to: new Date() }),
      ).rejects.toThrow('Report not found');
    });
  });
});
