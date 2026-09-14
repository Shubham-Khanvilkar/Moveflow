import { Test, TestingModule } from '@nestjs/testing';
import { DriverService } from './driver.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY } from '../../../test/test-utils';

describe('DriverService', () => {
  let service: DriverService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(DriverService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDriver', () => {
    it('should create a driver with defaults', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue(null);
      prisma.driverProfile.create.mockResolvedValue({
        id: 'drv-1',
        driverCode: 'DRV-001',
        firstName: 'Test',
        lastName: 'Driver',
        mobile: '7777777777',
        status: 'PENDING_VERIFICATION',
        availabilityStatus: 'OFF_DUTY',
        verificationStatus: 'PENDING',
        user: { id: 'u1', name: 'Test Driver', email: 'driver@test.com' },
      });

      const result: any = await service.createDriver(TEST_COMPANY.id, 'admin-1', {
        driverCode: 'DRV-001',
        firstName: 'Test',
        lastName: 'Driver',
        mobile: '7777777777',
        licenseNo: 'DL-001',
        licenseExpiry: '2027-12-31',
      });

      expect(result.status).toBe('PENDING_VERIFICATION');
      expect(result.availabilityStatus).toBe('OFF_DUTY');
      expect(result.verificationStatus).toBe('PENDING');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DRIVER_CREATED' }));
    });

    it('should throw ConflictException for duplicate driverCode', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'existing', driverCode: 'DRV-001' });

      await expect(
        service.createDriver(TEST_COMPANY.id, 'admin-1', {
          driverCode: 'DRV-001',
          firstName: 'Test',
          lastName: 'Driver',
          mobile: '7777777777',
          licenseNo: 'DL-001',
          licenseExpiry: '2027-12-31',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listDrivers', () => {
    it('should return paginated drivers', async () => {
      prisma.driverProfile.findMany.mockResolvedValue([{ id: 'd1', driverCode: 'DRV-001' }]);
      prisma.driverProfile.count.mockResolvedValue(1);

      const result = await service.listDrivers(TEST_COMPANY.id, {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should cap limit at 100', async () => {
      prisma.driverProfile.findMany.mockResolvedValue([]);
      prisma.driverProfile.count.mockResolvedValue(0);

      await service.listDrivers(TEST_COMPANY.id, { limit: 200 });

      const call = prisma.driverProfile.findMany.mock.calls[0][0];
      expect(call.take).toBe(100);
    });
  });

  describe('getDriver', () => {
    it('should return a driver by ID', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', driverCode: 'DRV-001' });

      const result = await service.getDriver(TEST_COMPANY.id, 'd1');
      expect(result.id).toBe('d1');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue(null);

      await expect(service.getDriver(TEST_COMPANY.id, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDriver', () => {
    it('should update whitelisted fields', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', companyId: TEST_COMPANY.id });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1' });

      await service.updateDriver(TEST_COMPANY.id, 'admin-1', 'd1', {
        licenseNo: 'DL-NEW-001',
        city: 'Mumbai',
      });

      expect(prisma.driverProfile.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDriver(TEST_COMPANY.id, 'admin-1', 'nonexistent', { licenseNo: 'DL-NEW' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyDriver', () => {
    it('should transition PENDING_VERIFICATION to ACTIVE', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', companyId: TEST_COMPANY.id, status: 'PENDING_VERIFICATION' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', status: 'ACTIVE', verificationStatus: 'VERIFIED' });

      const result: any = await service.verifyDriver(TEST_COMPANY.id, 'admin-1', 'd1');
      expect(result.status).toBe('ACTIVE');
      expect(result.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('suspendDriver', () => {
    it('should transition ACTIVE to SUSPENDED and set UNAVAILABLE', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', companyId: TEST_COMPANY.id, status: 'ACTIVE' });
      prisma.driverProfile.update.mockResolvedValue({
        id: 'd1',
        status: 'SUSPENDED',
        availabilityStatus: 'UNAVAILABLE',
      });

      const result: any = await service.suspendDriver(TEST_COMPANY.id, 'admin-1', 'd1', 'Policy violation');
      expect(result.status).toBe('SUSPENDED');
      expect(result.availabilityStatus).toBe('UNAVAILABLE');
    });
  });

  describe('activateDriver', () => {
    it('should transition SUSPENDED to ACTIVE', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', companyId: TEST_COMPANY.id, status: 'SUSPENDED' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', status: 'ACTIVE' });

      const result = await service.activateDriver(TEST_COMPANY.id, 'admin-1', 'd1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should transition INACTIVE to ACTIVE', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', companyId: TEST_COMPANY.id, status: 'INACTIVE' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', status: 'ACTIVE' });

      const result = await service.activateDriver(TEST_COMPANY.id, 'admin-1', 'd1');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('checkIn', () => {
    it('should check in an eligible driver', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({
        id: 'd1',
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
        availabilityStatus: 'OFF_DUTY',
        licenseExpiry: new Date('2027-12-31'),
      });
      prisma.complianceDocument.findMany.mockResolvedValue([
        { documentType: 'DRIVING_LICENSE', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
      ]);
      prisma.driverWorkSession.create.mockResolvedValue({ id: 'ws-1', status: 'ACTIVE' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', availabilityStatus: 'AVAILABLE' });

      const result = await service.checkIn(TEST_COMPANY.id, 'd1');
      expect(result.checkedIn).toBe(true);
      expect(result.sessionId).toBe('ws-1');
    });

    it('should reject non-ACTIVE driver', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({
        id: 'd1',
        companyId: TEST_COMPANY.id,
        status: 'SUSPENDED',
      });

      await expect(service.checkIn(TEST_COMPANY.id, 'd1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('should check out a driver with no active trips', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({
        id: 'd1',
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
      });
      prisma.trip.count.mockResolvedValue(0);
      prisma.driverWorkSession.findFirst.mockResolvedValue({
        id: 'ws-1',
        status: 'ACTIVE',
        startedAt: new Date(Date.now() - 3600000),
      });
      prisma.driverWorkSession.update.mockResolvedValue({ id: 'ws-1', status: 'COMPLETED' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', availabilityStatus: 'OFF_DUTY' });

      const result = await service.checkOut(TEST_COMPANY.id, 'd1');
      expect(result.checkedOut).toBe(true);
    });

    it('should reject check-out with active trips', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({
        id: 'd1',
        companyId: TEST_COMPANY.id,
        status: 'ACTIVE',
      });
      prisma.trip.count.mockResolvedValue(2);

      await expect(service.checkOut(TEST_COMPANY.id, 'd1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('startBreak', () => {
    it('should start a break for active driver', async () => {
      prisma.driverWorkSession.findFirst.mockResolvedValue({ id: 'ws-1', status: 'ACTIVE' });
      prisma.driverWorkSession.update.mockResolvedValue({ id: 'ws-1', status: 'ON_BREAK' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', availabilityStatus: 'ON_BREAK' });

      const result = await service.startBreak(TEST_COMPANY.id, 'd1');
      expect(result.breakStarted).toBe(true);
    });

    it('should reject if no active session', async () => {
      prisma.driverWorkSession.findFirst.mockResolvedValue(null);

      await expect(service.startBreak(TEST_COMPANY.id, 'd1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('endBreak', () => {
    it('should end a break and return duration', async () => {
      const breakStart = new Date(Date.now() - 1800000);
      prisma.driverWorkSession.findFirst.mockResolvedValue({
        id: 'ws-1',
        status: 'ON_BREAK',
        breakStartedAt: breakStart,
      });
      prisma.driverWorkSession.update.mockResolvedValue({ id: 'ws-1', status: 'ACTIVE' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', availabilityStatus: 'AVAILABLE' });

      const result = await service.endBreak(TEST_COMPANY.id, 'd1');
      expect(result.breakEnded).toBe(true);
      expect(result.breakDuration).toBeGreaterThan(0);
    });

    it('should reject if no ON_BREAK session', async () => {
      prisma.driverWorkSession.findFirst.mockResolvedValue(null);

      await expect(service.endBreak(TEST_COMPANY.id, 'd1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignVehicle', () => {
    it('should assign a vehicle to a driver', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', companyId: TEST_COMPANY.id });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });
      prisma.driverVehicleAssignment.updateMany.mockResolvedValue({ count: 0 });
      prisma.driverVehicleAssignment.create.mockResolvedValue({ id: 'assign-1', status: 'ACTIVE' });
      prisma.driverProfile.update.mockResolvedValue({ id: 'd1', vehicleId: 'v1' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'ASSIGNED' });

      const result: any = await service.assignVehicle(TEST_COMPANY.id, 'admin-1', 'd1', 'v1');
      expect(result).toBeDefined();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DRIVER_VEHICLE_ASSIGNED' }));
    });

    it('should reject when vehicle is not AVAILABLE', async () => {
      prisma.driverProfile.findFirst.mockResolvedValue({ id: 'd1', companyId: TEST_COMPANY.id });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', status: 'ON_TRIP' });

      await expect(service.assignVehicle(TEST_COMPANY.id, 'admin-1', 'd1', 'v1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createShift', () => {
    it('should create a shift and deactivate previous', async () => {
      prisma.driverShift.updateMany.mockResolvedValue({ count: 1 });
      prisma.driverShift.create.mockResolvedValue({
        id: 'shift-1',
        shiftName: 'Morning',
        startTime: '06:00',
        endTime: '15:00',
        isActive: true,
      });

      const result: any = await service.createShift(TEST_COMPANY.id, 'd1', {
        shiftName: 'Morning',
        startTime: '06:00',
        endTime: '15:00',
      });

      expect(result).toBeDefined();
      expect(prisma.driverShift.updateMany).toHaveBeenCalled();
    });
  });
});
