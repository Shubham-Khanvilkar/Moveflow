import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { TripSharingService } from './trip-sharing.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('trip-sharing')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class TripSharingController {
  constructor(private readonly sharingService: TripSharingService) {}

  @Get('contacts')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN')
  async getContacts(@Request() req: any) {
    return this.sharingService.getContacts(req.user.companyId, req.user.id);
  }

  @Post('contacts')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN')
  async addContact(@Request() req: any, @Body() body: { name: string; phone: string; email?: string; relationship: string }) {
    return this.sharingService.addContact(req.user.companyId, req.user.id, body);
  }

  @Delete('contacts/:contactId')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN')
  async removeContact(@Request() req: any, @Param('contactId') contactId: string) {
    return this.sharingService.removeContact(req.user.companyId, req.user.id, contactId);
  }
}
