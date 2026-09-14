import { Test, TestingModule } from '@nestjs/testing';
import { EnterpriseDashboardService } from './enterprise-dashboard.service';
import { PrismaService } from '../../common/prisma.service';

describe('EnterpriseDashboardService', () => {
  let service: EnterpriseDashboardService;
  let prisma: any;

  const mockCompanyId = 'company-1';

  beforeEach(async () => {
    prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      company: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', name: 'Company 1', companyCode: 'C1', status: 'ACTIVE' },
        ]),
      },
      user: { count: jest.fn().mockResolvedValue(100) },
      driverProfile: { count: jest.fn().mockResolvedValue(20) },
      vehicle: { count: jest.fn().mockResolvedValue(15) },
      trip: {
        count: jest.fn().mockResolvedValue(50),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      booking: {
        count: jest.fn().mockResolvedValue(30),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      incident: {
        count: jest.fn().mockResolvedValue(3),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      noShowRecord: { count: jest.fn().mockResolvedValue(2) },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(10),
      },
      vendor: { count: jest.fn().mockResolvedValue(5) },
      transportAccessRole: { count: jest.fn().mockResolvedValue(8) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnterpriseDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EnterpriseDashboardService>(EnterpriseDashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('platformCommandCenter', () => {
    it('should return platform overview with all KPIs', async () => {
      const result = await service.platformCommandCenter();

      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('operations');
      expect(result.platform).toHaveProperty('totalCompanies');
      expect(result.platform).toHaveProperty('activeCompanies');
      expect(result.platform).toHaveProperty('totalEmployees');
      expect(result.platform).toHaveProperty('activeDrivers');
      expect(result.platform).toHaveProperty('activeVehicles');
    });

    it('should query all counters in parallel', async () => {
      await service.platformCommandCenter();

      expect(prisma.company.count).toHaveBeenCalled();
      expect(prisma.user.count).toHaveBeenCalled();
      expect(prisma.driverProfile.count).toHaveBeenCalled();
      expect(prisma.vehicle.count).toHaveBeenCalled();
    });
  });

  describe('recentActivity', () => {
    it('should return recent audit log entries', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { id: '1', action: 'TRIP_COMPLETED', entity: 'Trip', entityId: 't-1', userId: 'u-1', createdAt: new Date() },
        { id: '2', action: 'BOOKING_CREATED', entity: 'Booking', entityId: 'b-1', userId: 'u-2', createdAt: new Date() },
      ]);

      const result = await service.recentActivity(mockCompanyId, 5);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('color');
      expect(result[0]).toHaveProperty('time');
    });

    it('should return empty array on error', async () => {
      prisma.auditLog.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.recentActivity(mockCompanyId);

      expect(result).toEqual([]);
    });

    it('should limit results', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.recentActivity(mockCompanyId, 3);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });

  describe('safetyDashboard', () => {
    it('should return incident counts by type and severity', async () => {
      prisma.incident.groupBy
        .mockResolvedValueOnce([
          { type: 'SOS', severity: 'CRITICAL', _count: { id: 2 } },
          { type: 'BREAKDOWN', severity: 'HIGH', _count: { id: 5 } },
        ])
        .mockResolvedValueOnce([]);

      prisma.incident.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1);

      const result = await service.safetyDashboard(mockCompanyId, 30);

      expect(result).toHaveProperty('totalIncidents');
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('bySeverity');
      expect(result).toHaveProperty('sosEvents');
      expect(result).toHaveProperty('breakdowns');
    });
  });

  describe('companyHealthMatrix', () => {
    it('should return health data per company', async () => {
      prisma.company.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Company 1',
          companyCode: 'C1',
          status: 'ACTIVE',
          users: [{ id: 'u1' }, { id: 'u2' }],
          driverProfiles: [{ id: 'd1' }],
          vehicles: [{ id: 'v1' }],
          vendors: [{ id: 'vd1' }],
        },
      ]);
      prisma.trip.count.mockResolvedValue(10);

      const result = await service.companyHealthMatrix();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('companyId', 'c1');
      expect(result[0]).toHaveProperty('companyName', 'Company 1');
      expect(result[0]).toHaveProperty('employees', 2);
      expect(result[0]).toHaveProperty('drivers', 1);
      expect(result[0]).toHaveProperty('vehicles', 1);
    });
  });
});
