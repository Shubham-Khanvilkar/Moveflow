import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DriverWalletService } from './driver-wallet.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';

@Controller('driver-wallet')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard, AccessScopeGuard)
export class DriverWalletController {
  constructor(private readonly walletService: DriverWalletService) {}

  @Get('balance/:driverId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DRIVER')
  async getBalance(@Request() req: any, @Param('driverId') driverId: string) {
    return this.walletService.getBalance(req.user.companyId, driverId);
  }

  @Get('transactions/:driverId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DRIVER')
  async getTransactions(
    @Request() req: any,
    @Param('driverId') driverId: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(req.user.companyId, driverId, { type, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20 });
  }

  @Post('credit/:driverId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async credit(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { amount: number; description: string; referenceType?: string; referenceId?: string }) {
    return this.walletService.credit(req.user.companyId, driverId, body.amount, body.description, body.referenceType, body.referenceId, req.user.id);
  }

  @Post('debit/:driverId')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async debit(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { amount: number; description: string; referenceType?: string; referenceId?: string }) {
    return this.walletService.debit(req.user.companyId, driverId, body.amount, body.description, body.referenceType, body.referenceId, req.user.id);
  }

  @Post('advance/:driverId')
  @Roles('DRIVER')
  async requestAdvance(@Request() req: any, @Param('driverId') driverId: string, @Body() body: { amount: number; purpose: string; notes?: string }) {
    return this.walletService.requestAdvance(req.user.companyId, driverId, body.amount, body.purpose, body.notes);
  }

  @Post('advance/:advanceId/approve')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async approveAdvance(@Request() req: any, @Param('advanceId') advanceId: string) {
    return this.walletService.approveAdvance(req.user.companyId, advanceId, req.user.id);
  }

  @Post('advance/:advanceId/disburse')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async disburseAdvance(@Request() req: any, @Param('advanceId') advanceId: string) {
    return this.walletService.disburseAdvance(req.user.companyId, advanceId);
  }

  @Post('advance/:advanceId/settle')
  @Roles('COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  async settleAdvance(@Request() req: any, @Param('advanceId') advanceId: string, @Body() body: { settlementId: string }) {
    return this.walletService.settleAdvance(req.user.companyId, advanceId, body.settlementId);
  }
}
