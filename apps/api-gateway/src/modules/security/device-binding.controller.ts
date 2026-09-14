import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { DeviceBindingService } from './device-binding.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('devices')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class DeviceBindingController {
  constructor(private readonly deviceService: DeviceBindingService) {}

  @Get()
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'DRIVER')
  async getDevices(@Request() req: any) {
    return this.deviceService.getDevices(req.user.companyId, req.user.id);
  }

  @Post('register')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'DRIVER')
  async registerDevice(@Request() req: any, @Body() body: { deviceFingerprint: string; deviceName: string; platform: string; appVersion?: string; osVersion?: string; ipAddress?: string }) {
    return this.deviceService.registerDevice(req.user.companyId, req.user.id, body);
  }

  @Post('validate')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'DRIVER')
  async validateDevice(@Request() req: any, @Body() body: { deviceFingerprint: string }) {
    return this.deviceService.validateDevice(req.user.id, body.deviceFingerprint);
  }

  @Delete(':deviceId')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'DRIVER')
  async deactivateDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    return this.deviceService.deactivateDevice(req.user.companyId, req.user.id, deviceId);
  }

  @Post(':deviceId/trust')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async trustDevice(@Request() req: any, @Param('deviceId') deviceId: string) {
    return this.deviceService.trustDevice(req.user.companyId, req.user.id, deviceId);
  }

  @Delete('all/revoke')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async revokeAll(@Request() req: any) {
    return this.deviceService.revokeAllDevices(req.user.companyId, req.user.id);
  }
}
