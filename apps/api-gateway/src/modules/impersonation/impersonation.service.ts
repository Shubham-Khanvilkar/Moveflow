import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { v4 as uuidv4 } from 'uuid';

export class StartImpersonationDto {
  targetUserId: string;
  reason: string;
  durationMinutes?: number;
}

@Injectable()
export class ImpersonationService {
  private readonly MAX_DURATION_MINUTES = 60;
  private readonly ALLOWED_ROLES = ['NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR'];

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async startSession(actorUserId: string, actorRole: string, dto: StartImpersonationDto, companyId: string) {
    if (!this.ALLOWED_ROLES.includes(actorRole)) {
      throw new ForbiddenException('Only NAVIRA Owner or Super Admin can start impersonation sessions');
    }

    const activeSession = await this.prisma.impersonationSession.findFirst({
      where: { actorUserId, isActive: true },
    });
    if (activeSession) {
      throw new BadRequestException('You already have an active impersonation session');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: dto.targetUserId } });
    if (!targetUser) throw new NotFoundException('Target user not found');
    if (targetUser.id === actorUserId) {
      throw new BadRequestException('Cannot impersonate yourself');
    }

    const duration = Math.min(dto.durationMinutes || 30, this.MAX_DURATION_MINUTES);
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    const session = await this.prisma.impersonationSession.create({
      data: {
        actorUserId,
        targetUserId: dto.targetUserId,
        reason: dto.reason,
        expiresAt,
        sessionToken: uuidv4(),
        isActive: true,
      },
    });

    await this.audit.log({
      companyId,
      userId: actorUserId,
      action: 'IMPERSONATION_START',
      entity: 'ImpersonationSession',
      entityId: session.id,
      newValue: { targetUserId: dto.targetUserId, reason: dto.reason, duration },
    });

    return {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
      expiresAt: session.expiresAt,
      reason: session.reason,
    };
  }

  async endSession(sessionId: string, actorUserId: string, companyId: string) {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.actorUserId !== actorUserId) {
      throw new ForbiddenException('You can only end your own impersonation sessions');
    }
    if (!session.isActive) {
      throw new BadRequestException('Session is already ended');
    }

    const updated = await this.prisma.impersonationSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endedAt: new Date(),
        endedByUserId: actorUserId,
      },
    });

    await this.audit.log({
      companyId,
      userId: actorUserId,
      action: 'IMPERSONATION_END',
      entity: 'ImpersonationSession',
      entityId: sessionId,
    });

    return { success: true, sessionId: updated.id };
  }

  async getActiveSession(sessionToken: string) {
    const session = await this.prisma.impersonationSession.findFirst({
      where: { sessionToken, isActive: true },
      include: {
        // We'll manually include user data
      },
    });

    if (!session) return null;
    if (new Date() > session.expiresAt) {
      await this.prisma.impersonationSession.update({
        where: { id: session.id },
        data: { isActive: false, endedAt: new Date() },
      });
      return null;
    }

    return session;
  }

  async getMySessions(actorUserId: string) {
    return this.prisma.impersonationSession.findMany({
      where: { actorUserId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async validateSession(sessionId: string, actorUserId: string) {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.actorUserId !== actorUserId) {
      throw new ForbiddenException('Not your session');
    }
    if (!session.isActive) {
      throw new BadRequestException('Session is ended');
    }
    if (new Date() > session.expiresAt) {
      await this.prisma.impersonationSession.update({
        where: { id: sessionId },
        data: { isActive: false, endedAt: new Date() },
      });
      throw new BadRequestException('Session has expired');
    }
    return { valid: true, expiresAt: session.expiresAt };
  }
}
