import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'NAVIRA_PLATFORM_ADMINISTRATOR')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async createApiKey(
    @Request() req: any,
    @Body() body: { name: string; scopes?: string[]; expiresAt?: Date; userId?: string },
  ) {
    return this.apiKeyService.createApiKey(
      {
        name: body.name,
        companyId: req.user.companyId,
        userId: body.userId,
        scopes: body.scopes,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
      req.user.sub,
    );
  }

  @Get()
  async listApiKeys(@Request() req: any) {
    return this.apiKeyService.listApiKeys(req.user.companyId);
  }

  @Delete(':id')
  async revokeApiKey(@Request() req: any, @Param('id') id: string) {
    return this.apiKeyService.revokeApiKey(req.user.companyId, id, req.user.sub);
  }
}
