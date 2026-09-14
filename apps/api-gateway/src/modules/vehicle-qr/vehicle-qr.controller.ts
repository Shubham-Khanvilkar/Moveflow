import {
  Controller, Get, Post, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { VehicleQRService } from './vehicle-qr.service';
import { GenerateQRDto, ScanQRDto } from './vehicle-qr.service';

@ApiTags('Vehicle QR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('v1/vehicle-qr')
export class VehicleQRController {
  constructor(private readonly service: VehicleQRService) {}

  @Post('generate')
  @RequirePermissions({ module: 'vehicle', action: 'create' })
  @ApiOperation({ summary: 'Generate QR code for vehicle' })
  async generate(@Body() dto: GenerateQRDto, @Request() req: any) {
    return this.service.generate(req.user.companyId, dto, req.user.id);
  }

  @Post('scan')
  @RequirePermissions({ module: 'vehicle', action: 'view' })
  @ApiOperation({ summary: 'Scan and validate QR code' })
  async scan(@Body() dto: ScanQRDto, @Request() req: any) {
    return this.service.scan(req.user.companyId, dto, req.user.id);
  }

  @Post(':qrId/revoke')
  @RequirePermissions({ module: 'vehicle', action: 'edit' })
  @ApiOperation({ summary: 'Revoke QR code' })
  async revoke(
    @Param('qrId') qrId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.service.revoke(req.user.companyId, qrId, req.user.id, reason);
  }

  @Get('vehicle/:vehicleId')
  @RequirePermissions({ module: 'vehicle', action: 'view' })
  @ApiOperation({ summary: 'Get QR codes for vehicle' })
  async getVehicleQRs(@Param('vehicleId') vehicleId: string, @Request() req: any) {
    return this.service.getVehicleQRs(req.user.companyId, vehicleId);
  }

  @Get('active')
  @RequirePermissions({ module: 'vehicle', action: 'view' })
  @ApiOperation({ summary: 'Get all active QR codes' })
  async getActiveQRs(@Request() req: any) {
    return this.service.getActiveQRs(req.user.companyId);
  }

  @Get('scan-history')
  @RequirePermissions({ module: 'vehicle', action: 'view' })
  @ApiOperation({ summary: 'Get QR scan history' })
  async getScanHistory(
    @Query('vehicleId') vehicleId: string,
    @Request() req: any,
  ) {
    return this.service.getScanHistory(req.user.companyId, vehicleId);
  }
}
