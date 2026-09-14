import { Module } from '@nestjs/common';
import { CompanyAdminService } from './company-admin.service';
import { CompanyAdminController } from './company-admin.controller';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [CompanyAdminController],
  providers: [CompanyAdminService, AuditService],
  exports: [CompanyAdminService],
})
export class CompanyAdminModule {}
