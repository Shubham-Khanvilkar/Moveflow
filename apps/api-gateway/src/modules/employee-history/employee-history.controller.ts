import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { EmployeeHistoryService } from './employee-history.service';
import { EmployeeHistoryQueryDto, CreateEmployeeHistoryDto } from './dto/employee-history.dto';

@ApiTags('Employee History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('employee-history')
export class EmployeeHistoryController {
  constructor(private readonly service: EmployeeHistoryService) {}

  @Get(':userId')
  @RequirePermissions({ module: 'employee', action: 'history.view' })
  @ApiOperation({ summary: 'Get employee history timeline' })
  async getTimeline(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Tenant() companyId: string,
    @Query() query: EmployeeHistoryQueryDto,
  ) {
    return this.service.getTimeline(userId, companyId, query);
  }

  @Post()
  @RequirePermissions({ module: 'employee', action: 'history.view' })
  @ApiOperation({ summary: 'Record an employee history entry (internal)' })
  async record(
    @Tenant() companyId: string,
    @Body() dto: CreateEmployeeHistoryDto,
  ) {
    return this.service.record(companyId, dto);
  }
}
