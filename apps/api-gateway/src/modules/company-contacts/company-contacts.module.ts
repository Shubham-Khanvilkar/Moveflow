import { Module } from '@nestjs/common';
import { CompanyContactsController } from './company-contacts.controller';
import { CompanyContactsService } from './company-contacts.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [CompanyContactsController],
  providers: [CompanyContactsService, PrismaService, AuditService],
  exports: [CompanyContactsService],
})
export class CompanyContactsModule {}
