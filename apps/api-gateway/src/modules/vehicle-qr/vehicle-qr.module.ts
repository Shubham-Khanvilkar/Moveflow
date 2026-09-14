import { Module } from '@nestjs/common';
import { VehicleQRController } from './vehicle-qr.controller';
import { VehicleQRService } from './vehicle-qr.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [VehicleQRController],
  providers: [VehicleQRService, PrismaService, AuditService],
  exports: [VehicleQRService],
})
export class VehicleQRModule {}
