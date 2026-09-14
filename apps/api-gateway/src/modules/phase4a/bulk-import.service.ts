import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as bcrypt from 'bcryptjs';

interface ImportRow {
  rowNumber: number;
  employeeId: string;
  fullName: string;
  workEmail: string;
  mobileNumber: string;
  level?: string;
  department?: string;
  businessUnit?: string;
  costCenter?: string;
  managerEmployeeId?: string;
  teamLeaderEmployeeId?: string;
  officeCode?: string;
  shiftCode?: string;
  transportEligibility?: string;
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupLandmark?: string;
  pickupLocationType?: string;
  dropAddress?: string;
  dropLatitude?: number;
  dropLongitude?: number;
  dropLandmark?: string;
  dropLocationType?: string;
  nodalPointCode?: string;
  emergencyContactName?: string;
  emergencyContactMobile?: string;
  cabAllowed?: string;
  shuttleAllowed?: string;
  nodalTransportAllowed?: string;
  acAllowed?: string;
  transportLimit?: number;
  status?: string;
}

export interface ImportError {
  rowNumber: number;
  employeeId: string;
  field: string;
  errorCode: string;
  errorMessage: string;
}

export interface ImportResult {
  importId: string;
  status: string;
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  warnings: number;
  errors: ImportError[];
  dryRun?: boolean;
}

@Injectable()
export class BulkImportService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // CSV PARSING (simple CSV parser - no external dependency)
  // ============================================================

  parseCSV(csvContent: string): ImportRow[] {
    const lines = csvContent.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = { rowNumber: i + 1 };

      headers.forEach((header, idx) => {
        const val = (values[idx] || '').trim();
        row[header] = val || undefined;
      });

      // Convert numeric fields
      if (row.pickup_latitude) row.pickup_latitude = parseFloat(row.pickup_latitude);
      if (row.pickup_longitude) row.pickup_longitude = parseFloat(row.pickup_longitude);
      if (row.drop_latitude) row.drop_latitude = parseFloat(row.drop_latitude);
      if (row.drop_longitude) row.drop_longitude = parseFloat(row.drop_longitude);
      if (row.transport_limit) row.transport_limit = parseFloat(row.transport_limit);

      rows.push(row);
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  async validateRows(companyId: string, rows: ImportRow[]): Promise<{
    validRows: ImportRow[];
    errors: ImportError[];
    warnings: ImportError[];
  }> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];
    const validRows: ImportRow[] = [];
    const seenEmployeeIds = new Set<string>();
    const seenEmails = new Set<string>();

    for (const row of rows) {
      let hasError = false;

      // Required fields
      if (!row.employeeId) {
        errors.push({ rowNumber: row.rowNumber, employeeId: '', field: 'employee_id', errorCode: 'REQUIRED_FIELD_MISSING', errorMessage: 'employee_id is required' });
        hasError = true;
      }
      if (!row.fullName) {
        errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId || '', field: 'full_name', errorCode: 'REQUIRED_FIELD_MISSING', errorMessage: 'full_name is required' });
        hasError = true;
      }
      if (!row.workEmail) {
        errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId || '', field: 'work_email', errorCode: 'REQUIRED_FIELD_MISSING', errorMessage: 'work_email is required' });
        hasError = true;
      } else if (!this.isValidEmail(row.workEmail)) {
        errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'work_email', errorCode: 'INVALID_EMAIL', errorMessage: `Invalid email format: ${row.workEmail}` });
        hasError = true;
      }
      if (!row.mobileNumber) {
        errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId || '', field: 'mobile_number', errorCode: 'REQUIRED_FIELD_MISSING', errorMessage: 'mobile_number is required' });
        hasError = true;
      }

      // Duplicate detection within file
      if (row.employeeId) {
        if (seenEmployeeIds.has(row.employeeId)) {
          errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'employee_id', errorCode: 'DUPLICATE_IN_FILE', errorMessage: `Duplicate employee_id "${row.employeeId}" in import file` });
          hasError = true;
        }
        seenEmployeeIds.add(row.employeeId);
      }
      if (row.workEmail) {
        const normalizedEmail = row.workEmail.toLowerCase();
        if (seenEmails.has(normalizedEmail)) {
          errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'work_email', errorCode: 'DUPLICATE_EMAIL_IN_FILE', errorMessage: `Duplicate email "${row.workEmail}" in import file` });
          hasError = true;
        }
        seenEmails.add(normalizedEmail);
      }

      // Validate coordinates
      if (row.pickupLatitude !== undefined) {
        if (row.pickupLatitude < -90 || row.pickupLatitude > 90) {
          errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'pickup_latitude', errorCode: 'INVALID_COORDINATE', errorMessage: `Invalid latitude: ${row.pickupLatitude}` });
          hasError = true;
        }
      }
      if (row.pickupLongitude !== undefined) {
        if (row.pickupLongitude < -180 || row.pickupLongitude > 180) {
          errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'pickup_longitude', errorCode: 'INVALID_COORDINATE', errorMessage: `Invalid longitude: ${row.pickupLongitude}` });
          hasError = true;
        }
      }
      if (row.dropLatitude !== undefined) {
        if (row.dropLatitude < -90 || row.dropLatitude > 90) {
          errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'drop_latitude', errorCode: 'INVALID_COORDINATE', errorMessage: `Invalid latitude: ${row.dropLatitude}` });
          hasError = true;
        }
      }
      if (row.dropLongitude !== undefined) {
        if (row.dropLongitude < -180 || row.dropLongitude > 180) {
          errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'drop_longitude', errorCode: 'INVALID_COORDINATE', errorMessage: `Invalid longitude: ${row.dropLongitude}` });
          hasError = true;
        }
      }

      // Validate transport eligibility
      const validEligibilities = ['TRANSPORT_ACTIVE', 'TRANSPORT_SUSPENDED', 'TRANSPORT_INACTIVE'];
      if (row.transportEligibility && !validEligibilities.includes(row.transportEligibility)) {
        errors.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'transport_eligibility', errorCode: 'INVALID_VALUE', errorMessage: `Invalid transport eligibility: ${row.transportEligibility}. Must be one of: ${validEligibilities.join(', ')}` });
        hasError = true;
      }

      // Validate location type
      const validLocationTypes = ['HOME', 'OFFICE', 'NODAL', 'CUSTOM'];
      if (row.pickupLocationType && !validLocationTypes.includes(row.pickupLocationType)) {
        warnings.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field: 'pickup_location_type', errorCode: 'INVALID_VALUE', errorMessage: `Invalid location type: ${row.pickupLocationType}. Defaulting to HOME` });
      }

      // Validate boolean fields
      const boolFields = ['cab_allowed', 'shuttle_allowed', 'nodal_transport_allowed', 'ac_allowed'];
      for (const field of boolFields) {
        const val = row[field as keyof ImportRow];
        if (val && !['true', 'false', '1', '0', 'yes', 'no'].includes(String(val).toLowerCase())) {
          warnings.push({ rowNumber: row.rowNumber, employeeId: row.employeeId, field, errorCode: 'INVALID_BOOLEAN', errorMessage: `Invalid boolean value for ${field}: ${val}. Defaulting to true` });
        }
      }

      if (!hasError) {
        validRows.push(row);
      }
    }

    return { validRows, errors, warnings };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ============================================================
  // VALIDATE ONLY (dry run)
  // ============================================================

  async validateImport(companyId: string, performedBy: string, csvContent: string, fileName: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvContent);
    if (rows.length === 0) throw new BadRequestException('No data rows found in CSV');

    const { validRows, errors, warnings } = await this.validateRows(companyId, rows);

    // Create import job record
    const job = await this._createImportJob(companyId, performedBy, fileName, rows.length, 'VALIDATE_ONLY');

    // Check for existing employees
    let createCount = 0;
    let updateCount = 0;

    if (this.prisma.isConnected()) {
      for (const row of validRows) {
        const existing = await this.prisma.user.findFirst({
          where: { companyId, employeeId: row.employeeId },
        });
        if (existing) {
          updateCount++;
        } else {
          createCount++;
        }
      }
    } else {
      createCount = validRows.length;
    }

    return {
      importId: job.id,
      status: 'VALIDATED',
      totalRows: rows.length,
      created: createCount,
      updated: updateCount,
      failed: errors.length,
      warnings: warnings.length,
      errors,
      dryRun: true,
    };
  }

  // ============================================================
  // IMPORT (actual)
  // ============================================================

  async importEmployees(companyId: string, performedBy: string, csvContent: string, fileName: string): Promise<ImportResult> {
    const rows = this.parseCSV(csvContent);
    if (rows.length === 0) throw new BadRequestException('No data rows found in CSV');

    const { validRows, errors, warnings } = await this.validateRows(companyId, rows);

    // Create import job
    const job = await this._createImportJob(companyId, performedBy, fileName, rows.length, 'IMPORT');

    let created = 0;
    let updated = 0;
    let failed = errors.length;

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const result = await this._upsertEmployee(companyId, performedBy, row);
          if (result === 'created') created++;
          else updated++;

          // Create row record
          await this._createImportRow(job.id, row.rowNumber, 'SUCCESS', row.employeeId, row.fullName, row.workEmail, result.toUpperCase());
        } catch (err: any) {
          failed++;
          errors.push({
            rowNumber: row.rowNumber,
            employeeId: row.employeeId,
            field: 'general',
            errorCode: 'IMPORT_FAILED',
            errorMessage: err.message || 'Unknown error',
          });
          await this._createImportRow(job.id, row.rowNumber, 'FAILED', row.employeeId, row.fullName, row.workEmail, undefined, err.message);
        }
      }
    }

    // Update job status
    const finalStatus = failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
    if (this.prisma.isConnected()) {
      await this.prisma.employeeImportJob.update({
        where: { id: job.id },
        data: {
          status: finalStatus,
          createdCount: created,
          updatedCount: updated,
          failedCount: failed,
          warningCount: warnings.length,
          completedAt: new Date(),
        },
      });
    }

    await this.audit.log({
      companyId, userId: performedBy, action: 'EMPLOYEE_IMPORT_COMPLETED',
      entity: 'EmployeeImportJob', entityId: job.id,
      newValue: { created, updated, failed, warnings: warnings.length },
    });

    return {
      importId: job.id,
      status: finalStatus,
      totalRows: rows.length,
      created,
      updated,
      failed,
      warnings: warnings.length,
      errors,
    };
  }

  // ============================================================
  // UPSERT EMPLOYEE
  // ============================================================

  private async _upsertEmployee(companyId: string, performedBy: string, row: ImportRow): Promise<'created' | 'updated'> {
    if (!this.prisma.isConnected()) return 'created';

    const existing = await this.prisma.user.findFirst({
      where: { companyId, employeeId: row.employeeId },
    });

    const normalizedName = row.fullName || '';
    const normalizedEmail = row.workEmail?.toLowerCase() || '';
    const normalizedPhone = row.mobileNumber || null;
    const transportEligibility = (row.transportEligibility as any) || 'ELIGIBLE';

    const userData = {
      employeeId: row.employeeId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      companyId,
      designation: row.level || null,
      homeAddress: row.pickupAddress || null,
      homeLatitude: row.pickupLatitude || null,
      homeLongitude: row.pickupLongitude || null,
      defaultPickup: row.pickupAddress || null,
      defaultDrop: row.dropAddress || null,
      emergencyContactName: row.emergencyContactName || null,
      emergencyContactPhone: row.emergencyContactMobile || null,
      transportEligibility,
      status: 'ACTIVE' as any,
    };

    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: userData,
      });

      await this.audit.log({
        companyId, userId: performedBy, action: 'EMPLOYEE_UPDATED_BULK',
        entity: 'User', entityId: existing.id,
        newValue: { employeeId: row.employeeId, name: normalizedName },
      });

      return 'updated';
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(require('crypto').randomBytes(16).toString('hex'), 10);
      const newUser = await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash,
        },
      });

      // Create transport limit if specified
      if (row.transportLimit) {
        await this.prisma.employeeTransportLimit.create({
          data: {
            companyId,
            employeeId: newUser.id,
            maxSpendPerMonth: row.transportLimit,
            cabAllowed: this._parseBool(row.cabAllowed, true),
            shuttleAllowed: this._parseBool(row.shuttleAllowed, true),
            nodalAllowed: this._parseBool(row.nodalTransportAllowed, true),
            acAllowed: this._parseBool(row.acAllowed, true),
          },
        });
      }

      await this.audit.log({
        companyId, userId: performedBy, action: 'EMPLOYEE_CREATED_BULK',
        entity: 'User', entityId: newUser.id,
        newValue: { employeeId: row.employeeId, name: normalizedName, email: normalizedEmail },
      });

      return 'created';
    }
  }

  private _parseBool(val: string | undefined, defaultVal: boolean): boolean {
    if (!val) return defaultVal;
    return ['true', '1', 'yes'].includes(String(val).toLowerCase());
  }

  // ============================================================
  // IMPORT JOB CRUD
  // ============================================================

  private async _createImportJob(companyId: string, uploadedBy: string, fileName: string, totalRows: number, mode: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.employeeImportJob.create({
      data: {
        companyId,
        uploadedById: uploadedBy,
        fileName,
        totalRows,
        importMode: mode,
        status: mode === 'VALIDATE_ONLY' ? 'VALIDATED' : 'IMPORTING',
      },
    });
  }

  private async _createImportRow(jobId: string, rowNumber: number, status: string, employeeId?: string, name?: string, email?: string, action?: string, error?: string) {
    if (!this.prisma.isConnected()) return;

    await this.prisma.employeeImportRow.create({
      data: {
        importJobId: jobId,
        rowNumber,
        status,
        employeeId,
        employeeName: name,
        email,
        action,
        errorMessage: error,
        errorCode: error ? 'IMPORT_FAILED' : undefined,
      },
    });
  }

  async listImportJobs(companyId: string, params?: { page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.employeeImportJob.findMany({
        where: { companyId }, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employeeImportJob.count({ where: { companyId } }),
    ]);

    return {
      data: jobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getImportJob(companyId: string, jobId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const job = await this.prisma.employeeImportJob.findFirst({
      where: { id: jobId, companyId },
      // Note: rows relation not included since EmployeeImportRow may not be a direct relation
    });
    if (!job) throw new NotFoundException('Import job not found');
    return job;
  }

  // ============================================================
  // TEMPLATE
  // ============================================================

  getTemplateCSV(): string {
    return `employee_id,full_name,work_email,mobile_number,level,department,business_unit,cost_center,manager_employee_id,team_leader_employee_id,office_code,shift_code,transport_eligibility,pickup_address,pickup_latitude,pickup_longitude,pickup_landmark,drop_address,drop_latitude,drop_longitude,emergency_contact_name,emergency_contact_mobile,cab_allowed,shuttle_allowed,ac_allowed,transport_limit
EMP001,John Smith,john.smith@company.com,+919876543210,L4,Engineering,BU-Tech,CC-ENG,EMP000,EMP000,OFFICE-01,MORNING,TRANSPORT_ACTIVE,123 Main St Mumbai,19.0760,72.8777,Near Park,456 Office Rd,19.0590,72.8295,Sarah Smith,+919876543211,true,true,true,5000
EMP002,Jane Doe,jane.doe@company.com,+919876543212,L5,Product,BU-Prod,CC-PROD,EMP001,EMP001,OFFICE-01,AFTERNOON,TRANSPORT_ACTIVE,789 Lake Rd,19.1234,72.8901,,321 Tech Park,19.0590,72.8295,Robert Doe,+919876543213,true,false,true,8000`;
  }

  // ============================================================
  // DEMO DATA
  // ============================================================

  private _demoImportJobs() {
    return {
      data: [
        { id: 'import-001', fileName: 'employees_batch_1.csv', status: 'COMPLETED', totalRows: 45, createdCount: 38, updatedCount: 5, failedCount: 2, warningCount: 3, importMode: 'IMPORT', createdAt: new Date('2025-08-30') },
        { id: 'import-002', fileName: 'new_hires_aug.csv', status: 'COMPLETED_WITH_ERRORS', totalRows: 12, createdCount: 10, updatedCount: 0, failedCount: 2, warningCount: 1, importMode: 'IMPORT', createdAt: new Date('2025-08-28') },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    };
  }

  private _demoImportJobDetail(jobId: string) {
    return {
      id: jobId, fileName: 'employees_batch_1.csv', status: 'COMPLETED', totalRows: 45, createdCount: 38, updatedCount: 5, failedCount: 2, warningCount: 3,
      rows: [
        { rowNumber: 2, status: 'CREATED', employeeId: 'EMP001', employeeName: 'John Smith', action: 'CREATE' },
        { rowNumber: 3, status: 'UPDATED', employeeId: 'EMP002', employeeName: 'Jane Doe', action: 'UPDATE' },
        { rowNumber: 4, status: 'FAILED', employeeId: 'EMP003', errorCode: 'INVALID_EMAIL', errorMessage: 'Invalid email format' },
      ],
    };
  }
}
