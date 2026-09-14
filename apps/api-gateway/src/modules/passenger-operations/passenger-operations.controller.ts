import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { PassengerOperationsService } from './passenger-operations.service';
import {
  MovePassengerDto,
  MoveMultiplePassengersDto,
  AddPassengerDto,
  RemovePassengerDto,
} from './passenger-operations.service';

@ApiTags('Passenger Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('api/v1/passengers')
export class PassengerOperationsController {
  constructor(private readonly service: PassengerOperationsService) {}

  @Get('trip/:tripId')
  @RequirePermissions({ module: 'booking', action: 'view' })
  @ApiOperation({ summary: 'Get all passengers on a trip' })
  async getTripPassengers(@Param('tripId') tripId: string, @Request() req: any) {
    return this.service.getTripPassengers(req.user.companyId, tripId);
  }

  @Post('move')
  @RequirePermissions({ module: 'booking', action: 'edit' })
  @ApiOperation({ summary: 'Move a single passenger between trips' })
  async movePassenger(@Body() dto: MovePassengerDto, @Request() req: any) {
    return this.service.movePassenger(req.user.companyId, dto, req.user.id);
  }

  @Post('move-bulk')
  @RequirePermissions({ module: 'booking', action: 'edit' })
  @ApiOperation({ summary: 'Move multiple passengers between trips' })
  async moveMultiplePassengers(@Body() dto: MoveMultiplePassengersDto, @Request() req: any) {
    return this.service.moveMultiplePassengers(req.user.companyId, dto, req.user.id);
  }

  @Post('add')
  @RequirePermissions({ module: 'booking', action: 'edit' })
  @ApiOperation({ summary: 'Add a passenger to a trip' })
  async addPassenger(@Body() dto: AddPassengerDto, @Request() req: any) {
    return this.service.addPassenger(req.user.companyId, dto, req.user.id);
  }

  @Delete(':passengerId')
  @RequirePermissions({ module: 'booking', action: 'edit' })
  @ApiOperation({ summary: 'Remove a passenger from a trip' })
  async removePassenger(
    @Param('passengerId') passengerId: string,
    @Body() dto: { tripId: string; reason: string },
    @Request() req: any,
  ) {
    return this.service.removePassenger(req.user.companyId, { ...dto, passengerId }, req.user.id);
  }

  @Get('history/:tripId')
  @RequirePermissions({ module: 'booking', action: 'view' })
  @ApiOperation({ summary: 'Get passenger movement history for a trip' })
  async getTripPassengerHistory(@Param('tripId') tripId: string, @Request() req: any) {
    return this.service.getTripPassengerHistory(req.user.companyId, tripId);
  }
}
