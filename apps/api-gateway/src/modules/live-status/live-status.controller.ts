import {
  Controller, Get, Query, UseGuards, Res, Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { LiveStatusService } from './live-status.service';
import { LiveStatusQueryDto } from './dto/live-status.dto';

@ApiTags('Live Status')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('live-status')
export class LiveStatusController {
  constructor(private readonly service: LiveStatusService) {}

  @Get('metrics')
  @RequirePermissions({ module: 'live_status', action: 'view' })
  @ApiOperation({ summary: 'Get live status metrics' })
  async getMetrics(@Tenant() companyId: string, @Query() query: LiveStatusQueryDto) {
    return this.service.getMetrics(companyId, query);
  }

  @Get('table')
  @RequirePermissions({ module: 'live_status', action: 'view' })
  @ApiOperation({ summary: 'Get live status table data' })
  async getTable(@Tenant() companyId: string, @Query() query: LiveStatusQueryDto) {
    return this.service.getTable(companyId, query);
  }

  @Get('export')
  @RequirePermissions({ module: 'live_status', action: 'export' })
  @ApiOperation({ summary: 'Export live status as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="live-status.csv"')
  async export(@Tenant() companyId: string, @Query() query: LiveStatusQueryDto, @Res() res: Response) {
    const csv = await this.service.exportCsv(companyId, query);
    res.send(csv);
  }
}
