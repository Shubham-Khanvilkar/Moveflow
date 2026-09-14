import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import {
  UploadDocumentDto,
  VerifyDocumentDto,
  RejectDocumentDto,
  ReplaceDocumentDto,
  DocumentQueryDto,
} from './dto';

@Injectable()
export class DocumentManagementService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async upload(companyId: string, dto: UploadDocumentDto, userId: string) {
    // Check for existing active document of same type for same owner
    const existing = await this.prisma.complianceDocument.findFirst({
      where: {
        companyId,
        entityType: dto.ownerType as any,
        entityId: dto.ownerId,
        documentType: dto.documentType as any,
        status: { notIn: ['REJECTED', 'SUPERSEDED'] as any[] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `An active document of type ${dto.documentType} already exists for this ${dto.ownerType}. Use replace instead.`,
      );
    }

    const document = await this.prisma.complianceDocument.create({
      data: {
        companyId,
        entityType: dto.ownerType as any,
        entityId: dto.ownerId,
        documentType: dto.documentType as any,
        documentNumber: dto.documentNumber,
        issuingAuthority: dto.issuingAuthority,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        fileType: dto.mimeType,
        status: 'UPLOADED',
        uploadedById: userId,
      },
    });

    await this.audit.log({
      userId,
      action: 'DOCUMENT_UPLOADED',
      entity: 'ComplianceDocument',
      entityId: document.id,
      companyId,
      newValue: {
        ownerType: dto.ownerType,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
      },
    });

    return document;
  }

  async findAll(companyId: string, query: DocumentQueryDto) {
    const { ownerType, ownerId, documentType, status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (ownerType) where.entityType = ownerType;
    if (ownerId) where.entityId = ownerId;
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.complianceDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.complianceDocument.count({ where }),
    ]);

    return {
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(companyId: string, documentId: string) {
    const document = await this.prisma.complianceDocument.findFirst({
      where: { id: documentId, companyId },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async verify(companyId: string, documentId: string, dto: VerifyDocumentDto, userId: string) {
    const document = await this.findById(companyId, documentId);
    if ((document.status as any) !== 'PENDING') {
      throw new BadRequestException(`Cannot verify document in ${document.status} status`);
    }

    const updated = await this.prisma.complianceDocument.update({
      where: { id: documentId },
      data: {
        status: 'VERIFIED',
        verifiedById: userId,
        verifiedAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      action: 'DOCUMENT_VERIFIED',
      entity: 'ComplianceDocument',
      entityId: documentId,
      companyId,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'VERIFIED' },
    });

    return updated;
  }

  async reject(companyId: string, documentId: string, dto: RejectDocumentDto, userId: string) {
    const document = await this.findById(companyId, documentId);
    if ((document.status as any) !== 'PENDING') {
      throw new BadRequestException(`Cannot reject document in ${document.status} status`);
    }

    const updated = await this.prisma.complianceDocument.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.reason,
        rejectedById: userId,
        rejectedAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      action: 'DOCUMENT_REJECTED',
      entity: 'ComplianceDocument',
      entityId: documentId,
      companyId,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'REJECTED', reason: dto.reason },
    });

    return updated;
  }

  async replace(companyId: string, documentId: string, dto: ReplaceDocumentDto, userId: string) {
    const document = await this.findById(companyId, documentId);

    // Mark old document as REPLACED
    await this.prisma.complianceDocument.update({
      where: { id: documentId },
      data: { status: 'SUPERSEDED' },
    });

    // Create new version
    const newDocument = await this.prisma.complianceDocument.create({
      data: {
        companyId,
        entityType: document.entityType,
        entityId: document.entityId,
        documentType: document.documentType,
        documentNumber: dto.documentNumber || document.documentNumber,
        issuingAuthority: document.issuingAuthority,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : document.issueDate,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : document.expiryDate,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        fileType: dto.mimeType,
        status: 'UPLOADED',
        uploadedById: userId,
      },
    });

    await this.audit.log({
      userId,
      action: 'DOCUMENT_REPLACED',
      entity: 'ComplianceDocument',
      entityId: documentId,
      companyId,
      newValue: { newDocumentId: newDocument.id },
    });

    return newDocument;
  }

  async archive(companyId: string, documentId: string, userId: string) {
    const document = await this.findById(companyId, documentId);

    const updated = await this.prisma.complianceDocument.update({
      where: { id: documentId },
      data: { status: 'SUPERSEDED' },
    });

    await this.audit.log({
      userId,
      action: 'DOCUMENT_ARCHIVED',
      entity: 'ComplianceDocument',
      entityId: documentId,
      companyId,
      oldValue: { status: document.status },
      newValue: { status: 'SUPERSEDED' },
    });

    return updated;
  }

  async getExpiringDocuments(companyId: string, daysUntilExpiry: number = 30) {
    const expiryDate = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000);

    return this.prisma.complianceDocument.findMany({
      where: {
        companyId,
        status: 'VERIFIED',
        expiryDate: { lte: expiryDate, gte: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getExpiredDocuments(companyId: string) {
    return this.prisma.complianceDocument.findMany({
      where: {
        companyId,
        status: 'VERIFIED',
        expiryDate: { lt: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
