import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class InvoiceReconciliationService {
  private readonly logger = new Logger(InvoiceReconciliationService.name);
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createInvoice(companyId: string, data: {
    vendorInvoiceId: string;
    invoiceAmount: number;
    tripId?: string;
    tripAmount?: number;
    dispatchAmount?: number;
  }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const invoice = await this.prisma.invoiceReconciliation.create({
      data: {
        companyId,
        vendorInvoiceId: data.vendorInvoiceId,
        invoiceAmount: data.invoiceAmount,
        tripId: data.tripId,
        tripAmount: data.tripAmount,
        dispatchAmount: data.dispatchAmount,
      },
    });

    await this.audit.log({ companyId, userId: createdBy, action: 'INVOICE_RECEIVED', entity: 'InvoiceReconciliation', entityId: invoice.id, newValue: { vendorInvoiceId: data.vendorInvoiceId, amount: data.invoiceAmount } });
    return invoice;
  }

  async autoMatchTrips(companyId: string, invoiceId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const invoice = await this.prisma.invoiceReconciliation.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new BadRequestException('Invoice not found');

    let matched = 0;
    if (invoice.tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: invoice.tripId } });
      if (trip) matched = 1;
    }

    await this.prisma.invoiceReconciliation.update({
      where: { id: invoiceId },
      data: { status: matched > 0 ? 'MATCHED' : 'PENDING' },
    });

    return { matched, total: 1 };
  }

  async approveInvoice(companyId: string, invoiceId: string, approvedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const invoice = await this.prisma.invoiceReconciliation.update({
      where: { id: invoiceId },
      data: { status: 'RESOLVED', resolvedBy: approvedBy, resolvedAt: new Date() },
    });

    await this.audit.log({ companyId, userId: approvedBy, action: 'INVOICE_APPROVED', entity: 'InvoiceReconciliation', entityId: invoiceId });
    return invoice;
  }

  async getInvoices(companyId: string, params?: { vendorId?: string; status?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.vendorId) where.vendorInvoice = { vendorId: params.vendorId };
    if (params?.status) where.status = params.status.toUpperCase();

    const [invoices, total] = await Promise.all([
      this.prisma.invoiceReconciliation.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.invoiceReconciliation.count({ where }),
    ]);

    return { data: invoices, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getReconciliationSummary(companyId: string, vendorId?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const where: any = { companyId };
    if (vendorId) where.vendorId = vendorId;

    const [pending, resolved, discrepancy] = await Promise.all([
      this.prisma.invoiceReconciliation.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.invoiceReconciliation.count({ where: { ...where, status: 'RESOLVED' } }),
      this.prisma.invoiceReconciliation.count({ where: { ...where, status: 'DISCREPANCY' } }),
    ]);

    return { pending, resolved, discrepancy, total: pending + resolved + discrepancy };
  }
}
