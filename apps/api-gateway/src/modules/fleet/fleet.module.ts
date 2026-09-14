import { Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { DriverService } from './driver.service';
import { VehicleService } from './vehicle.service';
import { ComplianceService } from './compliance.service';
import { DriverWalletService } from './driver-wallet.service';
import { DriverWalletController } from './driver-wallet.controller';
import { EVDashboardService } from './ev-dashboard.service';
import { DriverExperienceService } from './driver-experience.service';
import { GuardComplianceService } from './guard-compliance.service';
import { QRVehicleService } from './qr-vehicle.service';
import { VendorFleetService } from './vendor-fleet.service';
import { VendorFleetController } from './vendor-fleet.controller';
import { DocumentTypeService } from './document-type.service';
import { InternalVendorService } from './internal-vendor.service';
import { DriverAvailabilityService } from './driver-availability.service';
import { DriverOnboardingService } from './driver-onboarding.service';
import { AuditService } from '../../common/audit.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DriverService, VehicleService, ComplianceService, DriverWalletService, EVDashboardService, DriverExperienceService, GuardComplianceService, QRVehicleService, DocumentTypeService, InternalVendorService, DriverAvailabilityService, DriverOnboardingService, VendorFleetService, AuditService],
  controllers: [FleetController, DriverWalletController, VendorFleetController],
  exports: [DriverService, VehicleService, ComplianceService, DriverWalletService, EVDashboardService, DriverExperienceService, DocumentTypeService, InternalVendorService, DriverAvailabilityService, DriverOnboardingService],
})
export class FleetModule {}
