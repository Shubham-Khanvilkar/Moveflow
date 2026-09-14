import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { ReportingEngineService } from './reporting-engine.service';
import {
  CreateReportTemplateDto,
  GenerateReportDto,
  ScheduleReportDto,
} from './reporting-engine.service';

@ApiTags('Reporting Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('api/v1/reports')
export class ReportingEngineController {
  constructor(private readonly service: ReportingEngineService) {}

  @Get('types')
  @RequirePermissions({ module: 'report', action: 'view' })
  @ApiOperation({ summary: 'Get all available report types' })
  getReportTypes() {
    return this.service.getReportTypes();
  }

  @Get('templates')
  @RequirePermissions({ module: 'report', action: 'view' })
  @ApiOperation({ summary: 'Get report templates' })
  async getTemplates(@Request() req: any) {
    return this.service.getTemplates(req.user.companyId);
  }

  @Post('templates')
  @RequirePermissions({ module: 'report', action: 'create' })
  @ApiOperation({ summary: 'Create report template' })
  async createTemplate(@Body() dto: CreateReportTemplateDto, @Request() req: any) {
    return this.service.createTemplate(req.user.companyId, dto, req.user.id);
  }

  @Post('generate')
  @RequirePermissions({ module: 'report', action: 'export' })
  @ApiOperation({ summary: 'Generate a report' })
  async generateReport(@Body() dto: GenerateReportDto, @Request() req: any) {
    return this.service.generateReport(req.user.companyId, dto, req.user.id);
  }

  @Get('schedules')
  @RequirePermissions({ module: 'report', action: 'view' })
  @ApiOperation({ summary: 'Get scheduled reports' })
  async getSchedules(@Request() req: any) {
    return this.service.getSchedules(req.user.companyId);
  }

  @Post('schedules')
  @RequirePermissions({ module: 'report', action: 'create' })
  @ApiOperation({ summary: 'Schedule a report' })
  async scheduleReport(@Body() dto: ScheduleReportDto, @Request() req: any) {
    return this.service.scheduleReport(req.user.companyId, dto, req.user.id);
  }

  @Patch('schedules/:scheduleId/toggle')
  @RequirePermissions({ module: 'report', action: 'edit' })
  @ApiOperation({ summary: 'Toggle scheduled report active/inactive' })
  async toggleSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body('isActive') isActive: boolean,
    @Request() req: any,
  ) {
    return this.service.toggleSchedule(req.user.companyId, scheduleId, isActive, req.user.id);
  }

  @Get('executions')
  @RequirePermissions({ module: 'report', action: 'view' })
  @ApiOperation({ summary: 'Get report execution history' })
  async getExecutions(
    @Query('templateId') templateId: string,
    @Request() req: any,
  ) {
    return this.service.getExecutions(req.user.companyId, templateId);
  }

  // ─── EXPORT ENDPOINTS ──────────────────────────────────────

  @Get('export/:reportType')
  @RequirePermissions({ module: 'report', action: 'export' })
  @ApiOperation({ summary: 'Export a report to file format (csv/xlsx/json)' })
  async exportReport(
    @Param('reportType') reportType: string,
    @Query('format') format: 'csv' | 'xlsx' | 'json',
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.service.exportReport(
      req.user.companyId,
      reportType,
      format || 'xlsx',
      { from, to },
      req.user.sub,
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }

  @Get('export/bookings')
  @RequirePermissions({ module: 'report', action: 'export' })
  @ApiOperation({ summary: 'Export bookings to spreadsheet' })
  async exportBookings(
    @Query('format') format: 'csv' | 'xlsx' | 'json',
    @Query('status') status: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.service.exportBookings(
      req.user.companyId,
      format || 'xlsx',
      { status, from, to },
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }

  @Get('export/trips')
  @RequirePermissions({ module: 'report', action: 'export' })
  @ApiOperation({ summary: 'Export trips to spreadsheet' })
  async exportTrips(
    @Query('format') format: 'csv' | 'xlsx' | 'json',
    @Query('status') status: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.service.exportTrips(
      req.user.companyId,
      format || 'xlsx',
      { status, from, to },
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }

  @Get('export/expenses')
  @RequirePermissions({ module: 'report', action: 'export' })
  @ApiOperation({ summary: 'Export expenses to spreadsheet' })
  async exportExpenses(
    @Query('format') format: 'csv' | 'xlsx' | 'json',
    @Query('category') category: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.service.exportExpenses(
      req.user.companyId,
      format || 'xlsx',
      { category, from, to },
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }

  @Get('export/drivers')
  @RequirePermissions({ module: 'report', action: 'export' })
  @ApiOperation({ summary: 'Export driver performance to spreadsheet' })
  async exportDriverPerformance(
    @Query('format') format: 'csv' | 'xlsx' | 'json',
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.service.exportDriverPerformance(
      req.user.companyId,
      format || 'xlsx',
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }

  @Get('export/audit')
  @RequirePermissions({ module: 'report', action: 'export' })
  @ApiOperation({ summary: 'Export audit trail to spreadsheet' })
  async exportAuditTrail(
    @Query('format') format: 'csv' | 'xlsx' | 'json',
    @Query('action') action: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const result = await this.service.exportAuditTrail(
      req.user.companyId,
      format || 'xlsx',
      { action, from, to },
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }
}
