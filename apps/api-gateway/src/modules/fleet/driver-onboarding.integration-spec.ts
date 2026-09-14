import { Test, TestingModule } from '@nestjs/testing';
import { DriverOnboardingService } from './driver-onboarding.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY } from '../../../test/test-utils';

describe('Driver Onboarding Integration', () => {
  let service: DriverOnboardingService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverOnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(DriverOnboardingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Full Onboarding Lifecycle', () => {
    it('should complete invite → token access → upload → submit → verify cycle', async () => {
      // Step 1: Invite
      prisma.driverOnboarding.findFirst.mockResolvedValue(null);
      prisma.driverOnboarding.create.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'DRAFT',
        complianceScore: 'NON_COMPLIANT',
      });
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-1',
        token: 'onboard-token-123',
        expiresAt: new Date(Date.now() + 15 * 86400000),
        status: 'PENDING',
      });

      const invited = await service.inviteDriver(TEST_COMPANY.id, 'admin-1', {
        firstName: 'Raj',
        lastName: 'Kumar',
        mobileNumber: '9999999999',
      });
      expect(invited.status).toBe('DRAFT');
      const token = invited.token;

      // Step 2: Token access
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 10 * 86400000),
        companyId: TEST_COMPANY.id,
        email: 'raj@test.com',
      });
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        firstName: 'Raj',
        lastName: 'Kumar',
        mobileNumber: '9999999999',
        status: 'DRAFT',
        complianceScore: 'NON_COMPLIANT',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([]);

      const status = await service.getOnboardingByToken(token);
      expect(status.status).toBe('DRAFT');
      expect(status.daysRemaining).toBeGreaterThan(0);

      // Step 3: Upload document
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1', token, status: 'PENDING',
        expiresAt: new Date(Date.now() + 10 * 86400000),
        companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1', driverId: 'DRV-001', status: 'DRAFT',
      });
      prisma.complianceDocument.create.mockResolvedValue({
        id: 'doc-1', documentType: 'DRIVING_LICENSE', status: 'UPLOADED',
      });
      prisma.driverOnboarding.update.mockResolvedValue({ id: 'onb-1', status: 'DOCUMENTS_PENDING' });

      const doc = await service.uploadDocument(token, {
        documentType: 'DRIVING_LICENSE',
        fileUrl: '/files/license.pdf',
      });
      expect(doc.documentId).toBe('doc-1');

      // Step 4: Submit for review
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1', token, status: 'PENDING', companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1', driverId: 'DRV-001', status: 'DOCUMENTS_PENDING',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([{ id: 'doc-1' }]);
      prisma.driverOnboarding.update.mockResolvedValue({ id: 'onb-1', status: 'UNDER_REVIEW' });

      const submitted = await service.submitForReview(token);
      expect(submitted.status).toBe('UNDER_REVIEW');

      // Step 5: Admin verifies
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1', driverId: 'DRV-001', status: 'UNDER_REVIEW', companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.update.mockResolvedValue({
        id: 'onb-1', status: 'ACTIVE', complianceScore: 'COMPLIANT',
      });
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });

      const verified = await service.verifyOnboarding(TEST_COMPANY.id, 'admin-1', 'DRV-001');
      expect(verified.status).toBe('ACTIVE');
      expect(verified.complianceScore).toBe('COMPLIANT');
    });
  });

  describe('Token Expiry', () => {
    it('should auto-expire and reject expired tokens', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'expired-token',
        status: 'PENDING',
        expiresAt: pastDate,
        companyId: TEST_COMPANY.id,
      });
      prisma.invitation.update.mockResolvedValue({ id: 'inv-1', status: 'EXPIRED' });

      await expect(service.getOnboardingByToken('expired-token')).rejects.toThrow(BadRequestException);
      expect(prisma.invitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({ status: 'EXPIRED' }),
        }),
      );
    });

    it('should reject upload on expired token', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'expired-token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000),
        companyId: TEST_COMPANY.id,
      });

      await expect(
        service.uploadDocument('expired-token', {
          documentType: 'DRIVING_LICENSE',
          fileUrl: '/files/license.pdf',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Duplicate Invite Prevention', () => {
    it('should reject duplicate invite for same mobile number', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'existing-onb',
        mobileNumber: '9999999999',
        status: 'DRAFT',
      });

      await expect(
        service.inviteDriver(TEST_COMPANY.id, 'admin-1', {
          firstName: 'Raj',
          lastName: 'Kumar',
          mobileNumber: '9999999999',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow invite after rejection', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue(null);
      prisma.driverOnboarding.create.mockResolvedValue({
        id: 'onb-new', driverId: 'DRV-002', status: 'DRAFT',
      });
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-new', token: 'new-token', status: 'PENDING',
        expiresAt: new Date(Date.now() + 15 * 86400000),
      });

      const result = await service.inviteDriver(TEST_COMPANY.id, 'admin-1', {
        firstName: 'Raj',
        lastName: 'Kumar',
        mobileNumber: '9999999999',
      });
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('Rejection Flow', () => {
    it('should reject onboarding from any status', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1', driverId: 'DRV-001', status: 'DRAFT', companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.update.mockResolvedValue({
        id: 'onb-1', status: 'REJECTED',
      });
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.rejectOnboarding(TEST_COMPANY.id, 'admin-1', 'DRV-001', 'Fake documents');
      expect(result.status).toBe('REJECTED');
      expect(result.reason).toBe('Fake documents');
    });

    it('should update invitation status to REVOKED on rejection', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1', driverId: 'DRV-001', status: 'UNDER_REVIEW', companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.update.mockResolvedValue({ id: 'onb-1', status: 'REJECTED' });
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });

      await service.rejectOnboarding(TEST_COMPANY.id, 'admin-1', 'DRV-001', 'Invalid');

      expect(prisma.invitation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REVOKED' }),
        }),
      );
    });
  });

  describe('Pending List', () => {
    it('should return only pending onboardings', async () => {
      prisma.driverOnboarding.findMany.mockResolvedValue([
        { id: 'onb-1', status: 'DRAFT' },
        { id: 'onb-2', status: 'DOCUMENTS_PENDING' },
        { id: 'onb-3', status: 'UNDER_REVIEW' },
      ]);

      const result = await service.listPendingOnboardings(TEST_COMPANY.id);
      expect(result).toHaveLength(3);

      const findManyCall = prisma.driverOnboarding.findMany.mock.calls[0][0];
      expect(findManyCall.where.status.in).toContain('DRAFT');
      expect(findManyCall.where.status.in).toContain('DOCUMENTS_PENDING');
      expect(findManyCall.where.status.in).toContain('UNDER_REVIEW');
    });
  });
});
