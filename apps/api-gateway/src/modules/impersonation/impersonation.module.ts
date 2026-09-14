import { Module } from '@nestjs/common';
import { ImpersonationController } from './impersonation.controller';
import { ImpersonationService } from './impersonation.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [ImpersonationController],
  providers: [ImpersonationService, PrismaService, AuditService],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
