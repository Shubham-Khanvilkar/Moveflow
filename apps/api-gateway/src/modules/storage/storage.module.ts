import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { AuditService } from '../../common/audit.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, AuditService],
  exports: [StorageService],
})
export class StorageModule {}
