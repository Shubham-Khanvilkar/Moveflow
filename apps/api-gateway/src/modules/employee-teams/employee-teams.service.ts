import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, TeamQueryDto } from './dto/employee-team.dto';

@Injectable()
export class EmployeeTeamsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTeamDto, companyId: string) {
    const existing = await this.prisma.employeeTeam.findFirst({
      where: { companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Team with code "${dto.code}" already exists`);
    }

    return this.prisma.employeeTeam.create({
      data: {
        companyId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        managerId: dto.managerId,
        siteId: dto.siteId,
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto, companyId: string) {
    const team = await this.prisma.employeeTeam.findFirst({ where: { id, companyId } });
    if (!team) throw new NotFoundException('Team not found');

    if (dto.code) {
      const dup = await this.prisma.employeeTeam.findFirst({
        where: { companyId, code: dto.code, id: { not: id } },
      });
      if (dup) throw new ConflictException(`Team with code "${dto.code}" already exists`);
    }

    return this.prisma.employeeTeam.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, companyId: string) {
    const team = await this.prisma.employeeTeam.findFirst({ where: { id, companyId } });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.employeeTeam.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getAll(companyId: string, query?: TeamQueryDto & PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = query ?? ({} as any);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.prisma.employeeTeam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { members: { where: { isActive: true } } } },
          manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          site: { select: { id: true, name: true } },
        } as any,
      }),
      this.prisma.employeeTeam.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, companyId: string) {
    const team = await this.prisma.employeeTeam.findFirst({
      where: { id, companyId },
      include: {
        members: {
          where: { isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        site: { select: { id: true, name: true } },
      } as any,
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async addMember(teamId: string, dto: AddTeamMemberDto, companyId: string) {
    const team = await this.prisma.employeeTeam.findFirst({ where: { id: teamId, companyId } });
    if (!team) throw new NotFoundException('Team not found');

    const existing = await this.prisma.employeeTeamMember.findFirst({
      where: { teamId, userId: dto.userId },
    });
    if (existing) {
      if (existing.isActive) throw new ConflictException('User is already an active member of this team');
      // Reactivate
      await this.prisma.employeeTeamMember.update({
        where: { id: existing.id },
        data: { isActive: true, leftAt: null },
      });
    } else {
      await this.prisma.employeeTeamMember.create({
        data: { companyId, teamId, userId: dto.userId },
      });
    }

    await this._updateCounts(teamId);
    return this.prisma.employeeTeam.findFirst({ where: { id: teamId } });
  }

  async removeMember(teamId: string, userId: string, companyId: string) {
    const team = await this.prisma.employeeTeam.findFirst({ where: { id: teamId, companyId } });
    if (!team) throw new NotFoundException('Team not found');

    const member = await this.prisma.employeeTeamMember.findFirst({
      where: { teamId, userId, isActive: true },
    });
    if (!member) throw new NotFoundException('User is not an active member of this team');

    await this.prisma.employeeTeamMember.update({
      where: { id: member.id },
      data: { isActive: false, leftAt: new Date() },
    });

    await this._updateCounts(teamId);
    return this.prisma.employeeTeam.findFirst({ where: { id: teamId } });
  }

  async getMembers(teamId: string, companyId: string, query?: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, sortBy = 'joinedAt', sortOrder = 'asc' } = query ?? {};
    const skip = (page - 1) * limit;

    const team = await this.prisma.employeeTeam.findFirst({ where: { id: teamId, companyId } });
    if (!team) throw new NotFoundException('Team not found');

    const where: any = { teamId, isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.employeeTeamMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } as any,
      }),
      this.prisma.employeeTeamMember.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getByUser(userId: string, companyId: string) {
    return this.prisma.employeeTeam.findMany({
      where: {
        companyId,
        members: { some: { userId, isActive: true } },
        isActive: true,
      },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        site: { select: { id: true, name: true } },
      } as any,
    });
  }

  async reassignManager(teamId: string, managerId: string, companyId: string) {
    const team = await this.prisma.employeeTeam.findFirst({ where: { id: teamId, companyId } });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.employeeTeam.update({
      where: { id: teamId },
      data: { managerId },
    });
  }

  private async _updateCounts(teamId: string) {
    const activeCount = await this.prisma.employeeTeamMember.count({
      where: { teamId, isActive: true },
    });
    const totalMembers = await this.prisma.employeeTeamMember.count({
      where: { teamId },
    });
    const inactiveCount = totalMembers - activeCount;

    await this.prisma.employeeTeam.update({
      where: { id: teamId },
      data: { activeCount, headCount: totalMembers, inactiveCount },
    });
  }
}
