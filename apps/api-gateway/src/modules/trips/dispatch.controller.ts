import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DispatchEngineService } from './dispatch-engine.service';
import { DispatchBoardService } from './dispatch-board.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@ApiTags('Dispatch')
@Controller('dispatch')
@UseGuards(AccessScopeGuard)
@Auth({ roles: ['COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'NAVIRA_PLATFORM_ADMINISTRATOR'] })
export class DispatchController {
  constructor(
    private readonly dispatchEngine: DispatchEngineService,
    private readonly dispatchBoard: DispatchBoardService,
  ) {}

  @Post('auto/:bookingId')
  @ApiOperation({ summary: 'Auto-dispatch a booking to the best available driver' })
  @ApiResponse({ status: 200, description: 'Booking dispatched successfully' })
  async autoDispatch(
    @Request() req: any,
    @Param('bookingId') bookingId: string,
  ) {
    return this.dispatchEngine.autoDispatch(req.user.companyId, bookingId);
  }

  @Post('manual/:tripId')
  @ApiOperation({ summary: 'Manually assign a driver and vehicle to a trip' })
  @ApiResponse({ status: 200, description: 'Driver assigned successfully' })
  async manualDispatch(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { driverId: string; vehicleId: string },
  ) {
    return this.dispatchEngine.manualDispatch(
      req.user.companyId,
      tripId,
      body.driverId,
      body.vehicleId,
      req.user.sub,
    );
  }

  @Get('sla')
  @ApiOperation({ summary: 'Get dispatch SLA metrics' })
  async getDispatchSLA(@Request() req: any) {
    return this.dispatchEngine.getDispatchSLA(req.user.companyId);
  }

  @Get('empty-km')
  @ApiOperation({ summary: 'Get empty km report' })
  async getEmptyKmReport(
    @Request() req: any,
    @Query() params: { from?: string; to?: string },
  ) {
    return this.dispatchEngine.getEmptyKmReport(req.user.companyId, params);
  }

  @Get('factors')
  @ApiOperation({ summary: 'Get dispatch scoring factors' })
  async dispatchFactors(@Request() req: any) {
    return this.dispatchEngine.dispatchFactors(req.user.companyId);
  }

  @Post('override-audit/:tripId')
  @ApiOperation({ summary: 'Record dispatch override audit' })
  async dispatchOverrideAudit(
    @Request() req: any,
    @Param('tripId') tripId: string,
    @Body() body: { reason: string },
  ) {
    return this.dispatchEngine.dispatchOverrideAudit(
      req.user.companyId,
      tripId,
      req.user.sub,
      body.reason,
    );
  }

  @Get('board')
  @ApiOperation({ summary: 'Get dispatch board overview' })
  @ApiResponse({ status: 200, description: 'Dispatch board data returned successfully' })
  async getDispatchBoard(@Request() req: any) {
    return this.dispatchBoard.getDispatchBoard(req.user.companyId);
  }
}
