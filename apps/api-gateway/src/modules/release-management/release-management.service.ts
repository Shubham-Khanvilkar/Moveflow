import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { v4 as uuidv4 } from 'uuid';

export class CreateReleaseDto {
  version: string;
  description?: string;
  changeRequest?: string;
  riskAssessment?: string;
  affectedTenants?: string[];
  codeVersion?: string;
  commitSha?: string;
  migrationPlan?: string;
  rollbackPlan?: string;
  testEvidence?: string;
  featureFlags?: string[];
}

export class RollbackReleaseDto {
  releaseId: string;
  reason: string;
  rollbackType: 'APPLICATION_RELEASE' | 'FEATURE_FLAG' | 'CONFIGURATION' | 'SCHEMA' | 'DATA_CORRECTION';
}

@Injectable()
export class ReleaseManagementService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createRelease(dto: CreateReleaseDto, userId: string, companyId: string) {
    const releaseCode = `REL-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const release = await this.prisma.releaseRecord.create({
      data: {
        releaseCode,
        version: dto.version,
        description: dto.description,
        changeRequest: dto.changeRequest,
        riskAssessment: dto.riskAssessment,
        affectedTenants: dto.affectedTenants || [],
        codeVersion: dto.codeVersion,
        commitSha: dto.commitSha,
        migrationPlan: dto.migrationPlan,
        rollbackPlan: dto.rollbackPlan,
        testEvidence: dto.testEvidence,
        featureFlags: dto.featureFlags || [],
        status: 'PENDING',
        initiatedBy: userId,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'RELEASE_CREATED',
      entity: 'ReleaseRecord',
      entityId: release.id,
      newValue: { releaseCode, version: dto.version },
    });

    return release;
  }

  async approveRelease(releaseId: string, userId: string, companyId: string) {
    const release = await this.findById(releaseId);
    if (release.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve release in ${release.status} status`);
    }

    const updated = await this.prisma.releaseRecord.update({
      where: { id: releaseId },
      data: { status: 'APPROVED', approvedBy: userId },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'RELEASE_APPROVED',
      entity: 'ReleaseRecord',
      entityId: releaseId,
    });

    return updated;
  }

  async deployRelease(releaseId: string, userId: string, companyId: string) {
    const release = await this.findById(releaseId);
    if (release.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot deploy release in ${release.status} status`);
    }

    const updated = await this.prisma.releaseRecord.update({
      where: { id: releaseId },
      data: { status: 'DEPLOYING', deployedAt: new Date() },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'RELEASE_DEPLOYED',
      entity: 'ReleaseRecord',
      entityId: releaseId,
    });

    return updated;
  }

  async verifyRelease(releaseId: string, userId: string, companyId: string) {
    const release = await this.findById(releaseId);
    if (release.status !== 'DEPLOYING') {
      throw new BadRequestException(`Cannot verify release in ${release.status} status`);
    }

    const updated = await this.prisma.releaseRecord.update({
      where: { id: releaseId },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'RELEASE_VERIFIED',
      entity: 'ReleaseRecord',
      entityId: releaseId,
    });

    return updated;
  }

  async rollback(dto: RollbackReleaseDto, userId: string, companyId: string) {
    const release = await this.findById(dto.releaseId);
    if (!['DEPLOYED', 'VERIFIED', 'DEPLOYING'].includes(release.status)) {
      throw new BadRequestException(`Cannot rollback release in ${release.status} status`);
    }

    const [rollbackRecord] = await this.prisma.$transaction([
      this.prisma.rollbackRecord.create({
        data: {
          releaseId: dto.releaseId,
          reason: dto.reason,
          rollbackType: dto.rollbackType,
          initiatedBy: userId,
          status: 'EXECUTED',
          executedAt: new Date(),
        },
      }),
      this.prisma.releaseRecord.update({
        where: { id: dto.releaseId },
        data: { status: 'ROLLED_BACK', rolledBackAt: new Date() },
      }),
    ]);

    await this.audit.log({
      companyId,
      userId,
      action: 'RELEASE_ROLLED_BACK',
      entity: 'ReleaseRecord',
      entityId: dto.releaseId,
      newValue: { reason: dto.reason, rollbackType: dto.rollbackType },
    });

    return rollbackRecord;
  }

  async findAll() {
    return this.prisma.releaseRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: { Rollbacks: true },
    });
  }

  async findById(id: string) {
    const release = await this.prisma.releaseRecord.findUnique({
      where: { id },
      include: { Rollbacks: true },
    });
    if (!release) throw new NotFoundException('Release not found');
    return release;
  }

  async getLatestRelease() {
    return this.prisma.releaseRecord.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { status: 'VERIFIED' },
    });
  }
}
