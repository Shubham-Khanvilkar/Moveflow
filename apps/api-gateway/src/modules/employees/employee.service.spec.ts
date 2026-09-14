import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

const mockPrisma = {
  isConnected: jest.fn().mockReturnValue(true),
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  department: {
    findFirst: jest.fn(),
  },
  office: {
    findFirst: jest.fn(),
  },
  employeeTransportEligibility: {
    create: jest.fn(),
    upsert: jest.fn(),
    findFirst: jest.fn(),
  },
  managerRelationship: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  emergencyContact: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  savedLocation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  companyMembership: {
    findFirst: jest.fn(),
  },
  booking: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  approvalEntry: {
    findMany: jest.fn(),
  },
  trip: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  transportBan: {
    findMany: jest.fn(),
  },
  recurringBooking: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockAudit = {
  log: jest.fn(),
};

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(EmployeeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEmployee', () => {
    const companyId = 'company-1';
    const performedBy = 'admin-1';
    const employeeData = {
      employeeId: 'EMP-100',
      name: 'John Doe',
      email: 'john@acme.com',
      departmentId: 'dept-1',
    };

    it('should create an employee successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.department.findFirst.mockResolvedValue({ id: 'dept-1', name: 'Engineering' });
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-100',
        employeeId: 'EMP-100',
        name: 'John Doe',
        email: 'john@acme.com',
        department: { id: 'dept-1', name: 'Engineering' },
        businessUnit: null,
        shift: null,
      });
      mockPrisma.employeeTransportEligibility.create.mockResolvedValue({});

      const result: any = await service.createEmployee(companyId, performedBy, employeeData);

      expect(result.employeeId).toBe('EMP-100');
      expect(result.name).toBe('John Doe');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.employeeTransportEligibility.create).toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_CREATED' }),
      );
    });

    it('should throw ConflictException for duplicate employee ID', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing', employeeId: 'EMP-100' });

      await expect(
        service.createEmployee(companyId, performedBy, employeeData),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'john@acme.com' });

      await expect(
        service.createEmployee(companyId, performedBy, employeeData),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid department', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.department.findFirst.mockResolvedValue(null);

      await expect(
        service.createEmployee(companyId, performedBy, employeeData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default password when none provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-100',
        employeeId: 'EMP-100',
        name: 'John Doe',
        email: 'john@acme.com',
        department: null,
        businessUnit: null,
        shift: null,
      });
      mockPrisma.employeeTransportEligibility.create.mockResolvedValue({});

      await service.createEmployee(companyId, performedBy, {
        employeeId: 'EMP-100',
        name: 'John Doe',
        email: 'john@acme.com',
      });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).toBeDefined();
    });
  });

  describe('listEmployees', () => {
    const companyId = 'company-1';

    it('should return paginated employees', async () => {
      const mockEmployees = [
        { id: 'user-1', name: 'Alice', email: 'alice@acme.com' },
        { id: 'user-2', name: 'Bob', email: 'bob@acme.com' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockEmployees);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.listEmployees(companyId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should return empty list when no employees', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.listEmployees(companyId, {});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should apply search filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.listEmployees(companyId, { search: 'alice' });

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR.length).toBe(3);
    });

    it('should apply department filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.listEmployees(companyId, { departmentId: 'dept-1' });

      const findManyCall = mockPrisma.user.findMany.mock.calls[0][0];
      expect(findManyCall.where.departmentId).toBe('dept-1');
    });
  });

  describe('getEmployee', () => {
    it('should return employee by ID', async () => {
      const mockEmployee = {
        id: 'user-1',
        employeeId: 'EMP-001',
        name: 'Alice',
        email: 'alice@acme.com',
        department: { id: 'dept-1', name: 'Engineering' },
        shift: { id: 'shift-1', name: 'Morning' },
        manager: { id: 'mgr-1', name: 'Manager' },
        teamLeader: null,
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockEmployee);

      const result: any = await service.getEmployee('company-1', 'user-1');

      expect(result.id).toBe('user-1');
      expect(result.name).toBe('Alice');
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getEmployee('company-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEmployee', () => {
    it('should update employee fields', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        name: 'Old Name',
        phone: '123',
        designation: 'Engineer',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'New Name',
        email: 'alice@acme.com',
      });

      const result: any = await service.updateEmployee('company-1', 'admin-1', 'user-1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_UPDATED' }),
      );
    });

    it('should throw NotFoundException for non-existent employee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEmployee('company-1', 'admin-1', 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for no valid fields', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1', name: 'Test' });

      await expect(
        service.updateEmployee('company-1', 'admin-1', 'user-1', { invalidField: 'value' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteEmployee', () => {
    it('should soft delete an employee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', name: 'Test', status: 'INACTIVE' });

      const result: any = await service.deleteEmployee('company-1', 'admin-1', 'user-1');

      expect(result.status).toBe('INACTIVE');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EMPLOYEE_DELETED' }),
      );
    });

    it('should throw NotFoundException for non-existent employee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteEmployee('company-1', 'admin-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTransportEligibility', () => {
    it('should update eligibility status', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        transportEligibility: 'ELIGIBLE',
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.employeeTransportEligibility.upsert.mockResolvedValue({});

      const result = await service.updateTransportEligibility(
        'company-1',
        'admin-1',
        'user-1',
        'INELIGIBLE',
        'Policy violation',
      );

      expect(result.transportEligibility).toBe('INELIGIBLE');
      expect(result.reason).toBe('Policy violation');
    });

    it('should throw BadRequestException for invalid status', async () => {
      await expect(
        service.updateTransportEligibility('company-1', 'admin-1', 'user-1', 'INVALID', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent employee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTransportEligibility('company-1', 'admin-1', 'nonexistent', 'ELIGIBLE', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOwnProfile', () => {
    it('should return user profile with saved locations', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@acme.com',
      });
      mockPrisma.savedLocation.findMany.mockResolvedValue([
        { id: 'loc-1', name: 'Home' },
      ]);
      mockPrisma.emergencyContact.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.employeeTransportEligibility.findFirst.mockResolvedValue({ status: 'ELIGIBLE' });

      const result = await service.getOwnProfile('company-1', 'user-1');

      expect((result as any).id).toBe('user-1');
      expect(result.savedLocations).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getOwnProfile('company-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
