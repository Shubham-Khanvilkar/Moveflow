import { Module } from '@nestjs/common';
import { DeviceBindingService } from './device-binding.service';
import { DeviceBindingController } from './device-binding.controller';
import { MFAService } from './mfa.service';
import { MFAController } from './mfa.controller';
import { PrivacySecurityService } from './privacy-security.service';
import { SSOService } from './sso.service';
import { DataRetentionService } from './data-retention.service';
import { DSARService } from './dsar.service';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DeviceBindingService, MFAService, PrivacySecurityService, SSOService, DataRetentionService, DSARService, AuditService],
  controllers: [DeviceBindingController, MFAController],
  exports: [DeviceBindingService, MFAService, PrivacySecurityService, SSOService, DataRetentionService, DSARService],
})
export class SecurityModule {}
