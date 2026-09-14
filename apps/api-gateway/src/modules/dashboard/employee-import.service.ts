import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class EmployeeImportService {
  private readonly logger = new Logger(EmployeeImportService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createImportJob(companyId: string, data: { importJobName: string; fileName: string; fileSize?: number; importConfig?: any }, importedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const job = await this.prisma.employeeCSVImport.create({
      data: { companyId, importJobName: data.importJobName, fileName: data.fileName, fileSize: data.fileSize, importConfig: data.importConfig || {}, importedBy },
    });
    await this.audit.log({ companyId, userId: importedBy, action: 'IMPORT_JOB_CREATED', entity: 'EmployeeCSVImport', entityId: job.id });
    return job;
  }

  async validateImport(companyId: string, jobId: string, rows: any[]) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    let valid = 0; let errors = 0;
    const errorRows: any[] = [];
    for (const row of rows) {
      const rowNum = rows.indexOf(row) + 1;
      const rowErrors: string[] = [];
      if (!row.employeeId) rowErrors.push('Employee ID required');
      if (!row.employeeName) rowErrors.push('Name required');
      if (!row.phone && !row.email) rowErrors.push('Phone or email required');
      if (rowErrors.length > 0) {
        errors++;
        errorRows.push({ rowNumber: rowNum, errors: rowErrors, data: row });
      } else {
        valid++;
        await this.prisma.employeeCSVRow.create({
          data: { importJobId: jobId, companyId, rowNumber: rowNum, employeeId: row.employeeId, employeeName: row.employeeName, email: row.email, phone: row.phone, department: row.department, designation: row.designation, businessUnit: row.businessUnit, costCenter: row.costCenter, teamName: row.teamName, managerId: row.managerId, officeLocation: row.officeLocation, shiftTiming: row.shiftTiming, pickupAddress: row.pickupAddress, dropAddress: row.dropAddress, gender: row.gender, status: 'VALIDATED' },
        });
      }
    }
    await this.prisma.employeeCSVImport.update({ where: { id: jobId }, data: { status: errors > 0 ? 'PARTIAL' : 'VALIDATED', totalRows: rows.length, processedRows: rows.length, successRows: valid, failedRows: errors, validationErrors: JSON.stringify(errorRows) } });
    return { valid, errors, errorRows };
  }

  async processImport(companyId: string, jobId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const rows = await this.prisma.employeeCSVRow.findMany({ where: { importJobId: jobId, status: 'VALIDATED' } });
    let imported = 0;
    for (const row of rows) {
      try {
        await this.prisma.employeeOnboarding.create({
          data: { companyId, employeeId: row.employeeId || '', firstName: row.employeeName || '', lastName: '', email: row.email || '', department: row.department || '', designation: row.designation || '' },
        });
        await this.prisma.employeeCSVRow.update({ where: { id: row.id }, data: { status: 'IMPORTED' } });
        imported++;
      } catch (err) {
        await this.prisma.employeeCSVRow.update({ where: { id: row.id }, data: { status: 'FAILED', errors: JSON.stringify([String(err)]) } });
      }
    }
    await this.prisma.employeeCSVImport.update({ where: { id: jobId }, data: { status: 'COMPLETED', successRows: imported, completedAt: new Date() } });
    await this.audit.log({ companyId, userId: 'system', action: 'IMPORT_COMPLETED', entity: 'EmployeeCSVImport', entityId: jobId, newValue: { imported } });
    return { imported, total: rows.length };
  }

  async getImportJobs(companyId: string, params?: { page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([this.prisma.employeeCSVImport.findMany({ where: { companyId }, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.employeeCSVImport.count({ where: { companyId } })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getImportRows(companyId: string, jobId: string, params?: { status?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { importJobId: jobId, companyId };
    if (params?.status) where.status = params.status.toUpperCase();
    const [data, total] = await Promise.all([this.prisma.employeeCSVRow.findMany({ where, skip, take: limit, orderBy: { rowNumber: 'asc' } }), this.prisma.employeeCSVRow.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
