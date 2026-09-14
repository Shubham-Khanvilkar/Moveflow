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
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TransportScheduleConfigService } from './transport-schedule-config.service';
import {
  CreatePickupDropTimingDto,
  UpdatePickupDropTimingDto,
  PickupDropTimingQueryDto,
} from './dto/pickup-drop-timing.dto';
import {
  CreateTransportScheduleSlotDto,
  UpdateTransportScheduleSlotDto,
  GenerateSlotsFromPatternDto,
  BulkCreateSlotsDto,
  SlotQueryDto,
} from './dto/transport-schedule-slot.dto';
import { UpdateTransportScheduleConfigDto } from './dto/transport-schedule-config.dto';

@ApiBearerAuth()
@ApiTags('Transport Schedule Config')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('transport-config')
export class TransportScheduleConfigController {
  constructor(private readonly service: TransportScheduleConfigService) {}

  // ─── Shift Timings ──────────────────────────────────────────

  @Post('shift-timings')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ module: 'transport_config', action: 'create' })
  @ApiOperation({ summary: 'Create a shift timing rule' })
  async createShiftTiming(@Body() dto: CreatePickupDropTimingDto, @Req() req: any) {
    return this.service.createShiftTiming(dto, req.user.companyId, req.user.id);
  }

  @Get('shift-timings')
  @RequirePermissions({ module: 'transport_config', action: 'view' })
  @ApiOperation({ summary: 'List shift timings' })
  async listShiftTimings(@Query() query: PickupDropTimingQueryDto, @Req() req: any) {
    return this.service.listShiftTimings(req.user.companyId, query);
  }

  @Get('shift-timings/:id')
  @RequirePermissions({ module: 'transport_config', action: 'view' })
  @ApiOperation({ summary: 'Get shift timing by ID' })
  async getShiftTiming(@Param('id') id: string, @Req() req: any) {
    return this.service.getShiftTiming(id, req.user.companyId);
  }

  @Put('shift-timings/:id')
  @RequirePermissions({ module: 'transport_config', action: 'edit' })
  @ApiOperation({ summary: 'Update shift timing' })
  async updateShiftTiming(
    @Param('id') id: string,
    @Body() dto: UpdatePickupDropTimingDto,
    @Req() req: any,
  ) {
    return this.service.updateShiftTiming(id, dto, req.user.companyId);
  }

  @Delete('shift-timings/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ module: 'transport_config', action: 'delete' })
  @ApiOperation({ summary: 'Delete (deactivate) shift timing' })
  async deleteShiftTiming(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteShiftTiming(id, req.user.companyId);
  }

  // ─── Schedule Slots ─────────────────────────────────────────

  @Post('slots')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ module: 'transport_config', action: 'create' })
  @ApiOperation({ summary: 'Create a single schedule slot' })
  async createSlot(@Body() dto: CreateTransportScheduleSlotDto, @Req() req: any) {
    return this.service.createSlot(dto, req.user.companyId, req.user.id);
  }

  @Post('slots/generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ module: 'transport_config', action: 'create' })
  @ApiOperation({ summary: 'Auto-generate slots from shift timing pattern' })
  async generateSlots(@Body() dto: GenerateSlotsFromPatternDto, @Req() req: any) {
    return this.service.generateSlotsFromPattern(dto, req.user.companyId, req.user.id);
  }

  @Get('slots')
  @RequirePermissions({ module: 'transport_config', action: 'view' })
  @ApiOperation({ summary: 'List schedule slots' })
  async listSlots(@Query() query: SlotQueryDto, @Req() req: any) {
    return this.service.listSlots(req.user.companyId, query);
  }

  @Get('slots/:id')
  @RequirePermissions({ module: 'transport_config', action: 'view' })
  @ApiOperation({ summary: 'Get slot by ID' })
  async getSlot(@Param('id') id: string, @Req() req: any) {
    return this.service.getSlot(id, req.user.companyId);
  }

  @Put('slots/:id')
  @RequirePermissions({ module: 'transport_config', action: 'edit' })
  @ApiOperation({ summary: 'Update a schedule slot' })
  async updateSlot(
    @Param('id') id: string,
    @Body() dto: UpdateTransportScheduleSlotDto,
    @Req() req: any,
  ) {
    return this.service.updateSlot(id, dto, req.user.companyId);
  }

  @Delete('slots/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ module: 'transport_config', action: 'delete' })
  @ApiOperation({ summary: 'Delete (deactivate) a slot' })
  async deleteSlot(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteSlot(id, req.user.companyId);
  }

  @Post('slots/bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({ module: 'transport_config', action: 'create' })
  @ApiOperation({ summary: 'Bulk create schedule slots' })
  async bulkCreateSlots(@Body() dto: BulkCreateSlotsDto, @Req() req: any) {
    return this.service.bulkCreateSlots(dto, req.user.companyId, req.user.id);
  }

  // ─── Global Config ──────────────────────────────────────────

  @Get('settings')
  @RequirePermissions({ module: 'transport_config', action: 'view' })
  @ApiOperation({ summary: 'Get company transport schedule config' })
  async getConfig(@Req() req: any) {
    return this.service.getConfig(req.user.companyId);
  }

  @Put('settings')
  @RequirePermissions({ module: 'transport_config', action: 'edit' })
  @ApiOperation({ summary: 'Update company transport schedule config' })
  async updateConfig(@Body() dto: UpdateTransportScheduleConfigDto, @Req() req: any) {
    return this.service.updateConfig(req.user.companyId, dto);
  }

  // ─── Time Slots ──────────────────────────────────────────────

  @Get('time-slots')
  @RequirePermissions({ module: 'transport_config', action: 'view' })
  @ApiOperation({ summary: 'Get available time slots based on company config interval' })
  async getTimeSlots(@Req() req: any) {
    return this.service.getTimeSlots(req.user.companyId);
  }
}
