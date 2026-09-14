import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class ApiKeyService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createApiKey(
    data: {
      name: string;
      companyId: string;
      userId?: string;
      scopes?: string[];
      expiresAt?: Date;
    },
    actorUserId?: string,
  ) {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('API key name is required');
    }

    const rawKey = this.generateApiKey(data.companyId.slice(0, 6).toUpperCase());
    const keyHash = this.hashKey(rawKey);
    const prefix = rawKey.split('.')[0];

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: data.name,
        keyHash,
        prefix,
        companyId: data.companyId,
        userId: data.userId,
        scopes: data.scopes || [],
        expiresAt: data.expiresAt,
        status: 'ACTIVE',
      },
    });

    await this.audit.log({
      companyId: data.companyId,
      userId: actorUserId || 'system',
      action: 'API_KEY_CREATED',
      entity: 'ApiKey',
      entityId: apiKey.id,
      newValue: { name: data.name, prefix },
    });

    // Return raw key ONCE
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      apiKey: rawKey,
    };
  }

  async listApiKeys(companyId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        status: true,
        createdAt: true,
      },
    });
    return keys;
  }

  async revokeApiKey(companyId: string, keyId: string, actorUserId?: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, companyId } });
    if (!key) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.audit.log({
      companyId,
      userId: actorUserId || 'system',
      action: 'API_KEY_REVOKED',
      entity: 'ApiKey',
      entityId: keyId,
      newValue: { name: key.name },
    });

    return { message: 'API key revoked' };
  }

  private generateApiKey(companyPrefix: string): string {
    const secret = crypto.randomBytes(24).toString('base64url');
    return `${companyPrefix}.${secret}`;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}
