import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { VehicleTypeService } from './vehicle-type.service';
import { CreateVehicleTypeDto, UpdateVehicleTypeDto, VehicleTypeQueryDto } from './dto/vehicle-type.dto';

@ApiTags('Vehicle Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('vehicle-types')
export class VehicleTypeController {
  constructor(private readonly service: VehicleTypeService) {}

  @Get()
  @RequirePermissions({ module: 'vehicle_type', action: 'view' })
  @ApiOperation({ summary: 'Get all vehicle types' })
  async getAll(@Tenant() companyId: string, @Query() query: VehicleTypeQueryDto & PaginationDto) {
    return this.service.getAll(companyId, query);
  }

  @Get(':id')
  @RequirePermissions({ module: 'vehicle_type', action: 'view' })
  @ApiOperation({ summary: 'Get vehicle type by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string, @Tenant() companyId: string) {
    return this.service.getById(id, companyId);
  }

  @Post()
  @RequirePermissions({ module: 'vehicle_type', action: 'create' })
  @ApiOperation({ summary: 'Create a new vehicle type' })
  async create(@Tenant() companyId: string, @Body() dto: CreateVehicleTypeDto) {
    return this.service.create(dto, companyId);
  }

  @Put(':id')
  @RequirePermissions({ module: 'vehicle_type', action: 'edit' })
  @ApiOperation({ summary: 'Update a vehicle type' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() companyId: string,
    @Body() dto: UpdateVehicleTypeDto,
  ) {
    return this.service.update(id, dto, companyId);
  }

  @Delete(':id')
  @RequirePermissions({ module: 'vehicle_type', action: 'edit' })
  @ApiOperation({ summary: 'Delete a vehicle type' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Tenant() companyId: string) {
    return this.service.delete(id, companyId);
  }
}
