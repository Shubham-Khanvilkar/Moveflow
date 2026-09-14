import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class CompanyComplianceService {
  private readonly logger = new Logger(CompanyComplianceService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async getComplianceTeam(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.complianceTeam.findMany({ where: { companyId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async addTeamMember(companyId: string, data: { userId: string; role?: string; canApproveVehicles?: boolean; canApproveDrivers?: boolean; canApproveVendors?: boolean; canAuditDocuments?: boolean; canDelegateTasks?: boolean; canApproveCabs?: boolean; canManagePolicies?: boolean }, addedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const member = await this.prisma.complianceTeam.create({
      data: { companyId, ...data, assignedBy: addedBy },
    });
    await this.audit.log({ companyId, userId: addedBy, action: 'COMPLIANCE_MEMBER_ADDED', entity: 'ComplianceTeam', entityId: member.id });
    return member;
  }

  async removeTeamMember(companyId: string, memberId: string, removedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    await this.prisma.complianceTeam.update({ where: { id: memberId }, data: { isActive: false } });
    await this.audit.log({ companyId, userId: removedBy, action: 'COMPLIANCE_MEMBER_REMOVED', entity: 'ComplianceTeam', entityId: memberId });
    return { removed: true };
  }

  async getDocumentTypes(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const types = await this.prisma.companyDocumentType.findMany({ where: { companyId, isActive: true } });
    return types.length > 0 ? types : this.defaultDocTypes();
  }

  async createDocumentType(companyId: string, data: { documentType: string; displayName: string; description?: string; isMandatory?: boolean; forEntityType: string; validityDays?: number; alertBeforeDays?: number; renewalRequired?: boolean }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.companyDocumentType.create({ data: { companyId, ...data } });
  }

  async uploadDocument(companyId: string, data: { entityType: string; entityId: string; documentTypeId: string; documentType: string; fileName: string; fileUrl: string; fileSize?: number; mimeType?: string; documentNumber?: string; issuedDate?: string; expiryDate?: string; issuingAuthority?: string; metadata?: any }, uploadedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const doc = await this.prisma.companyComplianceDoc.create({
      data: {
        companyId, entityType: data.entityType, entityId: data.entityId, documentTypeId: data.documentTypeId,
        documentType: data.documentType, fileName: data.fileName, fileUrl: data.fileUrl, fileSize: data.fileSize,
        mimeType: data.mimeType, documentNumber: data.documentNumber, issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined, issuingAuthority: data.issuingAuthority,
        uploadedBy, metadata: data.metadata || {},
      },
    });
    await this.audit.log({ companyId, userId: uploadedBy, action: 'COMPLIANCE_DOC_UPLOADED', entity: 'CompanyComplianceDoc', entityId: doc.id });
    return doc;
  }

  async reviewDocument(companyId: string, docId: string, decision: string, reviewedBy: string, notes?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const doc = await this.prisma.companyComplianceDoc.findFirst({ where: { id: docId, companyId } });
    if (!doc) throw new NotFoundException('Document not found');
    const updated = await this.prisma.companyComplianceDoc.update({
      where: { id: docId },
      data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedBy, reviewedAt: new Date(), reviewNotes: notes, rejectionReason: decision === 'REJECT' ? notes : undefined },
    });
    await this.audit.log({ companyId, userId: reviewedBy, action: `COMPLIANCE_DOC_${decision.toUpperCase()}`, entity: 'CompanyComplianceDoc', entityId: docId });
    return updated;
  }

  async getDocuments(companyId: string, params?: { entityType?: string; entityId?: string; status?: string; documentType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.entityType) where.entityType = params.entityType;
    if (params?.entityId) where.entityId = params.entityId;
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.documentType) where.documentType = params.documentType;
    const [data, total] = await Promise.all([this.prisma.companyComplianceDoc.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.companyComplianceDoc.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createAudit(companyId: string, data: { auditType: string; entityType?: string; entityId?: string; priority?: string; isRandom?: boolean; notes?: string }, auditorId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const audit = await this.prisma.complianceAudit.create({
      data: { companyId, ...data, auditorId },
    });
    await this.audit.log({ companyId, userId: auditorId, action: 'COMPLIANCE_AUDIT_CREATED', entity: 'ComplianceAudit', entityId: audit.id });
    return audit;
  }

  async getAudits(companyId: string, params?: { status?: string; auditType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.auditType) where.auditType = params.auditType;
    const [data, total] = await Promise.all([this.prisma.complianceAudit.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.complianceAudit.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async completeAudit(companyId: string, auditId: string, data: { findings?: string; complianceScore?: number; issuesFound?: number; issuesList?: any[]; actionRequired?: boolean; actionDeadline?: string }, completedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const audit = await this.prisma.complianceAudit.update({
      where: { id: auditId }, data: { status: 'COMPLETED', ...data, actionDeadline: data.actionDeadline ? new Date(data.actionDeadline) : undefined },
    });
    await this.audit.log({ companyId, userId: completedBy, action: 'COMPLIANCE_AUDIT_COMPLETED', entity: 'ComplianceAudit', entityId: auditId });
    return audit;
  }

  async createTask(companyId: string, data: { taskType: string; title: string; description?: string; entityType?: string; entityId?: string; assignedTo?: string; assignedToRole?: string; priority?: string; dueDate?: string }, delegatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const task = await this.prisma.complianceTask.create({
      data: { companyId, ...data, delegatedBy, delegatedAt: new Date(), dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
    await this.audit.log({ companyId, userId: delegatedBy, action: 'COMPLIANCE_TASK_CREATED', entity: 'ComplianceTask', entityId: task.id });
    return task;
  }

  async delegateTask(companyId: string, taskId: string, assignTo: string, delegatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const task = await this.prisma.complianceTask.update({
      where: { id: taskId }, data: { assignedTo: assignTo, delegatedBy, delegatedAt: new Date() },
    });
    await this.audit.log({ companyId, userId: delegatedBy, action: 'COMPLIANCE_TASK_DELEGATED', entity: 'ComplianceTask', entityId: taskId, newValue: { assignTo } });
    return task;
  }

  async getTasks(companyId: string, params?: { assignedTo?: string; status?: string; taskType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.assignedTo) where.assignedTo = params.assignedTo;
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.taskType) where.taskType = params.taskType;
    const [data, total] = await Promise.all([this.prisma.complianceTask.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.complianceTask.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async completeTask(companyId: string, taskId: string, data: { result: string; notes?: string }, completedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.complianceTask.update({ where: { id: taskId }, data: { status: 'COMPLETED', result: data.result, notes: data.notes, completedAt: new Date(), completedBy } });
  }

  async createPolicy(companyId: string, data: { policyName: string; policyCode: string; category: string; description?: string; rules?: any[]; enforcementLevel?: string; applicableTo?: string; effectiveFrom?: string; effectiveTo?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.compliancePolicy.create({ data: { companyId, ...data, createdBy, effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(), effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined } });
  }

  async getPolicies(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.compliancePolicy.findMany({ where: { companyId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async requestCabApproval(companyId: string, data: { vehicleId: string; driverId?: string; vendorId?: string; requestType: string; metadata?: any }, requestedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const approval = await this.prisma.cabApproval.create({ data: { companyId, ...data, requestedBy } });
    await this.audit.log({ companyId, userId: requestedBy, action: 'CAB_APPROVAL_REQUESTED', entity: 'CabApproval', entityId: approval.id });
    return approval;
  }

  async reviewCabApproval(companyId: string, approvalId: string, decision: string, reviewedBy: string, data?: { complianceCheck?: boolean; documentsVerified?: boolean; vehicleInspected?: boolean; driverVerified?: boolean; insuranceValid?: boolean; pucValid?: boolean; permitValid?: boolean; fitnessValid?: boolean; reviewNotes?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.cabApproval.update({
      where: { id: approvalId },
      data: { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', reviewedBy, reviewedAt: new Date(), ...data },
    });
    await this.audit.log({ companyId, userId: reviewedBy, action: `CAB_APPROVAL_${decision.toUpperCase()}`, entity: 'CabApproval', entityId: approvalId });
    return updated;
  }

  async getCabApprovals(companyId: string, params?: { status?: string; requestType?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.requestType) where.requestType = params.requestType;
    const [data, total] = await Promise.all([this.prisma.cabApproval.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.cabApproval.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getComplianceStanding(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    let standing = await this.prisma.companyComplianceStanding.findFirst({ where: { companyId } });
    if (!standing) {
      standing = await this.prisma.companyComplianceStanding.create({ data: { companyId } });
    }
    return standing;
  }

  async refreshComplianceScore(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const totalDocs = await this.prisma.companyComplianceDoc.count({ where: { companyId } });
    const validDocs = await this.prisma.companyComplianceDoc.count({ where: { companyId, status: 'APPROVED' } });
    const expiringDocs = await this.prisma.companyComplianceDoc.count({ where: { companyId, status: 'PENDING' } });
    const expiredDocs = await this.prisma.companyComplianceDoc.count({ where: { companyId, status: 'REJECTED' } });
    const totalVehicles = await this.prisma.vehicleManagement.count({ where: { companyId, status: 'ACTIVE' } });
    const totalDrivers = await this.prisma.driverManagement.count({ where: { companyId, status: 'ACTIVE' } });

    const docScore = totalDocs > 0 ? (validDocs / totalDocs) * 100 : 100;
    const overallScore = Math.round(docScore * 100) / 100;
    const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 40 ? 'D' : 'F';

    const standing = await this.prisma.companyComplianceStanding.upsert({
      where: { companyId },
      update: { overallScore, overallGrade: grade, documentCompliance: docScore, totalDocuments: totalDocs, validDocuments: validDocs, expiringDocuments: expiringDocs, expiredDocuments: expiredDocs, totalVehicles, totalDrivers, lastAuditDate: new Date(), lastAuditScore: overallScore },
      create: { companyId, overallScore, overallGrade: grade, documentCompliance: docScore, totalDocuments: totalDocs, validDocuments: validDocs, expiringDocuments: expiringDocs, expiredDocuments: expiredDocs, totalVehicles, totalDrivers, lastAuditDate: new Date(), lastAuditScore: overallScore },
    });
    return standing;
  }

  private defaultDocTypes() {
    return [
      { documentType: 'LICENSE', displayName: 'Driving License', forEntityType: 'DRIVER', isMandatory: true, alertBeforeDays: 30 },
      { documentType: 'INSURANCE', displayName: 'Vehicle Insurance', forEntityType: 'VEHICLE', isMandatory: true, alertBeforeDays: 30 },
      { documentType: 'PUC', displayName: 'PUC Certificate', forEntityType: 'VEHICLE', isMandatory: true, alertBeforeDays: 15 },
      { documentType: 'PERMIT', displayName: 'Vehicle Permit', forEntityType: 'VEHICLE', isMandatory: true, alertBeforeDays: 30 },
      { documentType: 'FITNESS', displayName: 'Fitness Certificate', forEntityType: 'VEHICLE', isMandatory: true, alertBeforeDays: 30 },
      { documentType: 'RC', displayName: 'Registration Certificate', forEntityType: 'VEHICLE', isMandatory: true, alertBeforeDays: 60 },
      { documentType: 'AADHAR', displayName: 'Aadhar Card', forEntityType: 'DRIVER', isMandatory: false },
      { documentType: 'PAN', displayName: 'PAN Card', forEntityType: 'DRIVER', isMandatory: false },
    ];
  }
}