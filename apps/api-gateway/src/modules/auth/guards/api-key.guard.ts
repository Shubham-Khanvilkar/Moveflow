import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    if (!this.prisma.isConnected()) {
      throw new UnauthorizedException('API key verification unavailable');
    }

    const { prefix, keyHash } = this.parseApiKey(apiKey);

    const record = await this.prisma.apiKey.findFirst({
      where: { prefix, keyHash, status: 'ACTIVE' },
      include: { company: true, user: true } as any,
    });

    if (!record) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Update lastUsedAt asynchronously
    this.prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    const r = record as any;

    // Attach context to request
    request.apiKey = {
      id: r.id,
      name: r.name,
      scopes: r.scopes,
      companyId: r.companyId,
    };
    request.company = request.company || {
      id: r.companyId,
      code: r.company.code,
      name: r.company.name,
    };

    // If key is bound to a user, also set req.user for JWT-style access
    if (r.user) {
      request.user = {
        sub: r.user.id,
        email: r.user.email,
        name: r.user.name,
        companyId: r.companyId,
        companyCode: r.company.code,
        authType: 'api-key',
      };
    }

    return true;
  }

  private extractApiKey(request: any): string | undefined {
    const header = request.headers['x-api-key'] || request.headers['x-navira-api-key'];
    if (header) return String(header);
    const auth = request.headers['authorization'];
    if (auth && /^ApiKey\s+/i.test(auth)) {
      return auth.replace(/^ApiKey\s+/i, '').trim();
    }
    return undefined;
  }

  private parseApiKey(fullKey: string): { prefix: string; keyHash: string } {
    const parts = fullKey.split('.');
    const prefix = parts.length >= 2 ? parts[0] : fullKey;
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
    return { prefix, keyHash };
  }
}
