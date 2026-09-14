import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImpersonationService, StartImpersonationDto } from './impersonation.service';

@ApiTags('Impersonation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessScopeGuard)
@Controller('api/v1/platform/impersonation')
export class ImpersonationController {
  constructor(private readonly service: ImpersonationService) {}

  @Post('start')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Start an impersonation session' })
  async start(@Body() dto: StartImpersonationDto, @Request() req: any) {
    return this.service.startSession(req.user.id, req.user.role, dto, req.user.companyId);
  }

  @Post(':sessionId/end')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'End an impersonation session' })
  async end(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.service.endSession(sessionId, req.user.id, req.user.companyId);
  }

  @Get('my-sessions')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'List my impersonation sessions' })
  async mySessions(@Request() req: any) {
    return this.service.getMySessions(req.user.id);
  }

  @Get(':sessionId/validate')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Validate an impersonation session' })
  async validate(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.service.validateSession(sessionId, req.user.id);
  }
}
