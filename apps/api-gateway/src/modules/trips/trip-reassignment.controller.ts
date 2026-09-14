import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TripReassignmentService } from './trip-reassignment.service';

@ApiTags('Trip Reassignment')
@Controller('trips/reassignment')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER')
export class TripReassignmentController {
  constructor(private readonly reassignmentService: TripReassignmentService) {}

  @Post(':tripId/reassign')
  @ApiOperation({ summary: 'Reassign entire trip to new driver/vehicle' })
  async reassignTrip(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { newDriverId: string; newVehicleId: string; reason: string },
  ) {
    return this.reassignmentService.reassignTrip(
      req.user.companyId, tripId, body, req.user.sub,
    );
  }

  @Post(':tripId/move-passenger')
  @ApiOperation({ summary: 'Move a single passenger between trips' })
  async movePassenger(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { employeeId: string; toTripId: string; reason: string },
  ) {
    return this.reassignmentService.movePassenger(
      req.user.companyId, tripId, body, req.user.sub,
    );
  }

  @Post(':tripId/bulk-move-preview')
  @ApiOperation({ summary: 'Preview bulk passenger move' })
  async previewBulkMove(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { employeeIds: string[]; toTripId: string },
  ) {
    return this.reassignmentService.previewBulkMove(
      req.user.companyId, tripId, body.employeeIds, body.toTripId,
    );
  }

  @Post(':tripId/bulk-move')
  @ApiOperation({ summary: 'Execute bulk passenger move' })
  async bulkMovePassengers(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { employeeIds: string[]; toTripId: string; reason: string },
  ) {
    return this.reassignmentService.bulkMovePassengers(
      req.user.companyId, tripId, body, req.user.sub,
    );
  }

  @Post(':tripId/release-capacity')
  @ApiOperation({ summary: 'Release capacity from a trip' })
  async releaseCapacity(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { employeeId: string; reason: string },
  ) {
    return this.reassignmentService.releaseCapacity(
      req.user.companyId, tripId, body.employeeId, body.reason,
    );
  }

  @Post('onboard/:employeeId')
  @ApiOperation({ summary: 'Onboard employee to transport' })
  async onboardEmployee(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
    @Body() body: { reason?: string },
  ) {
    return this.reassignmentService.onboardEmployee(
      req.user.companyId, employeeId, body, req.user.sub,
    );
  }

  @Post('offboard/:employeeId')
  @ApiOperation({ summary: 'Offboard employee from transport' })
  async offboardEmployee(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
    @Body() body: { reason?: string },
  ) {
    return this.reassignmentService.offboardEmployee(
      req.user.companyId, employeeId, body, req.user.sub,
    );
  }
}
