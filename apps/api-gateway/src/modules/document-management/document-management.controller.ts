import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { DocumentManagementService } from './document-management.service';
import {
  UploadDocumentDto,
  VerifyDocumentDto,
  RejectDocumentDto,
  ReplaceDocumentDto,
  DocumentQueryDto,
} from './dto';

@ApiTags('Document Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('api/v1/documents')
export class DocumentManagementController {
  constructor(private readonly service: DocumentManagementService) {}

  @Post()
  @RequirePermissions({ module: 'document', action: 'upload' })
  @ApiOperation({ summary: 'Upload a document' })
  async upload(@Body() dto: UploadDocumentDto, @Request() req: any) {
    return this.service.upload(req.user.companyId, dto, req.user.id);
  }

  @Get()
  @RequirePermissions({ module: 'document', action: 'view' })
  @ApiOperation({ summary: 'List documents' })
  async findAll(@Query() query: DocumentQueryDto, @Request() req: any) {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get('expiring')
  @RequirePermissions({ module: 'document', action: 'view' })
  @ApiOperation({ summary: 'Get expiring documents' })
  async getExpiring(
    @Query('days') days: number,
    @Request() req: any,
  ) {
    return this.service.getExpiringDocuments(req.user.companyId, days || 30);
  }

  @Get('expired')
  @RequirePermissions({ module: 'document', action: 'view' })
  @ApiOperation({ summary: 'Get expired documents' })
  async getExpired(@Request() req: any) {
    return this.service.getExpiredDocuments(req.user.companyId);
  }

  @Get(':documentId')
  @RequirePermissions({ module: 'document', action: 'view' })
  @ApiOperation({ summary: 'Get document by ID' })
  async findById(@Param('documentId') documentId: string, @Request() req: any) {
    return this.service.findById(req.user.companyId, documentId);
  }

  @Post(':documentId/verify')
  @RequirePermissions({ module: 'document', action: 'verify' })
  @ApiOperation({ summary: 'Verify a document' })
  async verify(
    @Param('documentId') documentId: string,
    @Body() dto: VerifyDocumentDto,
    @Request() req: any,
  ) {
    return this.service.verify(req.user.companyId, documentId, dto, req.user.id);
  }

  @Post(':documentId/reject')
  @RequirePermissions({ module: 'document', action: 'reject' })
  @ApiOperation({ summary: 'Reject a document' })
  async reject(
    @Param('documentId') documentId: string,
    @Body() dto: RejectDocumentDto,
    @Request() req: any,
  ) {
    return this.service.reject(req.user.companyId, documentId, dto, req.user.id);
  }

  @Post(':documentId/replace')
  @RequirePermissions({ module: 'document', action: 'replace' })
  @ApiOperation({ summary: 'Replace a document' })
  async replace(
    @Param('documentId') documentId: string,
    @Body() dto: ReplaceDocumentDto,
    @Request() req: any,
  ) {
    return this.service.replace(req.user.companyId, documentId, dto, req.user.id);
  }

  @Post(':documentId/archive')
  @RequirePermissions({ module: 'document', action: 'archive' })
  @ApiOperation({ summary: 'Archive a document' })
  async archive(@Param('documentId') documentId: string, @Request() req: any) {
    return this.service.archive(req.user.companyId, documentId, req.user.id);
  }
}
