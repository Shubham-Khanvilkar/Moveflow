import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, ParseUUIDPipe, ParseFloatPipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NodalPointsService } from './nodal-points.service';
import { CreateNodalPointDto, UpdateNodalPointDto, NodalPointQueryDto } from './dto/nodal-point.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiBearerAuth()
@ApiTags('Nodal Points')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
@Controller('nodal-points')
export class NodalPointsController {
  constructor(private readonly service: NodalPointsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new nodal point' })
  async create(@Request() req: any, @Body() dto: CreateNodalPointDto) {
    return this.service.create(dto, req.user.companyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a nodal point' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateNodalPointDto,
  ) {
    return this.service.update(id, dto, req.user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a nodal point' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.delete(id, req.user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all nodal points' })
  async getAll(@Request() req: any, @Query() query: NodalPointQueryDto & PaginationDto) {
    return this.service.getAll(req.user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get nodal point by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.getById(id, req.user.companyId);
  }

  @Get('site/:siteId')
  @ApiOperation({ summary: 'Get nodal points by site' })
  async getBySite(@Param('siteId', ParseUUIDPipe) siteId: string, @Query() query: PaginationDto, @Request() req: any) {
    return this.service.getBySite(siteId, req.user.companyId, query);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby nodal points' })
  async getNearby(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('radius', new ParseIntPipe({ optional: true })) radius?: number,
    @Query() pagination?: PaginationDto,
    @Request() req?: any,
  ) {
    return this.service.getNearby(latitude, longitude, radius, req.user.companyId, pagination);
  }

  @Put(':id/occupancy')
  @ApiOperation({ summary: 'Update nodal point occupancy' })
  async updateOccupancy(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body('delta', ParseFloatPipe) delta: number,
  ) {
    return this.service.updateOccupancy(id, delta, req.user.companyId);
  }

  @Get('billing-zone/:billingZone')
  @ApiOperation({ summary: 'Get nodal points by billing zone' })
  async getByBillingZone(
    @Param('billingZone') billingZone: string,
    @Request() req: any,
  ) {
    return this.service.getByBillingZone(billingZone, req.user.companyId);
  }
}
