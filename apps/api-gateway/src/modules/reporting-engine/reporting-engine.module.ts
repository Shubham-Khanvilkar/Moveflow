import { Module } from '@nestjs/common';
import { ReportingEngineController } from './reporting-engine.controller';
import { ReportingEngineService } from './reporting-engine.service';
import { ExportService } from './export.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [ReportingEngineController],
  providers: [ReportingEngineService, ExportService, PrismaService, AuditService],
  exports: [ReportingEngineService, ExportService],
})
export class ReportingEngineModule {}
