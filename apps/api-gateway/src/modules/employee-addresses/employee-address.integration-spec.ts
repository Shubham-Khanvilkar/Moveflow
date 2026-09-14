import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeAddressService } from './employee-address.service';
import { PrismaService } from '../../common/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, TEST_COMPANY, TEST_EMPLOYEE } from '../../../test/test-utils';

describe('Employee Address Integration', () => {
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

  describe('Full Address Lifecycle', () => {
    it('should complete create → activate → default → deactivate cycle', async () => {
      // Create address
      prisma.employeeAddress.findFirst.mockResolvedValue(null);
      prisma.employeeAddress.updateMany.mockResolvedValue({ count: 0 });
      prisma.employeeAddress.create.mockResolvedValue({
        id: 'addr-1',
        status: 'PENDING',
        isDefault: false,
        effectiveFrom: new Date(),
      });

      const created = await service.create(
        { userId: TEST_EMPLOYEE.id, label: 'Home', addressLine1: '123 Test St', city: 'Mumbai', state: 'MH', pincode: '400001', latitude: 19.076, longitude: 72.8777 } as any,
        TEST_COMPANY.id,
        TEST_EMPLOYEE.id,
      );
      expect(created.status).toBe('PENDING');

      // Activate
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', companyId: TEST_COMPANY.id, userId: TEST_EMPLOYEE.id, status: 'PENDING',
      });
      prisma.employeeAddress.update.mockResolvedValue({ id: 'addr-1', status: 'ACTIVE' });

      const activated = await service.activate('addr-1', TEST_COMPANY.id, TEST_EMPLOYEE.id);
      expect(activated.status).toBe('ACTIVE');

      // Set default
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', companyId: TEST_COMPANY.id, userId: TEST_EMPLOYEE.id,
      });
      prisma.employeeAddress.updateMany.mockResolvedValue({ count: 1 });
      prisma.employeeAddress.update.mockResolvedValue({ id: 'addr-1', isDefault: true });

      const defaulted = await service.setDefault('addr-1', TEST_COMPANY.id, TEST_EMPLOYEE.id);
      expect(defaulted.isDefault).toBe(true);

      // Deactivate
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', companyId: TEST_COMPANY.id, userId: TEST_EMPLOYEE.id, status: 'ACTIVE',
      });
      prisma.employeeAddress.update.mockResolvedValue({ id: 'addr-1', status: 'INACTIVE' });

      const deactivated = await service.deactivate('addr-1', TEST_COMPANY.id, TEST_EMPLOYEE.id);
      expect(deactivated.status).toBe('INACTIVE');
    });
  });

  describe('Default Address Logic', () => {
    it('should unset previous default when setting new default', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-2', companyId: TEST_COMPANY.id, userId: TEST_EMPLOYEE.id,
      });
      prisma.employeeAddress.updateMany.mockResolvedValue({ count: 1 });
      prisma.employeeAddress.update.mockResolvedValue({ id: 'addr-2', isDefault: true });

      await service.setDefault('addr-2', TEST_COMPANY.id, TEST_EMPLOYEE.id);

      expect(prisma.employeeAddress.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: TEST_EMPLOYEE.id,
            isDefault: true,
          }),
          data: expect.objectContaining({ isDefault: false }),
        }),
      );
    });
  });

  describe('Scheduling Validation', () => {
    it('should reject non-ACTIVE address for scheduling', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', status: 'PENDING', effectiveFrom: new Date('2020-01-01'), effectiveTo: null,
      });

      await expect(service.validateAddressForScheduling('addr-1', TEST_COMPANY.id)).rejects.toThrow(BadRequestException);
    });

    it('should reject expired address for scheduling', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', status: 'ACTIVE', effectiveFrom: new Date('2020-01-01'), effectiveTo: new Date('2020-12-31'),
      });

      await expect(service.validateAddressForScheduling('addr-1', TEST_COMPANY.id)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid ACTIVE address for scheduling', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', status: 'ACTIVE', effectiveFrom: new Date('2020-01-01'), effectiveTo: null,
      });

      const result = await service.validateAddressForScheduling('addr-1', TEST_COMPANY.id);
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('Expiring Addresses', () => {
    it('should find addresses expiring within days', async () => {
      prisma.employeeAddress.findMany.mockResolvedValue([
        { id: 'addr-1', effectiveTo: new Date(Date.now() + 15 * 86400000), status: 'ACTIVE' },
      ]);
      prisma.employeeAddress.count.mockResolvedValue(1);

      const result = await service.getExpiringAddresses(TEST_COMPANY.id, 30);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Verify/Reject', () => {
    it('should verify an address', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', companyId: TEST_COMPANY.id,
      });
      prisma.employeeAddress.update.mockResolvedValue({
        id: 'addr-1', status: 'VERIFIED', verifiedById: 'admin-1',
      });

      const result = await service.verify('addr-1', TEST_COMPANY.id, 'admin-1');
      expect(result.status).toBe('VERIFIED');
    });

    it('should reject an address with reason', async () => {
      prisma.employeeAddress.findFirst.mockResolvedValue({
        id: 'addr-1', companyId: TEST_COMPANY.id,
      });
      prisma.employeeAddress.update.mockResolvedValue({
        id: 'addr-1', status: 'REJECTED', rejectionReason: 'Invalid proof',
      });

      const result = await service.reject('addr-1', TEST_COMPANY.id, 'Invalid proof');
      expect(result.status).toBe('REJECTED');
    });
  });
});
