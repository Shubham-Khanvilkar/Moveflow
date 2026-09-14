import { Module } from '@nestjs/common';
import { PassengerOperationsController } from './passenger-operations.controller';
import { PassengerOperationsService } from './passenger-operations.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [PassengerOperationsController],
  providers: [PassengerOperationsService, PrismaService, AuditService],
  exports: [PassengerOperationsService],
})
export class PassengerOperationsModule {}
