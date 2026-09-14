import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeSchedulingService } from './employee-scheduling.service';
import { PrismaService } from '../../common/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrisma, TEST_COMPANY, TEST_EMPLOYEE, TEST_SITE, TEST_SHIFT } from '../../../test/test-utils';

describe('Employee Scheduling Integration', () => {
  let service: EmployeeSchedulingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeSchedulingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EmployeeSchedulingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Schedule with Overlap Detection', () => {
    it('should create schedule when no overlap exists', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.employeeSchedule.findFirst.mockResolvedValue(null);
      prisma.employeeWeeklyOff.findMany.mockResolvedValue([]);
      prisma.shiftBufferPolicy.findFirst.mockResolvedValue(null);
      prisma.employeeSchedule.create.mockResolvedValue({
        id: 'sched-1',
        userId: TEST_EMPLOYEE.id,
        loginTime: '09:00',
        logoutTime: '18:00',
        isRecurring: true,
        status: 'ACTIVE',
      });
      prisma.employeeScheduleHistory.create.mockResolvedValue({});
      prisma.employeeHistory.create.mockResolvedValue({});

      const result = await service.createSchedule(
        {
          userId: TEST_EMPLOYEE.id,
          effectiveFrom: '2026-01-01',
          loginTime: '09:00',
          logoutTime: '18:00',
          isRecurring: true,
          recurringDays: [1, 2, 3, 4, 5],
        },
        TEST_COMPANY.id,
        'admin-1',
      );

      expect(result.loginTime).toBe('09:00');
    });

    it('should reject overlapping schedules', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.employeeSchedule.findFirst.mockResolvedValue({
        id: 'existing',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
      });

      await expect(
        service.createSchedule(
          {
            userId: TEST_EMPLOYEE.id,
            effectiveFrom: '2026-01-15',
            loginTime: '09:00',
            logoutTime: '18:00',
          },
          TEST_COMPANY.id,
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Overnight Shift Detection', () => {
    it('should detect overnight shift when logout < login', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.employeeSchedule.findFirst.mockResolvedValue(null);
      prisma.employeeWeeklyOff.findMany.mockResolvedValue([]);
      prisma.shiftBufferPolicy.findFirst.mockResolvedValue(null);
      prisma.employeeSchedule.create.mockResolvedValue({
        id: 'sched-overnight',
        loginTime: '22:00',
        logoutTime: '06:00',
        slotType: 'LOGOUT',
      });
      prisma.employeeScheduleHistory.create.mockResolvedValue({});
      prisma.employeeHistory.create.mockResolvedValue({});

      const result = await service.createSchedule(
        {
          userId: TEST_EMPLOYEE.id,
          effectiveFrom: '2026-01-01',
          loginTime: '22:00',
          logoutTime: '06:00',
        },
        TEST_COMPANY.id,
        'admin-1',
      );

      expect(result.slotType).toBe('LOGOUT');
    });
  });

  describe('Weekly Off Conflicts', () => {
    it('should reject schedule when weekly off conflicts', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.employeeSchedule.findFirst.mockResolvedValue(null);
      prisma.employeeWeeklyOff.findMany.mockResolvedValue([
        { dayOfWeek: 0, isActive: true, offType: 'WEEKLY_OFF' },
      ]);

      await expect(
        service.createSchedule(
          {
            userId: TEST_EMPLOYEE.id,
            effectiveFrom: '2026-01-01',
            loginTime: '09:00',
            logoutTime: '18:00',
            isRecurring: true,
          recurringDays: [0, 1, 2, 3, 4, 5, 6],
          weeklyOffs: ['Sunday'] as any,
          },
          TEST_COMPANY.id,
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Weekly Grid', () => {
    it('should construct 7-day grid', async () => {
      prisma.employeeSchedule.findMany.mockResolvedValue([
        {
          id: 'sched-1',
          userId: 'u1',
          loginTime: '09:00',
          logoutTime: '18:00',
          isRecurring: true,
          recurringDays: [1, 2, 3, 4, 5],
          effectiveFrom: new Date('2026-01-05'),
          effectiveTo: null,
          weeklyOffs: [],
          user: { id: 'u1', name: 'Employee 1' },
          site: { id: 's1', siteName: 'Mumbai' },
        },
      ]);
      prisma.employeeSchedule.count.mockResolvedValue(1);

      const result = await service.getWeeklyGrid(
        { weekStart: '2026-01-05', page: 1, limit: 50 },
        TEST_COMPANY.id,
      );

      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('object');
    });
  });

  describe('Schedule Impact Check', () => {
    it('should compute affected trips on schedule change', async () => {
      prisma.employeeSchedule.findFirst.mockResolvedValue({
        id: 'sched-1',
        userId: 'u1',
        companyId: TEST_COMPANY.id,
      });
      prisma.trip.findMany.mockResolvedValue([
        { id: 't1', vehicleId: 'v1', routeId: 'r1' },
        { id: 't2', vehicleId: 'v1', routeId: 'r2' },
      ]);

      const result = await service.checkScheduleImpact('sched-1', TEST_COMPANY.id);

      expect(result.affectedTrips).toBe(2);
      expect(result.warning).toBeDefined();
    });
  });

  describe('Swap Schedules', () => {
    it('should swap two schedules', async () => {
      prisma.employeeSchedule.findFirst
        .mockResolvedValueOnce({
          id: 'sched-1',
          userId: 'u1',
          loginTime: '09:00',
          logoutTime: '18:00',
        })
        .mockResolvedValueOnce({
          id: 'sched-2',
          userId: 'u2',
          loginTime: '10:00',
          logoutTime: '19:00',
        });
      prisma.employeeSchedule.update
        .mockResolvedValueOnce({ id: 'sched-1' })
        .mockResolvedValueOnce({ id: 'sched-2' });
      prisma.employeeScheduleHistory.create.mockResolvedValue({});

      const result = await service.swapSchedules(
        { scheduleId1: 'sched-1', scheduleId2: 'sched-2' },
        TEST_COMPANY.id,
        'admin-1',
      );

      expect(result.schedule1).toBeDefined();
      expect(result.schedule2).toBeDefined();
    });
  });
});
