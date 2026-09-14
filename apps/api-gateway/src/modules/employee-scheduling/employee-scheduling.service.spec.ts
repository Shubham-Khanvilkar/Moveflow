import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeSchedulingService } from './employee-scheduling.service';
import { PrismaService } from '../../common/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrisma, TEST_COMPANY, TEST_EMPLOYEE, TEST_SITE, TEST_SHIFT } from '../../../test/test-utils';

describe('EmployeeSchedulingService', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSchedule', () => {
    it('should create a regular schedule', async () => {
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
      expect(result.logoutTime).toBe('18:00');
      expect(prisma.employeeScheduleHistory.create).toHaveBeenCalled();
    });

    it('should detect overnight shift when logoutTime < loginTime', async () => {
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
        id: 'sched-2',
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

    it('should reject overlapping schedules', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'ELIGIBLE',
      });
      prisma.employeeSchedule.findFirst.mockResolvedValue({
        id: 'existing-sched',
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

    it('should reject if employee is not ELIGIBLE', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_EMPLOYEE.id,
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        transportEligibility: 'INELIGIBLE',
      });

      await expect(
        service.createSchedule(
          {
            userId: TEST_EMPLOYEE.id,
            effectiveFrom: '2026-01-01',
            loginTime: '09:00',
            logoutTime: '18:00',
          },
          TEST_COMPANY.id,
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setWeeklyOff', () => {
    it('should create a weekly off', async () => {
      prisma.employeeWeeklyOff.findUnique.mockResolvedValue(null);
      prisma.employeeWeeklyOff.create.mockResolvedValue({
        id: 'wo-1',
        userId: TEST_EMPLOYEE.id,
        dayOfWeek: 0,
        offType: 'WEEKLY_OFF',
        isActive: true,
      });
      prisma.employeeHistory.create.mockResolvedValue({});

      const result = await service.setWeeklyOff(
        TEST_EMPLOYEE.id,
        0,
        'WEEKLY_OFF',
        '2026-01-01',
        undefined,
        TEST_COMPANY.id,
        'admin-1',
      );

      expect(result.dayOfWeek).toBe(0);
      expect(result.offType).toBe('WEEKLY_OFF');
    });

    it('should upsert existing weekly off', async () => {
      prisma.employeeWeeklyOff.findUnique.mockResolvedValue({
        id: 'wo-existing',
        userId: TEST_EMPLOYEE.id,
        dayOfWeek: 0,
      });
      prisma.employeeWeeklyOff.update.mockResolvedValue({
        id: 'wo-existing',
        offType: 'COMPANY_OFF',
      });
      prisma.employeeHistory.create.mockResolvedValue({});

      const result = await service.setWeeklyOff(
        TEST_EMPLOYEE.id,
        0,
        'COMPANY_OFF',
        '2026-01-01',
        undefined,
        TEST_COMPANY.id,
        'admin-1',
      );

      expect(prisma.employeeWeeklyOff.update).toHaveBeenCalled();
    });
  });

  describe('removeWeeklyOff', () => {
    it('should soft-delete a weekly off', async () => {
      prisma.employeeWeeklyOff.findUnique.mockResolvedValue({
        id: 'wo-1',
        userId: TEST_EMPLOYEE.id,
        dayOfWeek: 0,
        isActive: true,
      });
      prisma.employeeWeeklyOff.update.mockResolvedValue({ id: 'wo-1', isActive: false });
      prisma.employeeHistory.create.mockResolvedValue({});

      const result = await service.removeWeeklyOff(TEST_EMPLOYEE.id, 0, TEST_COMPANY.id, 'admin-1');
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.employeeWeeklyOff.findUnique.mockResolvedValue(null);

      await expect(
        service.removeWeeklyOff(TEST_EMPLOYEE.id, 0, TEST_COMPANY.id, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelSchedule', () => {
    it('should set effectiveTo to now', async () => {
      prisma.employeeSchedule.findFirst.mockResolvedValue({
        id: 'sched-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.employeeSchedule.update.mockResolvedValue({
        id: 'sched-1',
        effectiveTo: new Date(),
      });
      prisma.employeeScheduleHistory.create.mockResolvedValue({});
      prisma.employeeHistory.create.mockResolvedValue({});

      const result = await service.cancelSchedule('sched-1', TEST_COMPANY.id, 'admin-1', 'No longer needed');
      expect(result.effectiveTo).toBeDefined();
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple schedules', async () => {
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
      });
      prisma.employeeScheduleHistory.create.mockResolvedValue({});
      prisma.employeeHistory.create.mockResolvedValue({});

      const result = await service.bulkCreate(
        {
          schedules: [
            { userId: TEST_EMPLOYEE.id, effectiveFrom: '2026-01-01', loginTime: '09:00', logoutTime: '18:00' },
            { userId: TEST_EMPLOYEE.id, effectiveFrom: '2026-02-01', loginTime: '10:00', logoutTime: '19:00' },
          ],
        },
        TEST_COMPANY.id,
        'admin-1',
      );

      expect(result).toHaveLength(2);
    });
  });
});
