import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DriverOnboardingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // INVITE DRIVER
  // ============================================================

  async inviteDriver(companyId: string, performedBy: string, data: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
    email?: string;
    vendorId?: string;
    licenseNo?: string;
    licenseExpiry?: string;
    joiningDate?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const existing = await this.prisma.driverOnboarding.findFirst({
      where: { companyId, mobileNumber: data.mobileNumber, status: { notIn: ['REJECTED', 'EXPIRED'] } },
    });
    if (existing) {
      throw new ConflictException(`Driver with mobile ${data.mobileNumber} already has an active onboarding (status: ${existing.status})`);
    }

    const driverId = `DRV-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    const onboarding = await this.prisma.driverOnboarding.create({
      data: {
        companyId,
        driverId,
        vendorId: data.vendorId,
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        email: data.email,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
        status: 'DRAFT',
        complianceScore: 'NON_COMPLIANT',
      },
    });

    await this.prisma.invitation.create({
      data: {
        companyId,
        email: data.email || `${data.mobileNumber}@driver.invite`,
        role: 'DRIVER',
        token,
        status: 'PENDING',
        invitedById: performedBy,
        expiresAt,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_INVITED',
      entity: 'DriverOnboarding', entityId: onboarding.id,
      newValue: { firstName: data.firstName, lastName: data.lastName, mobileNumber: data.mobileNumber, expiresAt },
    });

    return {
      onboardingId: onboarding.id,
      driverId,
      token,
      status: onboarding.status,
      expiresAt,
      inviteLink: `/driver/onboard/${token}`,
    };
  }

  // ============================================================
  // DRIVER ONBOARDING (token-based, no auth required)
  // ============================================================

  async getOnboardingByToken(token: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invalid or expired invitation');
    if (invitation.status === 'EXPIRED' || invitation.status === 'REVOKED') {
      throw new BadRequestException(`Invitation is ${invitation.status.toLowerCase()}`);
    }
    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Invitation has expired');
    }

    const onboarding = await this.prisma.driverOnboarding.findFirst({
      where: { companyId: invitation.companyId, email: invitation.email },
      orderBy: { createdAt: 'desc' },
    });
    if (!onboarding) throw new NotFoundException('Onboarding record not found');

    const documents = await this.prisma.complianceDocument.findMany({
      where: { entityType: 'DRIVER', entityId: onboarding.driverId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      driverId: onboarding.driverId,
      firstName: onboarding.firstName,
      lastName: onboarding.lastName,
      mobileNumber: onboarding.mobileNumber,
      email: onboarding.email,
      status: onboarding.status,
      complianceScore: onboarding.complianceScore,
      documents: documents.map(d => ({
        id: d.id,
        documentType: d.documentType,
        status: d.status,
        verificationStatus: d.verificationStatus,
        fileUrl: d.fileUrl,
        expiryDate: d.expiryDate,
      })),
      expiresAt: invitation.expiresAt,
      daysRemaining: Math.max(0, Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    };
  }

  // ============================================================
  // DRIVER DOCUMENT UPLOAD
  // ============================================================

  async uploadDocument(token: string, data: {
    documentType: string;
    fileUrl: string;
    documentDate?: string;
    expiryDate?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== 'PENDING') throw new NotFoundException('Invalid invitation');
    if (new Date() > invitation.expiresAt) throw new BadRequestException('Invitation has expired');

    const onboarding = await this.prisma.driverOnboarding.findFirst({
      where: { companyId: invitation.companyId, email: invitation.email },
      orderBy: { createdAt: 'desc' },
    });
    if (!onboarding) throw new NotFoundException('Onboarding not found');

    const document = await this.prisma.complianceDocument.create({
      data: {
        entityType: 'DRIVER',
        entityId: onboarding.driverId,
        companyId: invitation.companyId,
        documentType: data.documentType as any,
        fileName: `${data.documentType}_${Date.now()}.jpg`,
        fileUrl: data.fileUrl,
        status: 'UPLOADED',
        verificationStatus: 'PENDING',
        issueDate: data.documentDate ? new Date(data.documentDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });

    if (onboarding.status === 'DRAFT') {
      await this.prisma.driverOnboarding.update({
        where: { driverId: onboarding.driverId },
        data: { status: 'DOCUMENTS_PENDING' },
      });
    }

    await this.audit.log({
      companyId: invitation.companyId, userId: onboarding.driverId, action: 'DRIVER_DOCUMENT_UPLOADED',
      entity: 'ComplianceDocument', entityId: document.id,
      newValue: { documentType: data.documentType, driverId: onboarding.driverId },
    });

    return { documentId: document.id, status: document.status, verificationStatus: document.verificationStatus };
  }

  // ============================================================
  // SUBMIT FOR REVIEW
  // ============================================================

  async submitForReview(token: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invalid invitation');

    const onboarding = await this.prisma.driverOnboarding.findFirst({
      where: { companyId: invitation.companyId, email: invitation.email },
      orderBy: { createdAt: 'desc' },
    });
    if (!onboarding) throw new NotFoundException('Onboarding not found');

    const docs = await this.prisma.complianceDocument.findMany({
      where: { entityType: 'DRIVER', entityId: onboarding.driverId },
    });
    if (docs.length === 0) {
      throw new BadRequestException('At least one document must be uploaded before submitting');
    }

    const updated = await this.prisma.driverOnboarding.update({
      where: { driverId: onboarding.driverId },
      data: { status: 'UNDER_REVIEW' },
    });

    await this.audit.log({
      companyId: invitation.companyId, userId: onboarding.driverId, action: 'DRIVER_ONBOARDING_SUBMITTED',
      entity: 'DriverOnboarding', entityId: onboarding.id,
      newValue: { documentCount: docs.length },
    });

    return { status: updated.status, driverId: onboarding.driverId };
  }

  // ============================================================
  // ADMIN: LIST PENDING ONBOARDINGS
  // ============================================================

  async listPendingOnboardings(companyId: string) {
    if (!this.prisma.isConnected()) return [];

    return this.prisma.driverOnboarding.findMany({
      where: { companyId, status: { in: ['DRAFT', 'DOCUMENTS_PENDING', 'UNDER_REVIEW'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================================
  // ADMIN: VERIFY / REJECT ONBOARDING
  // ============================================================

  async verifyOnboarding(companyId: string, performedBy: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const onboarding = await this.prisma.driverOnboarding.findFirst({
      where: { driverId, companyId },
    });
    if (!onboarding) throw new NotFoundException('Onboarding not found');
    if (onboarding.status !== 'UNDER_REVIEW') {
      throw new BadRequestException(`Cannot verify onboarding in status "${onboarding.status}"`);
    }

    // Create DriverProfile so the driver is visible to the fleet system
    const existingProfile = await this.prisma.driverProfile.findFirst({
      where: { companyId, userId: onboarding.driverId },
    });

    if (!existingProfile) {
      await this.prisma.driverProfile.create({
        data: {
          userId: onboarding.driverId,
          companyId,
          vendorId: onboarding.vendorId || null,
          licenseNo: 'PENDING',
          licenseExpiry: new Date(Date.now() + 365 * 86400000),
          status: 'ACTIVE',
          availabilityStatus: 'OFF_DUTY',
          verificationStatus: 'VERIFIED',
          rating: 5.0,
          totalTrips: 0,
        },
      });
    } else {
      // Update existing profile to ACTIVE/VERIFIED
      await this.prisma.driverProfile.update({
        where: { id: existingProfile.id },
        data: { status: 'ACTIVE', verificationStatus: 'VERIFIED' },
      });
    }

    const updated = await this.prisma.driverOnboarding.update({
      where: { driverId },
      data: { status: 'ACTIVE', complianceScore: 'COMPLIANT' },
    });

    await this.prisma.invitation.updateMany({
      where: { companyId, email: onboarding.email || undefined, status: 'PENDING' },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_ONBOARDING_VERIFIED',
      entity: 'DriverOnboarding', entityId: onboarding.id,
      newValue: { driverId, firstName: onboarding.firstName, lastName: onboarding.lastName },
    });

    return { status: updated.status, driverId, complianceScore: updated.complianceScore };
  }

  async rejectOnboarding(companyId: string, performedBy: string, driverId: string, reason: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const onboarding = await this.prisma.driverOnboarding.findFirst({
      where: { driverId, companyId },
    });
    if (!onboarding) throw new NotFoundException('Onboarding not found');

    const updated = await this.prisma.driverOnboarding.update({
      where: { driverId },
      data: { status: 'REJECTED' },
    });

    await this.prisma.invitation.updateMany({
      where: { companyId, email: onboarding.email || undefined, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'DRIVER_ONBOARDING_REJECTED',
      entity: 'DriverOnboarding', entityId: onboarding.id,
      newValue: { driverId, reason },
    });

    return { status: updated.status, driverId, reason };
  }
}
