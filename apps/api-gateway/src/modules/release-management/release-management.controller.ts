import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ReleaseManagementService,
  CreateReleaseDto,
  RollbackReleaseDto,
} from './release-management.service';

@ApiTags('Release Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AccessScopeGuard)
@Controller('api/v1/platform/releases')
export class ReleaseManagementController {
  constructor(private readonly service: ReleaseManagementService) {}

  @Post()
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Create a new release' })
  async create(@Body() dto: CreateReleaseDto, @Request() req: any) {
    return this.service.createRelease(dto, req.user.id, req.user.companyId);
  }

  @Get()
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_PLATFORM_AUDITOR')
  @ApiOperation({ summary: 'List all releases' })
  async findAll(@Request() req: any) {
    return this.service.findAll();
  }

  @Get('latest')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Get latest verified release' })
  async getLatest(@Request() req: any) {
    return this.service.getLatestRelease();
  }

  @Get(':id')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_PLATFORM_AUDITOR')
  @ApiOperation({ summary: 'Get release by ID' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.service.findById(id);
  }

  @Post(':id/approve')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Approve a release' })
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.service.approveRelease(id, req.user.id, req.user.companyId);
  }

  @Post(':id/deploy')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Deploy a release' })
  async deploy(@Param('id') id: string, @Request() req: any) {
    return this.service.deployRelease(id, req.user.id, req.user.companyId);
  }

  @Post(':id/verify')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Verify a deployed release' })
  async verify(@Param('id') id: string, @Request() req: any) {
    return this.service.verifyRelease(id, req.user.id, req.user.companyId);
  }

  @Post('rollback')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Rollback a release' })
  async rollback(@Body() dto: RollbackReleaseDto, @Request() req: any) {
    return this.service.rollback(dto, req.user.id, req.user.companyId);
  }
}
