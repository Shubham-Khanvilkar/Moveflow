import { Injectable, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class DriverWalletService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getOrCreateWallet(companyId: string, driverId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    let wallet = await this.prisma.driverWallet.findFirst({ where: { companyId, driverId } });
    if (!wallet) {
      wallet = await this.prisma.driverWallet.create({
        data: { companyId, driverId, balance: 0 },
      });
    }
    return wallet;
  }

  async getBalance(companyId: string, driverId: string) {
    const wallet = await this.getOrCreateWallet(companyId, driverId);
    return { balance: wallet.balance, totalCredited: wallet.totalCredited, totalDebited: wallet.totalDebited };
  }

  async getTransactions(companyId: string, driverId: string, params?: { type?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    const wallet = await this.getOrCreateWallet(companyId, driverId);
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { walletId: wallet.id };
    if (params?.type) where.type = params.type;

    const [transactions, total] = await Promise.all([
      this.prisma.driverWalletTransaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.driverWalletTransaction.count({ where }),
    ]);

    return { data: transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async credit(companyId: string, driverId: string, amount: number, description: string, referenceType?: string, referenceId?: string, performedBy?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const wallet = await this.getOrCreateWallet(companyId, driverId);
    const newBalance = wallet.balance + amount;

    const [updatedWallet] = await this.prisma.$transaction([
      this.prisma.driverWallet.update({ where: { id: wallet.id }, data: { balance: newBalance, totalCredited: wallet.totalCredited + amount } }),
      this.prisma.driverWalletTransaction.create({
        data: { walletId: wallet.id, type: 'CREDIT', amount, balance: newBalance, description, referenceType, referenceId, performedBy },
      }),
    ]);

    await this.audit.log({ companyId, userId: performedBy || driverId, action: 'WALLET_CREDIT', entity: 'DriverWallet', entityId: wallet.id, newValue: { amount, newBalance } });
    return updatedWallet;
  }

  async debit(companyId: string, driverId: string, amount: number, description: string, referenceType?: string, referenceId?: string, performedBy?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const wallet = await this.getOrCreateWallet(companyId, driverId);
    if (wallet.balance < amount) throw new BadRequestException('Insufficient wallet balance');

    const newBalance = wallet.balance - amount;
    const [updatedWallet] = await this.prisma.$transaction([
      this.prisma.driverWallet.update({ where: { id: wallet.id }, data: { balance: newBalance, totalDebited: wallet.totalDebited + amount } }),
      this.prisma.driverWalletTransaction.create({
        data: { walletId: wallet.id, type: 'DEBIT', amount: -amount, balance: newBalance, description, referenceType, referenceId, performedBy },
      }),
    ]);

    await this.audit.log({ companyId, userId: performedBy || driverId, action: 'WALLET_DEBIT', entity: 'DriverWallet', entityId: wallet.id, newValue: { amount, newBalance } });
    return updatedWallet;
  }

  async requestAdvance(companyId: string, driverId: string, amount: number, purpose: string, notes?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const advance = await this.prisma.driverWalletAdvance.create({
      data: { companyId, driverId, amount, purpose: purpose.toUpperCase(), notes },
    });

    await this.audit.log({ companyId, userId: driverId, action: 'ADVANCE_REQUESTED', entity: 'DriverWalletAdvance', entityId: advance.id, newValue: { amount, purpose } });
    return advance;
  }

  async approveAdvance(companyId: string, advanceId: string, approvedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const advance = await this.prisma.driverWalletAdvance.update({
      where: { id: advanceId },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    });

    await this.audit.log({ companyId, userId: approvedBy, action: 'ADVANCE_APPROVED', entity: 'DriverWalletAdvance', entityId: advanceId });
    return advance;
  }

  async disburseAdvance(companyId: string, advanceId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const advance = await this.prisma.driverWalletAdvance.findUnique({ where: { id: advanceId } });
    if (!advance || advance.status !== 'APPROVED') throw new BadRequestException('Advance not approved');

    await this.credit(companyId, advance.driverId, advance.amount, `Advance: ${advance.purpose}`, 'ADVANCE', advanceId);
    await this.prisma.driverWalletAdvance.update({ where: { id: advanceId }, data: { status: 'DISBURSED', disbursedAt: new Date() } });

    return { status: 'DISBURSED', amount: advance.amount };
  }

  async settleAdvance(companyId: string, advanceId: string, settlementId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    await this.prisma.driverWalletAdvance.update({
      where: { id: advanceId },
      data: { status: 'SETTLED', settledAt: new Date(), settlementId },
    });

    return { status: 'SETTLED' };
  }
}
