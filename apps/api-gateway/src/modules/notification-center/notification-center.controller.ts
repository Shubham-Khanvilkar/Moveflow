import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { NotificationCenterService } from './notification-center.service';
import { CreateNotificationDto, NotificationQueryDto } from './notification-center.service';

@ApiTags('Notification Center')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard, AccessScopeGuard)
@Controller('api/v1/notifications')
export class NotificationCenterController {
  constructor(private readonly service: NotificationCenterService) {}

  @Post()
  @RequirePermissions({ module: 'notification', action: 'create' })
  @ApiOperation({ summary: 'Create notification' })
  async create(@Body() dto: CreateNotificationDto, @Request() req: any) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions({ module: 'notification', action: 'view' })
  @ApiOperation({ summary: 'Get notifications' })
  async findAll(@Query() query: NotificationQueryDto, @Request() req: any) {
    return this.service.findAll(req.user.id, query);
  }

  @Get('unread-count')
  @RequirePermissions({ module: 'notification', action: 'view' })
  @ApiOperation({ summary: 'Get unread count' })
  async getUnreadCount(@Request() req: any) {
    return this.service.getUnreadCount(req.user.id);
  }

  @Patch(':notificationId/read')
  @RequirePermissions({ module: 'notification', action: 'edit' })
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('notificationId') notificationId: string, @Request() req: any) {
    return this.service.markAsRead(notificationId, req.user.id);
  }

  @Patch('read-all')
  @RequirePermissions({ module: 'notification', action: 'edit' })
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any) {
    return this.service.markAllAsRead(req.user.id);
  }

  @Delete(':notificationId')
  @RequirePermissions({ module: 'notification', action: 'delete' })
  @ApiOperation({ summary: 'Delete notification' })
  async delete(@Param('notificationId') notificationId: string, @Request() req: any) {
    return this.service.delete(notificationId, req.user.id);
  }
}
