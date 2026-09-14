import { Test, TestingModule } from '@nestjs/testing';
import { AccessControlService } from './access-control.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ForbiddenException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY } from '../../../test/test-utils';

describe('RBAC Integration', () => {
  let service: AccessControlService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AccessControlService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Role Management', () => {
    it('should return roles from database', async () => {
      prisma.transportAccessRole.findMany.mockResolvedValue([
        { id: 'role-1', roleName: 'TRANSPORT_ADMIN', displayName: 'Transport Admin', hierarchyLevel: 1 },
      ]);

      const result = await service.getRoles(TEST_COMPANY.id);
      expect(result).toHaveLength(1);
    });

    it('should create a role with permission flags', async () => {
      prisma.transportAccessRole.findFirst.mockResolvedValue(null);
      prisma.transportAccessRole.create.mockResolvedValue({
        id: 'role-1',
        roleName: 'DISPATCHER',
        displayName: 'Dispatcher',
        canManageDrivers: true,
        canManageVehicles: true,
      });

      const result = await service.createRole(TEST_COMPANY.id, {
        roleName: 'DISPATCHER',
        displayName: 'Dispatcher',
        hierarchyLevel: 2,
        permissions: {
          canManageDrivers: true,
          canManageVehicles: true,
        },
      } as any, 'admin-1');

      expect(result.roleName).toBe('DISPATCHER');
    });
  });

  describe('User Permissions', () => {
    it('should return aggregated permissions for a user', async () => {
      prisma.transportAccessAssignment.findMany.mockResolvedValue([
        {
          id: 'assign-1',
          userId: 'user-1',
          roleId: 'role-1',
          isActive: true,
        },
      ]);
      prisma.transportAccessRole.findMany.mockResolvedValue([
        {
          id: 'role-1',
          isActive: true,
          canManageDrivers: true,
          canManageVehicles: true,
          canManageRoutes: false,
        },
      ]);

      const result = await service.getUserPermissions(TEST_COMPANY.id, 'user-1');
      expect(result).toBeDefined();
      expect(result.canManageDrivers).toBe(true);
      expect(result.canManageVehicles).toBe(true);
    });
  });

  describe('Role Assignment', () => {
    it('should assign a role to a user', async () => {
      prisma.transportAccessAssignment.findFirst.mockResolvedValue(null);
      prisma.transportAccessAssignment.create.mockResolvedValue({
        id: 'assign-1',
        userId: 'user-1',
        roleId: 'role-1',
        isActive: true,
      });

      const result: any = await service.assignRole(TEST_COMPANY.id, 'user-1', 'role-1', 'admin-1');
      expect(result).toBeDefined();
    });

    it('should prevent duplicate active assignment', async () => {
      prisma.transportAccessAssignment.findFirst.mockResolvedValue({
        id: 'existing',
        userId: 'user-1',
        roleId: 'role-1',
        isActive: true,
      });

      await expect(
        service.assignRole(TEST_COMPANY.id, 'user-1', 'role-1', 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Permission Resolution', () => {
    it('should use default roles when no assignments exist', async () => {
      prisma.transportAccessRole.findMany.mockResolvedValue([]);

      const result = await service.getRoles(TEST_COMPANY.id);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Tenant Isolation', () => {
    it('should scope queries to company', async () => {
      prisma.transportAccessRole.findMany.mockResolvedValue([]);

      await service.getRoles(TEST_COMPANY.id);

      const findManyCall = prisma.transportAccessRole.findMany.mock.calls[0][0];
      expect(findManyCall.where.companyId).toBe(TEST_COMPANY.id);
    });
  });
});
