import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeAddressService } from './employee-address.service';
import { PrismaService } from '../../common/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, TEST_COMPANY, TEST_EMPLOYEE } from '../../../test/test-utils';

describe('EmployeeAddressService', () => {
  let service: EmployeeAddressService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeAddressService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EmployeeAddressService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an address with PENDING status', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue(null);
      prisma.employeeAddress.updateMany.mockResolvedValue({ count: 0 });
      prisma.employeeAddress.create.mockResolvedValue({
        id: 'addr-1',
        userId: TEST_EMPLOYEE.id,
        type: 'HOME',
        status: 'PENDING',
        isDefault: false,
        latitude: 19.076,
        longitude: 72.8777,
        addressLine1: '123 Test Street',
        city: 'Mumbai',
        country: 'IN',
      });

      const result = await service.create(
        {
          userId: TEST_EMPLOYEE.id,
          label: 'Home',
          addressLine1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          latitude: 19.076,
          longitude: 72.8777,
        } as any,
        TEST_COMPANY.id,
        TEST_EMPLOYEE.id,
      );

      expect(result.status).toBe('PENDING');
      expect(result.country).toBe('IN');
    });

    it('should unset other defaults when setting isDefault=true', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue(null);
      prisma.employeeAddress.updateMany.mockResolvedValue({ count: 1 });
      prisma.employeeAddress.create.mockResolvedValue({
        id: 'addr-1',
        isDefault: true,
      });

      await service.create(
        {
          userId: TEST_EMPLOYEE.id,
          label: 'Home',
          addressLine1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          latitude: 19.076,
          longitude: 72.8777,
          isDefault: true,
        } as any,
        TEST_COMPANY.id,
        TEST_EMPLOYEE.id,
      );

      expect(prisma.employeeAddress.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: false }),
        }),
      );
    });
  });

  describe('activate', () => {
    it('should set status to ACTIVE', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        companyId: TEST_COMPANY.id,
        userId: TEST_EMPLOYEE.id,
        status: 'PENDING',
      });
      prisma.employeeAddress.update.mockResolvedValue({
        id: 'addr-1',
        status: 'ACTIVE',
      });

      const result = await service.activate('addr-1', TEST_COMPANY.id, TEST_EMPLOYEE.id);
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('deactivate', () => {
    it('should set status to INACTIVE', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        companyId: TEST_COMPANY.id,
        userId: TEST_EMPLOYEE.id,
        status: 'ACTIVE',
      });
      prisma.employeeAddress.update.mockResolvedValue({
        id: 'addr-1',
        status: 'INACTIVE',
      });

      const result = await service.deactivate('addr-1', TEST_COMPANY.id, TEST_EMPLOYEE.id);
      expect(result.status).toBe('INACTIVE');
    });
  });

  describe('setDefault', () => {
    it('should unset other defaults and set this one', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        companyId: TEST_COMPANY.id,
        userId: TEST_EMPLOYEE.id,
      });
      prisma.employeeAddress.updateMany.mockResolvedValue({ count: 2 });
      prisma.employeeAddress.update.mockResolvedValue({
        id: 'addr-1',
        isDefault: true,
      });

      const result = await service.setDefault('addr-1', TEST_COMPANY.id, TEST_EMPLOYEE.id);
      expect(result.isDefault).toBe(true);
      expect(prisma.employeeAddress.updateMany).toHaveBeenCalled();
    });
  });

  describe('validateAddressForScheduling', () => {
    it('should pass for ACTIVE address', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: null,
      });

      const result = await service.validateAddressForScheduling('addr-1', TEST_COMPANY.id);
      expect(result.status).toBe('ACTIVE');
    });

    it('should reject non-ACTIVE address', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        status: 'PENDING',
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: null,
      });

      await expect(service.validateAddressForScheduling('addr-1', TEST_COMPANY.id)).rejects.toThrow(BadRequestException);
    });

    it('should reject expired address', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
        effectiveTo: new Date('2020-12-31'),
      });

      await expect(service.validateAddressForScheduling('addr-1', TEST_COMPANY.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('should return an address', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({ id: 'addr-1' });
      const result = await service.getById('addr-1', TEST_COMPANY.id);
      expect(result.id).toBe('addr-1');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue(null);
      await expect(service.getById('nonexistent', TEST_COMPANY.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify', () => {
    it('should set status to VERIFIED', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.employeeAddress.update.mockResolvedValue({
        id: 'addr-1',
        status: 'VERIFIED',
        verifiedById: 'admin-1',
      });

      const result = await service.verify('addr-1', TEST_COMPANY.id, 'admin-1');
      expect(result.status).toBe('VERIFIED');
    });
  });

  describe('reject', () => {
    it('should set status to REJECTED', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.employeeAddress.update.mockResolvedValue({
        id: 'addr-1',
        status: 'REJECTED',
        rejectionReason: 'Invalid address',
      });

      const result = await service.reject('addr-1', TEST_COMPANY.id, 'Invalid address');
      expect(result.status).toBe('REJECTED');
    });
  });
});
