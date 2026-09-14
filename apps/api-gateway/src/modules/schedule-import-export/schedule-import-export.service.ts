import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  ImportScheduleJobDto,
  ExportScheduleQueryDto,
  ExportTeamQueryDto,
} from './dto/schedule-import-export.dto';

@Injectable()
export class ScheduleImportExportService {
  constructor(private prisma: PrismaService) {}

  async importSchedules(dto: ImportScheduleJobDto, companyId: string, userId: string) {
    const job = await this.prisma.employeeScheduleImportJob.create({
      data: {
        companyId,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        totalRows: dto.rows.length,
        processedRows: 0,
        successRows: 0,
        failedRows: 0,
        status: 'PROCESSING',
        createdBy: userId,
      } as any,
    });

    let processedRows = 0;
    let successRows = 0;
    let failedRows = 0;
    const rowResults: any[] = [];

    for (const row of dto.rows) {
      try {
        const employee = await this.prisma.user.findFirst({
          where: {
            employeeId: row.employeeId,
            companyId,
          },
        });

        if (!employee) {
          failedRows++;
          rowResults.push({
            jobId: job.id,
            rowNumber: processedRows + 1,
            employeeId: row.employeeId,
            status: 'FAILED',
            error: `Employee with ID ${row.employeeId} not found`,
          });
        } else {
          await this.prisma.employeeSchedule.create({
            data: {
              employeeId: employee.id,
              companyId,
              loginTime: new Date(row.loginTime),
              logoutTime: new Date(row.logoutTime),
              weeklyOffs: row.weeklyOffs ? JSON.stringify(row.weeklyOffs) : null,
              nodalPoint: row.nodalPoint,
              billingZone: row.billingZone,
              addressLine1: row.addressLine1,
              latitude: row.latitude,
              longitude: row.longitude,
            } as any,
          });
          successRows++;
          rowResults.push({
            jobId: job.id,
            rowNumber: processedRows + 1,
            employeeId: row.employeeId,
            status: 'SUCCESS',
            error: null,
          });
        }
      } catch (error) {
        failedRows++;
        rowResults.push({
          jobId: job.id,
          rowNumber: processedRows + 1,
          employeeId: row.employeeId,
          status: 'FAILED',
          error: error.message || 'Unknown error',
        });
      }
      processedRows++;
    }

    await this.prisma.employeeScheduleImportJob.update({
      where: { id: job.id },
      data: {
        processedRows,
        successRows,
        failedRows,
        status: 'COMPLETED',
      },
    });

    await (this.prisma as any).employeeScheduleImportRow.createMany({
      data: rowResults,
    });

    return {
      jobId: job.id,
      totalRows: dto.rows.length,
      processedRows,
      successRows,
      failedRows,
      status: 'COMPLETED',
    };
  }

  async getImportJob(jobId: string, companyId: string) {
    const job = await this.prisma.employeeScheduleImportJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    return job;
  }

  async getImportJobs(companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query ?? {};
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    const [data, total] = await Promise.all([
      this.prisma.employeeScheduleImportJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.employeeScheduleImportJob.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getImportJobRows(jobId: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'rowNumber', sortOrder = 'asc' } = query ?? {};
    const skip = (page - 1) * limit;

    const job = await this.prisma.employeeScheduleImportJob.findFirst({
      where: { id: jobId, companyId },
    });

    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    const where: any = { jobId };

    const [data, total] = await Promise.all([
      (this.prisma as any).employeeScheduleImportRow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      (this.prisma as any).employeeScheduleImportRow.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportSchedules(query: ExportScheduleQueryDto, companyId: string) {
    const where: any = {
      companyId,
      loginTime: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    };

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    if (query.teamId) {
      where.teamId = query.teamId;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const schedules = await this.prisma.employeeSchedule.findMany({
      where,
      include: {
        user: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      } as any,
      orderBy: { loginTime: 'asc' },
    });

    const headers = [
      'Employee ID',
      'Employee Name',
      'Login Time',
      'Logout Time',
      'Weekly Offs',
      'Nodal Point',
      'Billing Zone',
      'Address Line 1',
      'Latitude',
      'Longitude',
    ];

    const rows = schedules.map((schedule: any) => [
      schedule.user?.employeeCode || '',
      schedule.user ? `${schedule.user.firstName} ${schedule.user.lastName}` : '',
      schedule.loginTime?.toISOString() || '',
      schedule.logoutTime?.toISOString() || '',
      schedule.weeklyOffs || '',
      schedule.nodalPoint || '',
      schedule.billingZone || '',
      schedule.addressLine1 || '',
      schedule.latitude?.toString() || '',
      schedule.longitude?.toString() || '',
    ]);

    return this.generateCsv(headers, rows);
  }

  async exportTeams(query: ExportTeamQueryDto, companyId: string) {
    const where: any = { companyId };

    if (query.siteId) {
      where.siteId = query.siteId;
    }

    const teams = await (this.prisma as any).employeeTeam.findMany({
      where,
      include: {
        members: {
          include: {
            user: {
              select: {
                employeeId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Team Name', 'Team Code', 'Manager', 'Members'];

    const rows = teams.map((team: any) => [
      team.name,
      team.code,
      team.managerId || '',
      team.members
        .map((m: any) =>
          m.user
            ? `${m.user.employeeId} - ${m.user.name}`
            : '',
        )
        .filter(Boolean)
        .join('; '),
    ]);

    return this.generateCsv(headers, rows);
  }

  async exportPickupDrops(startDate: string, endDate: string, companyId: string) {
    const where: any = {
      companyId,
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const pickupDrops = await (this.prisma as any).additionalPickupDrop.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'Employee ID',
      'Employee Name',
      'Pickup Address',
      'Drop Address',
      'Latitude',
      'Longitude',
      'Created At',
    ];

    const rows = pickupDrops.map((pd) => [
      pd.employee?.employeeCode || '',
      pd.employee ? `${pd.employee.firstName} ${pd.employee.lastName}` : '',
      pd.pickupAddress || '',
      pd.dropAddress || '',
      pd.latitude?.toString() || '',
      pd.longitude?.toString() || '',
      pd.createdAt?.toISOString() || '',
    ]);

    return this.generateCsv(headers, rows);
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private generateCsv(headers: string[], rows: string[][]): string {
    const lines: string[] = [];

    lines.push(headers.map((h) => this.escapeCsvValue(h)).join(','));

    for (const row of rows) {
      lines.push(row.map((cell) => this.escapeCsvValue(cell)).join(','));
    }

    return lines.join('\r\n');
  }
}
