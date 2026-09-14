import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VendorFleetService } from './vendor-fleet.service';

/**
 * Vendor Fleet — the vendor is the team leader of a directly-assigned set of
 * vehicles. Read endpoints are scoped to the caller's vendorId (VendorUser
 * mapping). Assignment endpoints are direct FK writes — no invite workflow.
 */
@Controller('vendor/fleet')
@UseGuards(JwtAuthGuard, AccessScopeGuard, RolesGuard)
@Roles('NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'FLEET_MANAGER', 'VENDOR_ADMIN', 'VENDOR_MANAGER', 'SUPERVISOR', 'MANAGER')
export class VendorFleetController {
  constructor(private fleetService: VendorFleetService) {}

  @Get()
  async getMyFleet(@Req() req: any) {
    const vendorId = this.resolveVendorId(req);
    return this.fleetService.getVendorFleet(req.user.companyId, vendorId);
  }

  @Get('vehicles')
  async getMyVehicles(@Req() req: any) {
    const fleet = await this.fleetService.getVendorFleet(req.user.companyId, this.resolveVendorId(req));
    return fleet.vehicles;
  }

  @Get('drivers')
  async getMyDrivers(@Req() req: any) {
    const fleet = await this.fleetService.getVendorFleet(req.user.companyId, this.resolveVendorId(req));
    return fleet.drivers;
  }

  /** Admin picker: all company vehicles + drivers (for assignment UI). */
  @Get('company')
  async getCompanyFleet(@Req() req: any) {
    return this.fleetService.getCompanyFleet(req.user.companyId);
  }

  /** Direct assignment — transport admin assigns vehicles to a vendor. */
  @Post('assign/vehicles')
  async assignVehicles(@Req() req: any, @Body() body: { vendorId: string; vehicleIds: string[] }) {
    return this.fleetService.assignVehiclesToVendor(req.user.companyId, body.vendorId, body.vehicleIds || [], req.user);
  }

  /** Direct assignment — no invite between vendor and drivers. */
  @Post('assign/drivers')
  async assignDrivers(@Req() req: any, @Body() body: { vendorId: string; driverIds: string[] }) {
    return this.fleetService.assignDriversToVendor(req.user.companyId, body.vendorId, body.driverIds || [], req.user);
  }

  private resolveVendorId(req: any): string {
    const vendorId = req.user?.vendorId;
    if (!vendorId) throw new ForbiddenException('No vendor is linked to this account — ask your Transport Admin to assign you to a vendor');
    return vendorId;
  }
}
