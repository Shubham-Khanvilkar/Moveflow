import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EmergencyBuzzerService } from './emergency-buzzer.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('dashboard/emergency')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class EmergencyBuzzerController {
  constructor(private readonly emergencyService: EmergencyBuzzerService) {}

  @Post('trigger')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'SAFETY_OFFICER', 'SUPERVISOR')
  async triggerEmergency(@Request() req: any, @Body() body: { triggerType: string; description?: string; latitude?: number; longitude?: number; address?: string }) {
    return this.emergencyService.triggerEmergency(req.user.companyId, req.user.id, body);
  }

  @Post(':emergencyId/acknowledge')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async acknowledgeEmergency(@Request() req: any, @Param('emergencyId') emergencyId: string) {
    return this.emergencyService.acknowledgeEmergency(req.user.companyId, emergencyId, req.user.id);
  }

  @Post(':emergencyId/dispatch')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async dispatchVehicles(@Request() req: any, @Param('emergencyId') emergencyId: string, @Body() body: { vehicleIds: string[] }) {
    return this.emergencyService.dispatchVehicles(req.user.companyId, emergencyId, body.vehicleIds, req.user.id);
  }

  @Post(':emergencyId/resolve')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN')
  async resolveEmergency(@Request() req: any, @Param('emergencyId') emergencyId: string, @Body() body: { notes?: string; falseAlarm?: boolean }) {
    return this.emergencyService.resolveEmergency(req.user.companyId, emergencyId, req.user.id, body.notes, body.falseAlarm);
  }

  @Get('active')
  async getActiveEmergencies(@Request() req: any) { return this.emergencyService.getActiveEmergencies(req.user.companyId); }

  @Get()
  async getEmergencies(@Request() req: any, @Query('status') status?: string, @Query('triggerType') triggerType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.emergencyService.getEmergencies(req.user.companyId, { status, triggerType, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Get('contacts')
  async getEmergencyContacts(@Request() req: any) { return this.emergencyService.getEmergencyContacts(req.user.companyId); }

  @Post('contacts')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async createEmergencyContact(@Request() req: any, @Body() body: any) { return this.emergencyService.createEmergencyContact(req.user.companyId, body, req.user.id); }

  @Put('contacts/:contactId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async updateEmergencyContact(@Request() req: any, @Param('contactId') contactId: string, @Body() body: any) { return this.emergencyService.updateEmergencyContact(req.user.companyId, contactId, body); }

  @Delete('contacts/:contactId')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'TRANSPORT_ADMIN')
  async deleteEmergencyContact(@Request() req: any, @Param('contactId') contactId: string) { return this.emergencyService.deleteEmergencyContact(req.user.companyId, contactId); }
}
