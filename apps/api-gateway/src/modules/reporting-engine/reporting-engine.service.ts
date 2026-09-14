import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ExportService, ExportOptions } from './export.service';

export const REPORT_TYPES = {
  // Transport Operations
  DAILY_TRIP_SUMMARY: { name: 'Daily Trip Summary', category: 'transport', description: 'Trips, bookings, cancellations per day' },
  VEHICLE_UTILIZATION: { name: 'Vehicle Utilization', category: 'transport', description: 'Fleet utilization rates, seat occupancy' },
  ROUTE_ANALYSIS: { name: 'Route Analysis', category: 'transport', description: 'Route efficiency, deviations, fuel consumption' },
  DRIVER_PERFORMANCE: { name: 'Driver Performance', category: 'transport', description: 'Driver ratings, trip completion, incidents' },
  TRIP_CAPACITY_REPORT: { name: 'Trip Capacity Report', category: 'transport', description: 'Booking vs capacity, overbooking' },
  // Employee & Booking
  EMPLOYEE_BOOKING_HISTORY: { name: 'Employee Booking History', category: 'employee', description: 'Per-employee booking patterns' },
  BOOKING_CANCELLATION: { name: 'Booking Cancellation', category: 'employee', description: 'Cancellation reasons and trends' },
  NO_SHOW_REPORT: { name: 'No-Show Report', category: 'employee', description: 'Missed pickups and boarding failures' },
  ADVANCE_BOOKING: { name: 'Advance Booking Report', category: 'employee', description: 'Lead time analysis' },
  // Vendor & Billing
  VENDOR_SETTLEMENT: { name: 'Vendor Settlement', category: 'billing', description: 'Vendor payment reconciliation' },
  INVOICE_SUMMARY: { name: 'Invoice Summary', category: 'billing', description: 'Billing periods, amounts, adjustments' },
  COST_PER_TRIP: { name: 'Cost Per Trip', category: 'billing', description: 'Transport cost analytics' },
  SAAS_BILLING: { name: 'SaaS Billing', category: 'billing', description: 'Platform subscription billing' },
  // Safety & Compliance
  INCIDENT_REPORT: { name: 'Incident Report', category: 'safety', description: 'Safety incidents, resolutions' },
  DOCUMENT_EXPIRY: { name: 'Document Expiry', category: 'compliance', description: 'Driving licenses, permits expiring' },
  VEHICLE_COMPLIANCE: { name: 'Vehicle Compliance', category: 'compliance', description: 'Fitness, PUC, insurance status' },
  DRIVER_COMPLIANCE: { name: 'Driver Compliance', category: 'compliance', description: 'License, medical fitness status' },
  // Audit & Security
  AUDIT_TRAIL: { name: 'Audit Trail', category: 'security', description: 'System activity audit log' },
  LOGIN_ACTIVITY: { name: 'Login Activity', category: 'security', description: 'User login patterns, failed attempts' },
  PERMISSION_CHANGES: { name: 'Permission Changes', category: 'security', description: 'RBAC change history' },
  // Site & Geo
  SITE_ACTIVATION: { name: 'Site Activation', category: 'site', description: 'Site onboarding status' },
  GEO_FENCE_COMPLIANCE: { name: 'Geo-Fence Compliance', category: 'site', description: 'Geofence entry/exit violations' },
  SHIFT_REPORT: { name: 'Shift Report', category: 'site', description: 'Shift-wise transport operations' },
  // Vendor Operations
  VEHICLE_STATUS: { name: 'Vehicle Status', category: 'vendor', description: 'Fleet availability and condition' },
  DRIVER_ATTENDANCE: { name: 'Driver Attendance', category: 'vendor', description: 'Driver check-in/check-out' },
  VENDOR_PERFORMANCE: { name: 'Vendor Performance', category: 'vendor', description: 'SLA compliance, ratings' },
  // Management
  EXECUTIVE_DASHBOARD: { name: 'Executive Dashboard', category: 'management', description: 'High-level KPIs' },
  WEEKLY_SUMMARY: { name: 'Weekly Summary', category: 'management', description: 'Weekly operations summary' },
  MONTHLY_SUMMARY: { name: 'Monthly Summary', category: 'management', description: 'Monthly operations summary' },
  TREND_ANALYSIS: { name: 'Trend Analysis', category: 'management', description: 'Historical trends and forecasts' },
  CUSTOM_REPORT: { name: 'Custom Report', category: 'management', description: 'User-defined query report' },
};

export class CreateReportTemplateDto {
  name: string;
  description?: string;
  category: string;
  reportType: string;
  config: any;
}

export class GenerateReportDto {
  reportType: string;
  parameters?: any;
  format?: string;
}

export class ScheduleReportDto {
  templateId: string;
  name: string;
  frequency: string;
  recipients: string[];
  format?: string;
}

@Injectable()
export class ReportingEngineService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private exportService: ExportService,
  ) {}

  getReportTypes() {
    return REPORT_TYPES;
  }

  async createTemplate(companyId: string, dto: CreateReportTemplateDto, userId: string) {
    const template = await this.prisma.reportTemplate.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        reportType: dto.reportType,
        config: dto.config,
        createdBy: userId,
      },
    });

    await this.audit.log({
      userId, action: 'REPORT_TEMPLATE_CREATED', entity: 'ReportTemplate',
      entityId: template.id, companyId, newValue: { name: dto.name, reportType: dto.reportType },
    });

    return template;
  }

  async getTemplates(companyId: string) {
    return this.prisma.reportTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateReport(companyId: string, dto: GenerateReportDto, userId: string) {
    const execution = await this.prisma.reportExecution.create({
      data: {
        companyId,
        reportType: dto.reportType,
        parameters: dto.parameters,
        status: 'RUNNING',
        generatedBy: userId,
      },
    });

    try {
      // Generate report data based on type
      const data = await this.executeReportQuery(companyId, dto.reportType, dto.parameters);

      // Store result
      const updated = await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await this.audit.log({
        userId, action: 'REPORT_GENERATED', entity: 'ReportExecution',
        entityId: execution.id, companyId, newValue: { reportType: dto.reportType },
      });

      return { ...updated, data };
    } catch (error: any) {
      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', error: error.message, completedAt: new Date() },
      });
      throw error;
    }
  }

  private async executeReportQuery(companyId: string, reportType: string, params?: any) {
    const where = { companyId, ...params?.where };
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (reportType) {
      case 'DAILY_TRIP_SUMMARY': {
        const trips = await this.prisma.trip.findMany({
          where: { companyId, createdAt: { gte: thirtyDaysAgo } },
          select: { status: true, createdAt: true },
        });
        return { totalTrips: trips.length, trips };
      }
      case 'VEHICLE_UTILIZATION': {
        const vehicles = await this.prisma.vehicle.findMany({
          where: { companyId },
          include: { Trip: { select: { status: true } } },
        });
        return { totalVehicles: vehicles.length, vehicles };
      }
      case 'EMPLOYEE_BOOKING_HISTORY': {
        const bookings = await this.prisma.booking.findMany({
          where: { companyId, createdAt: { gte: thirtyDaysAgo } },
          select: { requesterId: true, status: true, createdAt: true },
        });
        return { totalBookings: bookings.length, bookings };
      }
      case 'INCIDENT_REPORT': {
        const incidents = await this.prisma.incident.findMany({
          where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        });
        return { totalIncidents: incidents.length, incidents };
      }
      case 'DOCUMENT_EXPIRY': {
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const docs = await this.prisma.complianceDocument.findMany({
          where: {
            companyId,
            status: 'VERIFIED',
            expiryDate: { gte: now, lte: thirtyDaysFromNow },
          },
        });
        return { expiringCount: docs.length, documents: docs };
      }
      case 'AUDIT_TRAIL': {
        const logs = await this.prisma.auditLog.findMany({
          where: { companyId, createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        });
        return { totalLogs: logs.length, logs };
      }
      default:
        return { message: `Report type ${reportType} query not yet implemented`, data: [] };
    }
  }

  async scheduleReport(companyId: string, dto: ScheduleReportDto, userId: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { id: dto.templateId, companyId },
    });
    if (!template) throw new NotFoundException('Report template not found');

    const schedule = await this.prisma.scheduledReport.create({
      data: {
        companyId,
        templateId: dto.templateId,
        name: dto.name,
        frequency: dto.frequency,
        recipients: dto.recipients,
        format: dto.format || 'CSV',
        createdBy: userId,
        nextRunAt: this.calculateNextRun(dto.frequency),
      },
    });

    await this.audit.log({
      userId, action: 'REPORT_SCHEDULED', entity: 'ScheduledReport',
      entityId: schedule.id, companyId,
      newValue: { name: dto.name, frequency: dto.frequency },
    });

    return schedule;
  }

  async getSchedules(companyId: string) {
    return this.prisma.scheduledReport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleSchedule(companyId: string, scheduleId: string, isActive: boolean, userId: string) {
    const schedule = await this.prisma.scheduledReport.findFirst({
      where: { id: scheduleId, companyId },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    return this.prisma.scheduledReport.update({
      where: { id: scheduleId },
      data: { isActive },
    });
  }

  async getExecutions(companyId: string, templateId?: string) {
    const where: any = { companyId };
    if (templateId) where.templateId = templateId;

    return this.prisma.reportExecution.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  // ─── EXPORT METHODS ────────────────────────────────────────

  /**
   * Generate report and export to file format.
   */
  async exportReport(companyId: string, reportType: string, format: 'csv' | 'xlsx' | 'json', params?: any, userId?: string) {
    const data = await this.executeReportQuery(companyId, reportType, params);

    // Flatten data for export
    let exportData: any[] = [];
    if (Array.isArray(data)) {
      exportData = data;
    } else if (data && typeof data === 'object') {
      // Extract arrays from the data object
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          exportData = data[key];
          break;
        }
      }
      if (exportData.length === 0) {
        exportData = [data];
      }
    }

    const result = this.exportService.exportData(exportData, {
      format,
      filename: `${reportType.toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
    });

    if (userId) {
      await this.audit.log({
        userId, action: 'REPORT_EXPORTED', entity: 'Report',
        companyId, newValue: { reportType, format, rowCount: exportData.length },
      });
    }

    return result;
  }

  /**
   * Export bookings to spreadsheet.
   */
  async exportBookings(companyId: string, format: 'csv' | 'xlsx' | 'json', params?: any) {
    const where: any = { companyId };
    if (params?.status) where.status = params.status;
    if (params?.from || params?.to) {
      where.date = {};
      if (params.from) where.date.gte = new Date(params.from);
      if (params.to) where.date.lte = new Date(params.to);
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        User_Booking_requesterIdToUser: { select: { name: true, email: true } },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const data = bookings.map((b: any) => ({
      bookingCode: b.bookingCode,
      type: b.type,
      status: b.status,
      date: b.date,
      pickupTime: b.pickupTime,
      pickupAddress: b.pickupAddress,
      dropAddress: b.dropAddress,
      passengerCount: b.passengerCount,
      requester: b.User_Booking_requesterIdToUser?.name || '',
      requesterEmail: b.User_Booking_requesterIdToUser?.email || '',
      serviceType: b.serviceType,
      approvalStatus: b.approvalStatus,
      createdAt: b.createdAt,
    }));

    return this.exportService.exportData(data, {
      format,
      filename: `bookings-${new Date().toISOString().split('T')[0]}`,
    });
  }

  /**
   * Export trips to spreadsheet.
   */
  async exportTrips(companyId: string, format: 'csv' | 'xlsx' | 'json', params?: any) {
    const where: any = { companyId };
    if (params?.status) where.status = params.status;
    if (params?.from || params?.to) {
      where.date = {};
      if (params.from) where.date.gte = new Date(params.from);
      if (params.to) where.date.lte = new Date(params.to);
    }

    const trips = await this.prisma.trip.findMany({
      where,
      include: {
        Vehicle: { select: { registrationNo: true } },
        User: { select: { name: true } },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const data = trips.map((t: any) => ({
      tripCode: t.tripCode,
      type: t.type,
      status: t.status,
      date: t.date,
      scheduledPickupTime: t.scheduledPickupTime,
      actualPickupTime: t.actualPickupTime,
      pickupAddress: t.pickupAddress,
      dropAddress: t.dropAddress,
      distanceKm: t.distanceKm,
      actualDuration: t.actualDuration,
      passengerCount: t.passengerCount,
      vehicle: t.Vehicle?.registrationNo || '',
      driver: t.User?.name || '',
      estimatedCost: t.estimatedCost,
      actualCost: t.actualCost,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    }));

    return this.exportService.exportData(data, {
      format,
      filename: `trips-${new Date().toISOString().split('T')[0]}`,
    });
  }

  /**
   * Export expenses to spreadsheet.
   */
  async exportExpenses(companyId: string, format: 'csv' | 'xlsx' | 'json', params?: any) {
    const where: any = { companyId };
    if (params?.category) where.category = params.category;
    if (params?.from || params?.to) {
      where.expenseDate = {};
      if (params.from) where.expenseDate.gte = new Date(params.from);
      if (params.to) where.expenseDate.lte = new Date(params.to);
    }

    let expenses: any[] = [];
    try {
      expenses = await (this.prisma as any).expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
    } catch {
      expenses = [];
    }

    return this.exportService.exportData(expenses, {
      format,
      filename: `expenses-${new Date().toISOString().split('T')[0]}`,
    });
  }

  /**
   * Export driver performance to spreadsheet.
   */
  async exportDriverPerformance(companyId: string, format: 'csv' | 'xlsx' | 'json') {
    const drivers = await this.prisma.driverProfile.findMany({
      where: { companyId },
      include: {
        user: { select: { name: true, email: true } },
        Trip: { select: { status: true, actualDuration: true, completedAt: true } },
      } as any,
    });

    const data = drivers.map((d: any) => {
      const trips = d.Trip || [];
      const completed = trips.filter((t: any) => t.status === 'COMPLETED').length;
      const cancelled = trips.filter((t: any) => t.status === 'CANCELLED').length;
      const avgDuration = completed > 0
        ? Math.round(trips.filter((t: any) => t.actualDuration).reduce((sum: number, t: any) => sum + (t.actualDuration || 0), 0) / completed)
        : 0;

      return {
        driverName: d.user?.name || '',
        email: d.user?.email || '',
        totalTrips: d.totalTrips || trips.length,
        completedTrips: completed,
        cancelledTrips: cancelled,
        rating: d.rating || 0,
        avgDurationMinutes: avgDuration,
        status: d.status,
      };
    });

    return this.exportService.exportData(data, {
      format,
      filename: `driver-performance-${new Date().toISOString().split('T')[0]}`,
    });
  }

  /**
   * Export audit trail to spreadsheet.
   */
  async exportAuditTrail(companyId: string, format: 'csv' | 'xlsx' | 'json', params?: any) {
    const where: any = { companyId };
    if (params?.action) where.action = params.action;
    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const data = logs.map((l: any) => ({
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      userId: l.userId,
      timestamp: l.createdAt,
      oldValue: l.oldValue ? JSON.stringify(l.oldValue) : '',
      newValue: l.newValue ? JSON.stringify(l.newValue) : '',
    }));

    return this.exportService.exportData(data, {
      format,
      filename: `audit-trail-${new Date().toISOString().split('T')[0]}`,
    });
  }

  private calculateNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}
