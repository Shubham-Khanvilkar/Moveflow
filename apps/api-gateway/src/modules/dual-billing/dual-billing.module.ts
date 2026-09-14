import { Module } from '@nestjs/common';
import { DualBillingController } from './dual-billing.controller';
import { DualBillingService } from './dual-billing.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [DualBillingController],
  providers: [DualBillingService, PrismaService, AuditService],
  exports: [DualBillingService],
})
export class DualBillingModule {}
