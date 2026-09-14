import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EmployeeAddressService } from './employee-address.service';
import { CreateAddressDto, UpdateAddressDto, AddressQueryDto } from './dto/employee-address.dto';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Employee Addresses')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('employee-addresses')
export class EmployeeAddressController {
  constructor(private readonly addressService: EmployeeAddressService) {}

  @Post()
  @RequirePermissions({ module: 'employee', action: 'address.edit' })
  @ApiOperation({ summary: 'Create a new address' })
  async create(@Body() dto: CreateAddressDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.addressService.create(dto, companyId, userId);
  }

  @Put(':id')
  @RequirePermissions({ module: 'employee', action: 'address.edit' })
  @ApiOperation({ summary: 'Update an address' })
  async update(@Param('id') id: string, @Body() dto: UpdateAddressDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.addressService.update(id, dto, companyId, userId);
  }

  @Post(':id/activate')
  @RequirePermissions({ module: 'employee', action: 'address.edit' })
  @ApiOperation({ summary: 'Activate an address' })
  async activate(@Param('id') id: string, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.addressService.activate(id, companyId, userId);
  }

  @Post(':id/deactivate')
  @RequirePermissions({ module: 'employee', action: 'address.edit' })
  @ApiOperation({ summary: 'Deactivate an address' })
  async deactivate(@Param('id') id: string, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.addressService.deactivate(id, companyId, userId);
  }

  @Put(':id/default')
  @RequirePermissions({ module: 'employee', action: 'address.edit' })
  @ApiOperation({ summary: 'Set address as default' })
  async setDefault(@Param('id') id: string, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return this.addressService.setDefault(id, companyId, userId);
  }

  @Get()
  @RequirePermissions({ module: 'employee', action: 'address.view' })
  @ApiOperation({ summary: 'Get all addresses for company' })
  async getAll(@Query() query: PaginationDto & { search?: string; status?: string; addressType?: string }, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.addressService.getAll(companyId, query);
  }

  @Get('expiring')
  @RequirePermissions({ module: 'employee', action: 'address.view' })
  @ApiOperation({ summary: 'Get expiring addresses' })
  async getExpiringAddresses(@Query('days') days: string, @Query() query: PaginationDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.addressService.getExpiringAddresses(companyId, days ? parseInt(days, 10) : undefined, query);
  }

  @Get('user/:userId')
  @RequirePermissions({ module: 'employee', action: 'address.view' })
  @ApiOperation({ summary: 'Get addresses by user' })
  async getByUser(@Param('userId') userId: string, @Query() query: PaginationDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.addressService.getByUser(userId, companyId, query);
  }

  @Get('user/:userId/active')
  @RequirePermissions({ module: 'employee', action: 'address.view' })
  @ApiOperation({ summary: 'Get active addresses by user' })
  async getActiveByUser(@Param('userId') userId: string, @Query() query: PaginationDto, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.addressService.getActiveByUser(userId, companyId, query);
  }

  @Post(':id/verify')
  @RequirePermissions({ module: 'employee', action: 'address.edit' })
  @ApiOperation({ summary: 'Verify an address' })
  async verify(@Param('id') id: string, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    const verifiedById = (req.user as any).id;
    return this.addressService.verify(id, companyId, verifiedById);
  }

  @Post(':id/reject')
  @RequirePermissions({ module: 'employee', action: 'address.edit' })
  @ApiOperation({ summary: 'Reject an address' })
  async reject(@Param('id') id: string, @Body('reason') reason: string, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.addressService.reject(id, companyId, reason);
  }

  @Get(':id')
  @RequirePermissions({ module: 'employee', action: 'address.view' })
  @ApiOperation({ summary: 'Get address by ID' })
  async getById(@Param('id') id: string, @Req() req: Request) {
    const companyId = (req.user as any).companyId;
    return this.addressService.getById(id, companyId);
  }
}
