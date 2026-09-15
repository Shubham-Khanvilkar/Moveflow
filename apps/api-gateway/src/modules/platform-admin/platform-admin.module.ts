import { Module } from '@nestjs/common';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';
import { LocationChangeService } from './location-change.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SecurityEventService } from '../security/security-event.service';

@Module({
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, LocationChangeService, PrismaService, AuditService, SecurityEventService],
  exports: [PlatformAdminService, LocationChangeService],
})
export class PlatformAdminModule {}
