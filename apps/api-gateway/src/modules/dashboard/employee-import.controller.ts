import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EmployeeImportService } from './employee-import.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/import')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class EmployeeImportController {
  constructor(private readonly importService: EmployeeImportService) {}

  @Post('jobs')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async createImportJob(@Request() req: any, @Body() body: { importJobName: string; fileName: string; fileSize?: number; importConfig?: any }) {
    return this.importService.createImportJob(req.user.companyId, body, req.user.id);
  }

  @Get('jobs')
  async getImportJobs(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.importService.getImportJobs(req.user.companyId, { page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('jobs/:jobId/validate')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async validateImport(@Request() req: any, @Param('jobId') jobId: string, @Body() body: { rows: any[] }) {
    return this.importService.validateImport(req.user.companyId, jobId, body.rows);
  }

  @Post('jobs/:jobId/process')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async processImport(@Request() req: any, @Param('jobId') jobId: string) {
    return this.importService.processImport(req.user.companyId, jobId);
  }

  @Get('jobs/:jobId/rows')
  async getImportRows(@Request() req: any, @Param('jobId') jobId: string, @Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.importService.getImportRows(req.user.companyId, jobId, { status, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }
}
