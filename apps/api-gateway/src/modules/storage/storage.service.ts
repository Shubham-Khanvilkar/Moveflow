import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

export interface FileMetadata {
  id: string;
  companyId: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedBy?: string;
  category?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadFileOptions {
  category?: string;
  description?: string;
  uploadedBy?: string;
}

export interface ListFilesParams {
  page?: number;
  limit?: number;
  category?: string;
  mimeType?: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // LOCAL JSON MANIFEST HELPERS
  // ============================================================

  private getCompanyDir(companyId: string): string {
    return path.join(UPLOADS_ROOT, companyId);
  }

  private getManifestPath(companyId: string): string {
    return path.join(this.getCompanyDir(companyId), '.manifest.json');
  }

  private readManifest(companyId: string): FileMetadata[] {
    const manifestPath = this.getManifestPath(companyId);
    if (!fs.existsSync(manifestPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  private writeManifest(companyId: string, files: FileMetadata[]): void {
    const manifestPath = this.getManifestPath(companyId);
    fs.writeFileSync(manifestPath, JSON.stringify(files, null, 2), 'utf-8');
  }

  private appendToManifest(companyId: string, entry: FileMetadata): void {
    const files = this.readManifest(companyId);
    files.push(entry);
    this.writeManifest(companyId, files);
  }

  private removeFromManifest(companyId: string, fileId: string): FileMetadata | null {
    const files = this.readManifest(companyId);
    const idx = files.findIndex((f) => f.id === fileId);
    if (idx === -1) return null;
    const [removed] = files.splice(idx, 1);
    this.writeManifest(companyId, files);
    return removed;
  }

  private updateInManifest(companyId: string, fileId: string, patch: Partial<FileMetadata>): FileMetadata | null {
    const files = this.readManifest(companyId);
    const idx = files.findIndex((f) => f.id === fileId);
    if (idx === -1) return null;
    files[idx] = { ...files[idx], ...patch, updatedAt: new Date().toISOString() };
    this.writeManifest(companyId, files);
    return files[idx];
  }

  // ============================================================
  // UPLOAD
  // ============================================================

  async uploadFile(
    file: Express.Multer.File,
    companyId: string,
    options?: UploadFileOptions,
  ): Promise<FileMetadata> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${fileId}${ext}`;
    const companyDir = this.getCompanyDir(companyId);

    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }

    const destPath = path.join(companyDir, filename);

    try {
      if (file.buffer) {
        fs.writeFileSync(destPath, file.buffer);
      } else if (file.path) {
        fs.copyFileSync(file.path, destPath);
      } else {
        throw new BadRequestException('File has no content');
      }
    } catch (err: any) {
      this.logger.error(`Failed to write file: ${err.message}`);
      throw new BadRequestException(`Failed to store file: ${err.message}`);
    }

    const metadata: FileMetadata = {
      id: fileId,
      companyId,
      originalName: file.originalname,
      filename,
      mimeType: file.mimetype,
      size: file.size,
      path: destPath,
      uploadedBy: options?.uploadedBy,
      category: options?.category,
      description: options?.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.appendToManifest(companyId, metadata);
    this.logger.log(`File uploaded: ${fileId} (${file.originalname}) for company ${companyId}`);

    return metadata;
  }

  // ============================================================
  // GET FILE INFO
  // ============================================================

  async getFile(fileId: string): Promise<FileMetadata> {
    const companies = fs.readdirSync(UPLOADS_ROOT).filter((d) => {
      const full = path.join(UPLOADS_ROOT, d);
      return fs.statSync(full).isDirectory();
    });

    for (const companyId of companies) {
      const files = this.readManifest(companyId);
      const found = files.find((f) => f.id === fileId);
      if (found) return found;
    }

    throw new NotFoundException(`File with id "${fileId}" not found`);
  }

  // ============================================================
  // GET FILE PATH (for serving)
  // ============================================================

  async getFilePath(fileId: string): Promise<{ filePath: string; mimeType: string; originalName: string }> {
    const metadata = await this.getFile(fileId);

    if (!fs.existsSync(metadata.path)) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      filePath: metadata.path,
      mimeType: metadata.mimeType,
      originalName: metadata.originalName,
    };
  }

  // ============================================================
  // DELETE FILE
  // ============================================================

  async deleteFile(fileId: string, companyId: string): Promise<{ deleted: boolean }> {
    const removed = this.removeFromManifest(companyId, fileId);

    if (!removed) {
      throw new NotFoundException(`File with id "${fileId}" not found in company ${companyId}`);
    }

    if (fs.existsSync(removed.path)) {
      fs.unlinkSync(removed.path);
    }

    this.logger.log(`File deleted: ${fileId} from company ${companyId}`);
    return { deleted: true };
  }

  // ============================================================
  // LIST FILES
  // ============================================================

  async listFiles(companyId: string, params?: ListFilesParams) {
    if (this.prisma.isConnected()) {
      return this.listFilesFromDb(companyId, params);
    }

    return this.listFilesFromManifest(companyId, params);
  }

  private listFilesFromManifest(companyId: string, params?: ListFilesParams) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    let files = this.readManifest(companyId);

    if (params?.category) {
      files = files.filter((f) => f.category === params.category);
    }
    if (params?.mimeType) {
      files = files.filter((f) => f.mimeType === params.mimeType);
    }

    files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = files.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = files.slice(start, start + limit);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  private async listFilesFromDb(companyId: string, params?: ListFilesParams) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params?.category) where.category = params.category;
    if (params?.mimeType) where.mimeType = params.mimeType;

    const [data, total] = await Promise.all([
      this.prisma.documentUpload.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.documentUpload.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
