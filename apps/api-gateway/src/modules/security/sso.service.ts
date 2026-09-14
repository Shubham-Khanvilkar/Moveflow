import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SSOService {
  private readonly logger = new Logger(SSOService.name);

  constructor(private prisma: PrismaService) {}

  async getSSOConfig(companyId: string) {
    return this.prisma.sSOConfiguration.findFirst({ where: { companyId } });
  }

  async createSSOConfig(companyId: string, data: {
    provider: string;
    clientId: string;
    clientSecret: string;
    issuerUrl: string;
    metadataUrl?: string;
    enforceSSO?: boolean;
  }) {
    const existing = await this.getSSOConfig(companyId);
    if (existing) throw new BadRequestException('SSO configuration already exists');

    return this.prisma.sSOConfiguration.create({
      data: { companyId, ...data },
    });
  }

  async updateSSOConfig(companyId: string, data: Partial<{
    clientId: string;
    clientSecret: string;
    issuerUrl: string;
    metadataUrl: string;
    enabled: boolean;
    enforceSSO: boolean;
  }>) {
    const config = await this.getSSOConfig(companyId);
    if (!config) throw new NotFoundException('SSO configuration not found');

    return this.prisma.sSOConfiguration.update({
      where: { id: config.id },
      data,
    });
  }

  async isSSOEnforced(companyId: string): Promise<boolean> {
    const config = await this.getSSOConfig(companyId);
    return config?.enforceSSO === true;
  }

  async mapIdPUser(companyId: string, email: string, name: string) {
    const user = await this.prisma.user.findFirst({ where: { companyId, email } });
    if (!user) throw new NotFoundException('User not found for SSO mapping');
    return user;
  }

  async generateOAuthUrl(companyId: string, redirectUri: string): Promise<string> {
    const config = await this.getSSOConfig(companyId);
    if (!config) throw new NotFoundException('SSO not configured');

    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    return `${config.issuerUrl}/authorize?${params.toString()}`;
  }
}
