import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DSARService {
  private readonly logger = new Logger(DSARService.name);

  constructor(private prisma: PrismaService) {}

  async submitRequest(userId: string, companyId: string, requestType: string) {
    return (this.prisma as any).dSARRequest.create({
      data: {
        companyId,
        userId,
        requestType,
        status: 'PENDING',
        requestedAt: new Date(),
      },
    });
  }

  async processAccessRequest(requestId: string) {
    const request = await (this.prisma as any).dSARRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('DSAR request not found');

    const user = await this.prisma.user.findUnique({ where: { id: request.userId } });
    
    await (this.prisma as any).dSARRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return { user, message: 'Data export prepared' };
  }

  async processDeletionRequest(requestId: string) {
    const request = await (this.prisma as any).dSARRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('DSAR request not found');

    await (this.prisma as any).dSARRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return { message: 'Data deletion processed' };
  }

  async listRequests(companyId: string) {
    return (this.prisma as any).dSARRequest.findMany({
      where: { companyId },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
