import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { EmployeeTeamsService } from './employee-teams.service';
import { CreateTeamDto, UpdateTeamDto, AddTeamMemberDto, TeamQueryDto } from './dto/employee-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiBearerAuth()
@ApiTags('Employee Teams')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('employee-teams')
export class EmployeeTeamsController {
  constructor(private readonly service: EmployeeTeamsService) {}

  @Post()
  @RequirePermissions({ module: 'team', action: 'create' })
  @ApiOperation({ summary: 'Create a new team' })
  async create(@Request() req: any, @Body() dto: CreateTeamDto) {
    return this.service.create(dto, req.user.companyId);
  }

  @Put(':id')
  @RequirePermissions({ module: 'team', action: 'edit' })
  @ApiOperation({ summary: 'Update a team' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.service.update(id, dto, req.user.companyId);
  }

  @Delete(':id')
  @RequirePermissions({ module: 'team', action: 'deactivate' })
  @ApiOperation({ summary: 'Delete a team' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.delete(id, req.user.companyId);
  }

  @Get()
  @RequirePermissions({ module: 'team', action: 'view' })
  @ApiOperation({ summary: 'Get all teams' })
  async getAll(@Request() req: any, @Query() query: TeamQueryDto & PaginationDto) {
    return this.service.getAll(req.user.companyId, query);
  }

  @Get(':id')
  @RequirePermissions({ module: 'team', action: 'view' })
  @ApiOperation({ summary: 'Get team by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.getById(id, req.user.companyId);
  }

  @Post(':id/members')
  @RequirePermissions({ module: 'team', action: 'assign_employee' })
  @ApiOperation({ summary: 'Add member to team' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.service.addMember(id, dto, req.user.companyId);
  }

  @Delete(':teamId/members/:userId')
  @RequirePermissions({ module: 'team', action: 'remove_employee' })
  @ApiOperation({ summary: 'Remove member from team' })
  async removeMember(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any,
  ) {
    return this.service.removeMember(teamId, userId, req.user.companyId);
  }

  @Get(':id/members')
  @RequirePermissions({ module: 'team', action: 'view' })
  @ApiOperation({ summary: 'Get team members' })
  async getMembers(@Param('id', ParseUUIDPipe) id: string, @Query() query: PaginationDto, @Request() req: any) {
    return this.service.getMembers(id, req.user.companyId, query);
  }

  @Get('user/:userId')
  @RequirePermissions({ module: 'team', action: 'view' })
  @ApiOperation({ summary: 'Get teams by user' })
  async getByUser(@Param('userId', ParseUUIDPipe) userId: string, @Request() req: any) {
    return this.service.getByUser(userId, req.user.companyId);
  }

  @Put(':id/manager')
  @RequirePermissions({ module: 'team', action: 'edit' })
  @ApiOperation({ summary: 'Reassign team manager' })
  async reassignManager(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body('managerId', ParseUUIDPipe) managerId: string,
  ) {
    return this.service.reassignManager(id, managerId, req.user.companyId);
  }
}
