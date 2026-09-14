import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AdditionalPickupDropService } from './additional-pickup-drop.service';
import { CreatePickupDropDto, UpdatePickupDropDto, PickupDropQueryDto } from './dto/additional-pickup-drop.dto';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Additional Pickup/Drop')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('pickup-drop')
export class AdditionalPickupDropController {
  constructor(private readonly pickupDropService: AdditionalPickupDropService) {}

  @Post()
  @RequirePermissions({ module: 'schedule', action: 'additional_pickup' })
  @ApiOperation({ summary: 'Create a new pickup/drop' })
  async create(@Body() dto: CreatePickupDropDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.pickupDropService.create(dto, companyId, userId);
  }

  @Put(':id')
  @RequirePermissions({ module: 'schedule', action: 'additional_pickup' })
  @ApiOperation({ summary: 'Update a pickup/drop' })
  async update(@Param('id') id: string, @Body() dto: UpdatePickupDropDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.pickupDropService.update(id, dto, companyId, userId);
  }

  @Delete(':id')
  @RequirePermissions({ module: 'schedule', action: 'additional_pickup' })
  @ApiOperation({ summary: 'Cancel a pickup/drop' })
  async cancel(@Param('id') id: string, @Req() req: Request, @Query('reason') reason?: string) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.pickupDropService.cancel(id, companyId, userId, reason);
  }

  @Get('user/:userId/date/:date')
  @RequirePermissions({ module: 'schedule', action: 'view' })
  @ApiOperation({ summary: 'Get pickup/drop by user and date' })
  async getByUserAndDate(
    @Param('userId') userId: string,
    @Param('date') date: string,
    @Query() query: PaginationDto,
    @Req() req: Request,
  ) {
    const companyId = (req.user as any).companyId;
    return this.pickupDropService.getByUserAndDate(userId, date, companyId, query);
  }

  @Get('range')
  @RequirePermissions({ module: 'schedule', action: 'view' })
  @ApiOperation({ summary: 'Get pickup/drops by date range' })
  async getByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query() query: PickupDropQueryDto & PaginationDto,
    @Req() req: Request,
  ) {
    const companyId = (req.user as any).companyId;
    return this.pickupDropService.getByDateRange(startDate, endDate, companyId, query);
  }

  @Get(':id')
  @RequirePermissions({ module: 'schedule', action: 'view' })
  @ApiOperation({ summary: 'Get pickup/drop by ID' })
  async getById(@Param('id') id: string, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.pickupDropService.getById(id, companyId);
  }

  @Get(':id/history')
  @RequirePermissions({ module: 'schedule', action: 'history.view' })
  @ApiOperation({ summary: 'Get pickup/drop history' })
  async getHistory(@Param('id') id: string, @Query() query: PaginationDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.pickupDropService.getHistory(id, companyId, query);
  }

  @Put(':id/reorder')
  @RequirePermissions({ module: 'schedule', action: 'additional_pickup' })
  @ApiOperation({ summary: 'Reorder pickup/drop sequence' })
  async reorder(
    @Param('id') id: string,
    @Body('sequenceOrder') sequenceOrder: number,
    @Req() req: Request,
  ) {
    const companyId = (req.user as any).companyId;
    return this.pickupDropService.reorder(id, sequenceOrder, companyId);
  }
}
