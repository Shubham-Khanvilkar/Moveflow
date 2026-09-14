import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EmployeeSchedulingService } from './employee-scheduling.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  WeeklyGridQueryDto,
  SwapScheduleDto,
  BulkCreateScheduleDto,
  ScheduleHistoryQueryDto,
} from './dto/employee-scheduling.dto';

@ApiBearerAuth()
@ApiTags('Employee Scheduling')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AccessScopeGuard)
@Controller('employee-scheduling')
export class EmployeeSchedulingController {
  constructor(private readonly schedulingService: EmployeeSchedulingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ module: 'schedule', action: 'create' })
  @ApiOperation({ summary: 'Create a new schedule' })
  async createSchedule(
    @Body() dto: CreateScheduleDto,
    @Req() req: any,
  ) {
    return this.schedulingService.createSchedule(
      dto,
      req.user.companyId,
      req.user.id,
    );
  }

  @Get('grid')
  @RequirePermissions({ module: 'schedule', action: 'view' })
  @ApiOperation({ summary: 'Get weekly grid view' })
  async getWeeklyGrid(
    @Query() query: WeeklyGridQueryDto & PaginationDto,
    @Req() req: any,
  ) {
    return this.schedulingService.getWeeklyGrid(query, req.user.companyId);
  }

  @Put(':id')
  @RequirePermissions({ module: 'schedule', action: 'edit' })
  @ApiOperation({ summary: 'Update an existing schedule' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @Req() req: any,
  ) {
    return this.schedulingService.updateSchedule(
      id,
      dto,
      req.user.companyId,
      req.user.id,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ module: 'schedule', action: 'cancel' })
  @ApiOperation({ summary: 'Cancel a schedule' })
  async cancelSchedule(
    @Param('id') id: string,
    @Query('reason') reason: string,
    @Req() req: any,
  ) {
    return this.schedulingService.cancelSchedule(
      id,
      req.user.companyId,
      req.user.id,
      reason,
    );
  }

  @Post('swap')
  @RequirePermissions({ module: 'schedule', action: 'edit' })
  @ApiOperation({ summary: 'Swap two schedules' })
  async swapSchedules(
    @Body() dto: SwapScheduleDto,
    @Req() req: any,
  ) {
    return this.schedulingService.swapSchedules(
      dto,
      req.user.companyId,
      req.user.id,
    );
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ module: 'schedule', action: 'create' })
  @ApiOperation({ summary: 'Bulk create schedules' })
  async bulkCreate(
    @Body() dto: BulkCreateScheduleDto,
    @Req() req: any,
  ) {
    return this.schedulingService.bulkCreate(
      dto,
      req.user.companyId,
      req.user.id,
    );
  }

  @Get('history')
  @RequirePermissions({ module: 'schedule', action: 'history.view' })
  @ApiOperation({ summary: 'Get schedule history' })
  async getHistory(
    @Query() query: ScheduleHistoryQueryDto & PaginationDto,
    @Req() req: any,
  ) {
    return this.schedulingService.getHistory(query, req.user.companyId);
  }

  @Get('user/:userId')
  @RequirePermissions({ module: 'schedule', action: 'view' })
  @ApiOperation({ summary: 'Get schedules by user' })
  async getByUser(
    @Param('userId') userId: string,
    @Query() query: PaginationDto,
    @Req() req: any,
  ) {
    return this.schedulingService.getByUser(userId, req.user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions({ module: 'schedule', action: 'view' })
  @ApiOperation({ summary: 'Get schedule by ID' })
  async getById(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.schedulingService.getById(id, req.user.companyId);
  }
}
