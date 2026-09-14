import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('communication')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Get('preferences')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'DRIVER')
  async getPreferences(@Request() req: any) {
    return this.communicationService.getPreferences(req.user.companyId, req.user.id);
  }

  @Post('preferences')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'DRIVER')
  async updatePreferences(@Request() req: any, @Body() body: { whatsapp?: boolean; sms?: boolean; email?: boolean; push?: boolean; tripAssigned?: string; tripArriving?: string; tripCompleted?: string; emergency?: string }) {
    return this.communicationService.updatePreferences(req.user.companyId, req.user.id, body);
  }

  @Post('broadcast')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async broadcast(@Request() req: any, @Body() body: { type: string; title: string; message: string; data?: any }) {
    return this.communicationService.broadcastToCompany(req.user.companyId, body.type, body.title, body.message, body.data);
  }
}
