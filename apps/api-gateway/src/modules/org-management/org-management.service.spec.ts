import { Test, TestingModule } from '@nestjs/testing';
import { OrgManagementService } from './org-management.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY, TEST_SITE } from '../../../test/test-utils';

describe('OrgManagementService', () => {
  let service: OrgManagementService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgManagementService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(OrgManagementService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRegion', () => {
    it('should create a region', async () => {
      prisma.region.findFirst.mockResolvedValue(null);
      prisma.region.create.mockResolvedValue({
        id: 'reg-1',
        regionCode: 'WEST',
        regionName: 'West',
      });

      const result = await service.createRegion(
        TEST_COMPANY.id,
        { regionCode: 'WEST', regionName: 'West' },
        'admin-1',
      );

      expect(result.regionCode).toBe('WEST');
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('createSite', () => {
    it('should create a site', async () => {
      prisma.companySite.findFirst.mockResolvedValue(null);
      prisma.companySite.create.mockResolvedValue({
        id: 'site-1',
        siteCode: 'MUM',
        siteName: 'Mumbai',
      });

      const result = await service.createSite(
        TEST_COMPANY.id,
        { siteCode: 'MUM', siteName: 'Mumbai' },
        'admin-1',
      );

      expect(result.siteCode).toBe('MUM');
    });
  });

  describe('deleteSite', () => {
    it('should delete site with no LOBs', async () => {
      prisma.companySite.findFirst.mockResolvedValue({
        id: 'site-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.lineOfBusiness.count.mockResolvedValue(0);
      prisma.companySite.delete.mockResolvedValue({ id: 'site-1' });

      const result = await service.deleteSite(TEST_COMPANY.id, 'site-1', 'admin-1');
      expect(result.deleted).toBe(true);
    });

    it('should reject deletion when site has LOBs', async () => {
      prisma.companySite.findFirst.mockResolvedValue({
        id: 'site-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.lineOfBusiness.count.mockResolvedValue(3);

      await expect(service.deleteSite(TEST_COMPANY.id, 'site-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createLOB', () => {
    it('should create a LOB', async () => {
      prisma.lineOfBusiness.findFirst.mockResolvedValue(null);
      prisma.companySite.findFirst.mockResolvedValue({ id: 'site-1' });
      prisma.lineOfBusiness.create.mockResolvedValue({
        id: 'lob-1',
        lobCode: 'BANK',
        lobName: 'Banking',
      });

      const result = await service.createLOB(
        TEST_COMPANY.id,
        { lobCode: 'BANK', lobName: 'Banking', siteId: 'site-1' },
        'admin-1',
      );

      expect(result.lobCode).toBe('BANK');
    });
  });

  describe('deleteLOB', () => {
    it('should reject deletion when LOB has processes', async () => {
      prisma.lineOfBusiness.findFirst.mockResolvedValue({
        id: 'lob-1',
        companyId: TEST_COMPANY.id,
      });
      prisma.orgProcess.count.mockResolvedValue(2);

      await expect(service.deleteLOB(TEST_COMPANY.id, 'lob-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createProcess', () => {
    it('should create a process', async () => {
      prisma.orgProcess.findFirst.mockResolvedValue(null);
      prisma.lineOfBusiness.findFirst.mockResolvedValue({ id: 'lob-1' });
      prisma.orgProcess.create.mockResolvedValue({
        id: 'proc-1',
        processCode: 'PROC-A',
        processName: 'Process A',
      });

      const result = await service.createProcess(
        TEST_COMPANY.id,
        { processCode: 'PROC-A', processName: 'Process A', lobId: 'lob-1' },
        'admin-1',
      );

      expect(result.processCode).toBe('PROC-A');
    });
  });

  describe('assignEmployeeToOrg', () => {
    it('should assign employee to org', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'emp-1', companyId: TEST_COMPANY.id });
      prisma.companySite.findFirst.mockResolvedValue({ id: 'site-1' });
      prisma.lineOfBusiness.findFirst.mockResolvedValue({ id: 'lob-1' });
      prisma.orgProcess.findFirst.mockResolvedValue({ id: 'proc-1' });
      prisma.shift.findFirst.mockResolvedValue({ id: 'shift-1' });
      prisma.employeeOrgAssignment.upsert.mockResolvedValue({
        id: 'assign-1',
        userId: 'emp-1',
        siteId: 'site-1',
      });

      const result = await service.assignEmployeeToOrg(
        TEST_COMPANY.id,
        'emp-1',
        { siteId: 'site-1', lobId: 'lob-1', processId: 'proc-1', shiftId: 'shift-1' },
        'admin-1',
      );

      expect(result).toBeDefined();
    });
  });

  describe('grantAccessScope', () => {
    it('should create access scope with history', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'emp-1' });
      prisma.accessScope.create.mockResolvedValue({
        id: 'scope-1',
        userId: 'emp-1',
        isActive: true,
      });
      prisma.userAccessScopeHistory.create.mockResolvedValue({});

      const result = await service.grantAccessScope(
        TEST_COMPANY.id,
        'emp-1',
        { siteId: 'site-1' },
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(prisma.userAccessScopeHistory.create).toHaveBeenCalled();
    });
  });

  describe('revokeAccessScope', () => {
    it('should soft-revoke access scope', async () => {
      prisma.accessScope.findFirst.mockResolvedValue({
        id: 'scope-1',
        companyId: TEST_COMPANY.id,
        isActive: true,
      });
      prisma.accessScope.update.mockResolvedValue({
        id: 'scope-1',
        isActive: false,
      });
      prisma.userAccessScopeHistory.create.mockResolvedValue({});

      const result = await service.revokeAccessScope(TEST_COMPANY.id, 'scope-1', 'admin-1');
      expect(result.revoked).toBe(true);
    });
  });

  describe('setRolePermissionConfig', () => {
    it('should upsert role permission config', async () => {
      prisma.transportAccessRole.findFirst.mockResolvedValue({ id: 'role-1' });
      prisma.permissionDefinition.findFirst.mockResolvedValue({ id: 'perm-1' });
      prisma.rolePermissionConfig.upsert.mockResolvedValue({
        id: 'rpc-1',
        roleId: 'role-1',
        permissionId: 'perm-1',
        enabled: true,
      });

      const result = await service.setRolePermissionConfig(
        TEST_COMPANY.id,
        'role-1',
        'perm-1',
        true,
        'admin-1',
      );

      expect(result).toBeDefined();
    });
  });

  describe('getOrgTree', () => {
    it('should return hierarchical org tree', async () => {
      prisma.companySite.findMany.mockResolvedValue([
        {
          id: 'site-1',
          siteCode: 'MUM',
          siteName: 'Mumbai',
          LineOfBusiness: [
            {
              id: 'lob-1',
              lobCode: 'BANK',
              lobName: 'Banking',
              OrgProcess: [{ id: 'proc-1', processCode: 'PROC-A', processName: 'Process A' }],
            },
          ],
        },
      ]);
      prisma.shift.findMany.mockResolvedValue([
        { id: 'shift-1', name: 'Morning' },
      ]);

      const result = await service.getOrgTree(TEST_COMPANY.id);
      expect(result.sites).toHaveLength(1);
      expect(result.sites[0].LineOfBusiness).toHaveLength(1);
      expect(result.shifts).toHaveLength(1);
    });
  });
});
