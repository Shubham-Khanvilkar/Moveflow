import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ScheduleImportExportService } from './schedule-import-export.service';
import {
  ImportScheduleJobDto,
  ExportScheduleQueryDto,
  ExportTeamQueryDto,
} from './dto/schedule-import-export.dto';

@ApiBearerAuth()
@ApiTags('Import/Export')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AccessScopeGuard)
@Controller('schedule-import-export')
export class ScheduleImportExportController {
  constructor(private readonly service: ScheduleImportExportService) {}

  @Post('import')
  @RequirePermissions({ module: 'employee', action: 'import' })
  @ApiOperation({ summary: 'Import schedules from file' })
  async importSchedules(@Body() dto: ImportScheduleJobDto, @Request() req: any) {
    return this.service.importSchedules(dto, req.user.companyId, req.user.id);
  }

  @Get('import/jobs')
  @RequirePermissions({ module: 'employee', action: 'import' })
  @ApiOperation({ summary: 'Get all import jobs' })
  async getImportJobs(@Query() query: PaginationDto, @Request() req: any) {
    return this.service.getImportJobs(req.user.companyId, query);
  }

  @Get('import/jobs/:jobId')
  @RequirePermissions({ module: 'employee', action: 'import' })
  @ApiOperation({ summary: 'Get import job by ID' })
  async getImportJob(@Param('jobId') jobId: string, @Request() req: any) {
    return this.service.getImportJob(jobId, req.user.companyId);
  }

  @Get('import/jobs/:jobId/rows')
  @RequirePermissions({ module: 'employee', action: 'import' })
  @ApiOperation({ summary: 'Get import job rows' })
  async getImportJobRows(@Param('jobId') jobId: string, @Query() query: PaginationDto, @Request() req: any) {
    return this.service.getImportJobRows(jobId, req.user.companyId, query);
  }

  @Get('export/schedules')
  @RequirePermissions({ module: 'employee', action: 'export' })
  @ApiOperation({ summary: 'Export schedules' })
  async exportSchedules(@Query() query: ExportScheduleQueryDto, @Request() req: any) {
    return this.service.exportSchedules(query, req.user.companyId);
  }

  @Get('export/teams')
  @RequirePermissions({ module: 'employee', action: 'export' })
  @ApiOperation({ summary: 'Export teams' })
  async exportTeams(@Query() query: ExportTeamQueryDto, @Request() req: any) {
    return this.service.exportTeams(query, req.user.companyId);
  }

  @Get('export/pickup-drops')
  @RequirePermissions({ module: 'employee', action: 'export' })
  @ApiOperation({ summary: 'Export pickup/drops' })
  async exportPickupDrops(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    return this.service.exportPickupDrops(startDate, endDate, req.user.companyId);
  }
}
