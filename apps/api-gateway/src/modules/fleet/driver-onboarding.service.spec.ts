import { Test, TestingModule } from '@nestjs/testing';
import { DriverOnboardingService } from './driver-onboarding.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY } from '../../../test/test-utils';

describe('DriverOnboardingService', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteDriver', () => {
    it('should create onboarding and invitation with 15-day expiry', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue(null);
      prisma.driverOnboarding.create.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'DRAFT',
        complianceScore: 'NON_COMPLIANT',
      });
      prisma.invitation.create.mockResolvedValue({
        id: 'inv-1',
        token: 'test-token-uuid',
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
      });

      const result = await service.inviteDriver(TEST_COMPANY.id, 'admin-1', {
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '7777777777',
      });

      expect(result.onboardingId).toBe('onb-1');
      expect(result.token).toBeDefined();
      expect(result.status).toBe('DRAFT');
      expect(result.inviteLink).toContain('/driver/onboard/');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DRIVER_INVITED' }));
    });

    it('should throw ConflictException for duplicate active invite', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'DRAFT',
        mobileNumber: '7777777777',
      });

      await expect(
        service.inviteDriver(TEST_COMPANY.id, 'admin-1', {
          firstName: 'John',
          lastName: 'Doe',
          mobileNumber: '7777777777',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getOnboardingByToken', () => {
    it('should return onboarding status with days remaining', async () => {
      const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'valid-token',
        status: 'PENDING',
        expiresAt,
        companyId: TEST_COMPANY.id,
        email: 'driver@test.com',
      });
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '7777777777',
        status: 'DRAFT',
        complianceScore: 'NON_COMPLIANT',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([]);

      const result = await service.getOnboardingByToken('valid-token');

      expect(result.driverId).toBe('DRV-001');
      expect(result.status).toBe('DRAFT');
      expect(result.daysRemaining).toBeGreaterThan(0);
      expect(result.daysRemaining).toBeLessThanOrEqual(10);
    });

    it('should throw NotFoundException for invalid token', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.getOnboardingByToken('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('should auto-expire and throw for expired token', async () => {
      const pastDate = new Date(Date.now() - 1000);
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
        expect.objectContaining({ data: expect.objectContaining({ status: 'EXPIRED' }) }),
      );
    });

    it('should reject REVOKED invitations', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'revoked-token',
        status: 'REVOKED',
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.getOnboardingByToken('revoked-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadDocument', () => {
    it('should create document and transition DRAFT to DOCUMENTS_PENDING', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'valid-token',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
        companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'DRAFT',
      });
      prisma.complianceDocument.create.mockResolvedValue({
        id: 'doc-1',
        documentType: 'DRIVING_LICENSE',
        status: 'UPLOADED',
        verificationStatus: 'PENDING',
      });
      prisma.driverOnboarding.update.mockResolvedValue({
        id: 'onb-1',
        status: 'DOCUMENTS_PENDING',
      });

      const result = await service.uploadDocument('valid-token', {
        documentType: 'DRIVING_LICENSE',
        fileUrl: '/files/license.pdf',
      });

      expect(result.documentId).toBe('doc-1');
      expect(result.status).toBe('UPLOADED');
      expect(prisma.driverOnboarding.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DOCUMENTS_PENDING' }) }),
      );
    });

    it('should reject expired token on upload', async () => {
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

  describe('submitForReview', () => {
    it('should transition to UNDER_REVIEW when documents exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'valid-token',
        status: 'PENDING',
        companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'DOCUMENTS_PENDING',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([{ id: 'doc-1' }]);
      prisma.driverOnboarding.update.mockResolvedValue({
        id: 'onb-1',
        status: 'UNDER_REVIEW',
      });

      const result = await service.submitForReview('valid-token');
      expect(result.status).toBe('UNDER_REVIEW');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DRIVER_ONBOARDING_SUBMITTED' }));
    });

    it('should reject if no documents uploaded', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'valid-token',
        status: 'PENDING',
        companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'DRAFT',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([]);

      await expect(service.submitForReview('valid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listPendingOnboardings', () => {
    it('should return pending onboardings', async () => {
      prisma.driverOnboarding.findMany.mockResolvedValue([
        { id: 'onb-1', status: 'DRAFT' },
        { id: 'onb-2', status: 'UNDER_REVIEW' },
      ]);

      const result = await service.listPendingOnboardings(TEST_COMPANY.id);
      expect(result).toHaveLength(2);
    });
  });

  describe('verifyOnboarding', () => {
    it('should transition UNDER_REVIEW to ACTIVE', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'UNDER_REVIEW',
        companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.update.mockResolvedValue({
        id: 'onb-1',
        status: 'ACTIVE',
        complianceScore: 'COMPLIANT',
      });
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyOnboarding(TEST_COMPANY.id, 'admin-1', 'DRV-001');
      expect(result.status).toBe('ACTIVE');
      expect(result.complianceScore).toBe('COMPLIANT');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DRIVER_ONBOARDING_VERIFIED' }));
    });

    it('should reject verification if not UNDER_REVIEW', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'DRAFT',
        companyId: TEST_COMPANY.id,
      });

      await expect(service.verifyOnboarding(TEST_COMPANY.id, 'admin-1', 'DRV-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectOnboarding', () => {
    it('should reject from any status', async () => {
      prisma.driverOnboarding.findFirst.mockResolvedValue({
        id: 'onb-1',
        driverId: 'DRV-001',
        status: 'DRAFT',
        companyId: TEST_COMPANY.id,
      });
      prisma.driverOnboarding.update.mockResolvedValue({
        id: 'onb-1',
        status: 'REJECTED',
      });
      prisma.invitation.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.rejectOnboarding(TEST_COMPANY.id, 'admin-1', 'DRV-001', 'Invalid documents');
      expect(result.status).toBe('REJECTED');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DRIVER_ONBOARDING_REJECTED' }));
    });
  });
});
