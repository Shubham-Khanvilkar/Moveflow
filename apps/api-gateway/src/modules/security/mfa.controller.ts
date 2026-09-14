import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { MFAService } from './mfa.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('mfa')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class MFAController {
  constructor(private readonly mfaService: MFAService) {}

  @Get('status')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'DRIVER')
  async getStatus(@Request() req: any) {
    return this.mfaService.getStatus(req.user.id);
  }

  @Post('setup')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async setupMFA(@Request() req: any) {
    return this.mfaService.setupMFA(req.user.companyId, req.user.id);
  }

  @Post('verify-enable')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async verifyAndEnable(@Request() req: any, @Body() body: { code: string }) {
    return this.mfaService.verifyAndEnable(req.user.companyId, req.user.id, body.code);
  }

  @Post('disable')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async disableMFA(@Request() req: any, @Body() body: { code: string }) {
    return this.mfaService.disableMFA(req.user.companyId, req.user.id, body.code);
  }

  @Post('backup-codes/regenerate')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async regenerateBackupCodes(@Request() req: any) {
    return this.mfaService.regenerateBackupCodes(req.user.companyId, req.user.id);
  }
}
