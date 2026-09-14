import { Module } from '@nestjs/common';
import { ReleaseManagementController } from './release-management.controller';
import { ReleaseManagementService } from './release-management.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [ReleaseManagementController],
  providers: [ReleaseManagementService, PrismaService, AuditService],
  exports: [ReleaseManagementService],
})
export class ReleaseManagementModule {}
