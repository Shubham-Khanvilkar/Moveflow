import { Module } from '@nestjs/common';
import { OrgManagementController } from './org-management.controller';
import { OrgManagementService } from './org-management.service';
import { PolicyScopeController } from './policy-scope.controller';
import { PolicyScopeResolverService } from './policy-scope-resolver.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AdminDelegationService } from './admin-delegation.service';
import { TransportScheduleService } from './transport-schedule.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [OrgManagementController, PolicyScopeController],
  providers: [
    OrgManagementService,
    PolicyScopeResolverService,
    AccessScopeGuard,
    PlatformAdminGuard,
    AdminDelegationService,
    TransportScheduleService,
    PrismaService,
    AuditService,
  ],
  exports: [OrgManagementService, PolicyScopeResolverService, AccessScopeGuard, PlatformAdminGuard, AdminDelegationService, TransportScheduleService],
})
export class OrgManagementModule {}
