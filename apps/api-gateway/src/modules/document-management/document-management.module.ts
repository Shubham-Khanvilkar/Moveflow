import { Module } from '@nestjs/common';
import { DocumentManagementController } from './document-management.controller';
import { DocumentManagementService } from './document-management.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [DocumentManagementController],
  providers: [DocumentManagementService, PrismaService, AuditService],
  exports: [DocumentManagementService],
})
export class DocumentManagementModule {}
