import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { CompanyContactsService } from './company-contacts.service';
import {
  CreateCompanyContactDto,
  UpdateCompanyContactDto,
  ImportContactsDto,
  CompanyContactQueryDto,
} from './dto';

@ApiTags('Company Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
@Controller('api/v1/platform/companies/:companyId/contacts')
export class CompanyContactsController {
  constructor(private readonly service: CompanyContactsService) {}

  @Post()
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Create a company contact' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCompanyContactDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.id);
  }

  @Get()
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_CLIENT_SUCCESS_MANAGER')
  @ApiOperation({ summary: 'List company contacts' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query() query: CompanyContactQueryDto,
  ) {
    return this.service.findAll(companyId, query);
  }

  @Get('stats')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Get contact directory stats' })
  async getStats(@Param('companyId') companyId: string) {
    return this.service.getDirectoryStats(companyId);
  }

  @Get(':contactId')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_CLIENT_SUCCESS_MANAGER')
  @ApiOperation({ summary: 'Get contact by ID' })
  async findById(
    @Param('companyId') companyId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.service.findById(companyId, contactId);
  }

  @Patch(':contactId')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Update a company contact' })
  async update(
    @Param('companyId') companyId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateCompanyContactDto,
    @Request() req: any,
  ) {
    return this.service.update(companyId, contactId, dto, req.user.id);
  }

  @Post(':contactId/deactivate')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Deactivate a contact' })
  async deactivate(
    @Param('companyId') companyId: string,
    @Param('contactId') contactId: string,
    @Request() req: any,
  ) {
    return this.service.deactivate(companyId, contactId, req.user.id);
  }

  @Post(':contactId/reactivate')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Reactivate a contact' })
  async reactivate(
    @Param('companyId') companyId: string,
    @Param('contactId') contactId: string,
    @Request() req: any,
  ) {
    return this.service.reactivate(companyId, contactId, req.user.id);
  }

  @Post('import')
  @Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  @ApiOperation({ summary: 'Bulk import contacts' })
  async import(
    @Param('companyId') companyId: string,
    @Body() dto: ImportContactsDto,
    @Request() req: any,
  ) {
    return this.service.import(companyId, dto, req.user.id);
  }
}
