import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { StorageService } from './storage.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ============================================================
  // UPLOAD FILE
  // ============================================================

  @Post('upload')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'DRIVER', 'MAINTENANCE_USER')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Tenant() companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category?: string,
    @Query('description') description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided. Use multipart/form-data with field "file".');
    }

    return this.storageService.uploadFile(file, companyId, {
      category,
      description,
    });
  }

  // ============================================================
  // GET FILE INFO
  // ============================================================

  @Get(':id')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'DRIVER', 'MAINTENANCE_USER', 'CONTROL_ROOM_USER')
  async getFile(@Param('id') id: string) {
    return this.storageService.getFile(id);
  }

  // ============================================================
  // DOWNLOAD FILE
  // ============================================================

  @Get(':id/download')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'DRIVER', 'MAINTENANCE_USER', 'CONTROL_ROOM_USER')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const { filePath, mimeType, originalName } = await this.storageService.getFilePath(id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  // ============================================================
  // DELETE FILE
  // ============================================================

  @Delete(':id')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Tenant() companyId: string, @Param('id') id: string) {
    return this.storageService.deleteFile(id, companyId);
  }

  // ============================================================
  // LIST FILES
  // ============================================================

  @Get()
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'DRIVER', 'MAINTENANCE_USER', 'CONTROL_ROOM_USER')
  async listFiles(
    @Tenant() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('mimeType') mimeType?: string,
  ) {
    return this.storageService.listFiles(companyId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      category,
      mimeType,
    });
  }
}
