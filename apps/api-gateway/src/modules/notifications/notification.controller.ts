import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async send(@Request() req: any, @Body() dto: SendNotificationDto) {
    return this.notificationService.send(
      req.user.sub,
      req.user.companyId,
      dto,
    );
  }

  @Post('bulk')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'NAVIRA_PLATFORM_ADMINISTRATOR')
  async sendBulk(
    @Request() req: any,
    @Body() body: { userIds: string[] } & SendNotificationDto,
  ) {
    const { userIds, ...dto } = body;
    return this.notificationService.sendBulk(
      userIds,
      req.user.companyId,
      dto,
    );
  }

  @Get()
  async getMyNotifications(
    @Request() req: any,
    @Query() query: { page?: string; limit?: string; unreadOnly?: string },
  ) {
    return this.notificationService.getByUser(req.user.sub, {
      page: parseInt(query.page || '1') || 1,
      limit: parseInt(query.limit || '20') || 20,
      unreadOnly: query.unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    return this.notificationService.getUnreadCount(req.user.sub);
  }

  @Patch(':id/read')
  async markAsRead(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(id, req.user.sub);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(
      req.user.sub,
      req.user.companyId,
    );
  }

  @Delete(':id')
  async deleteNotification(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.notificationService.deleteNotification(id, req.user.sub);
  }
}
