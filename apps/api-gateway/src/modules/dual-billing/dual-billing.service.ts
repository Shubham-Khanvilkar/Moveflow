import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export class CreateSaaSInvoiceDto {
  billingPeriodStart: string;
  billingPeriodEnd: string;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
  taxRate?: number;
  discount?: number;
  dueDate?: string;
  notes?: string;
}

export class CreateTransportInvoiceDto {
  vendorId?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  lineItems: { description: string; quantity: number; unitPrice: number; tripId?: string }[];
  taxRate?: number;
  discount?: number;
  dueDate?: string;
  notes?: string;
}

export class ReconcileDto {
  period: string;
  saasInvoiceId: string;
  transportInvoiceId: string;
  notes?: string;
}

@Injectable()
export class DualBillingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ===== SaaS Billing =====

  async createSaaSInvoice(companyId: string, dto: CreateSaaSInvoiceDto, userId: string) {
    const invoiceNumber = await this.generateInvoiceNumber(companyId, 'SaaS');
    const subtotal = dto.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = Math.round(subtotal * ((dto.taxRate || 0) / 100));
    const discount = dto.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;

    const invoice = await this.prisma.saaSInvoice.create({
      data: {
        companyId,
        invoiceNumber,
        billingPeriodStart: new Date(dto.billingPeriodStart),
        billingPeriodEnd: new Date(dto.billingPeriodEnd),
        subtotal,
        taxAmount,
        discount,
        totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        LineItems: {
          create: dto.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { LineItems: true },
    });

    await this.audit.log({
      userId, action: 'SAAS_INVOICE_CREATED', entity: 'SaaSInvoice',
      entityId: invoice.id, companyId,
      newValue: { invoiceNumber, totalAmount },
    });

    return invoice;
  }

  async getSaaSInvoices(companyId: string, status?: string) {
    const where: any = { companyId };
    if (status) where.status = status;

    return this.prisma.saaSInvoice.findMany({
      where,
      include: { LineItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSaaSInvoiceStatus(companyId: string, invoiceId: string, status: string, userId: string) {
    const invoice = await this.prisma.saaSInvoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const data: any = { status };
    if (status === 'PAID') data.paidAt = new Date();

    const updated = await this.prisma.saaSInvoice.update({
      where: { id: invoiceId },
      data,
    });

    await this.audit.log({
      userId, action: 'SAAS_INVOICE_STATUS_UPDATED', entity: 'SaaSInvoice',
      entityId: invoiceId, companyId,
      oldValue: { status: invoice.status },
      newValue: { status },
    });

    return updated;
  }

  // ===== Transport Billing =====

  async createTransportInvoice(companyId: string, dto: CreateTransportInvoiceDto, userId: string) {
    const invoiceNumber = await this.generateInvoiceNumber(companyId, 'Transport');
    const subtotal = dto.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = Math.round(subtotal * ((dto.taxRate || 0) / 100));
    const discount = dto.discount || 0;
    const totalAmount = subtotal + taxAmount - discount;

    const invoice = await this.prisma.transportInvoice.create({
      data: {
        companyId,
        vendorId: dto.vendorId,
        invoiceNumber,
        billingPeriodStart: new Date(dto.billingPeriodStart),
        billingPeriodEnd: new Date(dto.billingPeriodEnd),
        subtotal,
        taxAmount,
        discount,
        totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        LineItems: {
          create: dto.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.quantity * item.unitPrice,
            tripId: item.tripId,
          })),
        },
      },
      include: { LineItems: true },
    });

    await this.audit.log({
      userId, action: 'TRANSPORT_INVOICE_CREATED', entity: 'TransportInvoice',
      entityId: invoice.id, companyId,
      newValue: { invoiceNumber, totalAmount, vendorId: dto.vendorId },
    });

    return invoice;
  }

  async getTransportInvoices(companyId: string, status?: string, vendorId?: string) {
    const where: any = { companyId };
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    return this.prisma.transportInvoice.findMany({
      where,
      include: { LineItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTransportInvoiceStatus(companyId: string, invoiceId: string, status: string, userId: string) {
    const invoice = await this.prisma.transportInvoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const data: any = { status };
    if (status === 'PAID') data.paidAt = new Date();

    const updated = await this.prisma.transportInvoice.update({
      where: { id: invoiceId },
      data,
    });

    await this.audit.log({
      userId, action: 'TRANSPORT_INVOICE_STATUS_UPDATED', entity: 'TransportInvoice',
      entityId: invoiceId, companyId,
      oldValue: { status: invoice.status },
      newValue: { status },
    });

    return updated;
  }

  // ===== Reconciliation =====

  async reconcile(companyId: string, dto: ReconcileDto, userId: string) {
    const [saasInvoice, transportInvoice] = await Promise.all([
      this.prisma.saaSInvoice.findFirst({ where: { id: dto.saasInvoiceId, companyId } }),
      this.prisma.transportInvoice.findFirst({ where: { id: dto.transportInvoiceId, companyId } }),
    ]);

    if (!saasInvoice) throw new NotFoundException('SaaS invoice not found');
    if (!transportInvoice) throw new NotFoundException('Transport invoice not found');

    const variance = saasInvoice.totalAmount - transportInvoice.totalAmount;

    const reconciliation = await this.prisma.billingReconciliation.create({
      data: {
        companyId,
        period: dto.period,
        saasInvoiceId: dto.saasInvoiceId,
        transportInvoiceId: dto.transportInvoiceId,
        variance,
        status: variance === 0 ? 'MATCHED' : 'DISPUTED',
        notes: dto.notes,
      },
    });

    await this.audit.log({
      userId, action: 'BILLING_RECONCILED', entity: 'BillingReconciliation',
      entityId: reconciliation.id, companyId,
      newValue: { variance, status: reconciliation.status },
    });

    return reconciliation;
  }

  async getReconciliations(companyId: string) {
    return this.prisma.billingReconciliation.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReconciliation(companyId: string, reconciliationId: string, userId: string, notes?: string) {
    const reconciliation = await this.prisma.billingReconciliation.findFirst({
      where: { id: reconciliationId, companyId },
    });
    if (!reconciliation) throw new NotFoundException('Reconciliation not found');

    return this.prisma.billingReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: 'RESOLVED',
        resolvedBy: userId,
        resolvedAt: new Date(),
        notes: notes || reconciliation.notes,
      },
    });
  }

  // ===== Usage Metering =====

  async getUsageMetrics(companyId: string, periodStart: string, periodEnd: string) {
    return this.prisma.usageMeteringRecord.findMany({
      where: {
        companyId,
        billingPeriodStart: { gte: new Date(periodStart) },
        billingPeriodEnd: { lte: new Date(periodEnd) },
      },
      orderBy: { billingPeriodStart: 'asc' },
    });
  }

  async recordUsage(companyId: string, metricType: string, value: number, periodStart: Date, periodEnd: Date) {
    return this.prisma.usageMeteringRecord.upsert({
      where: {
        companyId_billingPeriodStart_metricType: {
          companyId,
          billingPeriodStart: periodStart,
          metricType,
        },
      },
      update: { metricValue: value },
      create: {
        companyId,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        metricType,
        metricValue: value,
      },
    });
  }

  // ===== Analytics =====

  async getBillingAnalytics(companyId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [saasInvoices, transportInvoices, reconciliations] = await Promise.all([
      this.prisma.saaSInvoice.findMany({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        select: { totalAmount: true, status: true },
      }),
      this.prisma.transportInvoice.findMany({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        select: { totalAmount: true, status: true },
      }),
      this.prisma.billingReconciliation.findMany({
        where: { companyId, createdAt: { gte: thirtyDaysAgo } },
        select: { variance: true, status: true },
      }),
    ]);

    const totalSaasRevenue = saasInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalTransportRevenue = transportInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingSaas = saasInvoices.filter(inv => inv.status === 'SENT' || inv.status === 'DRAFT').length;
    const pendingTransport = transportInvoices.filter(inv => inv.status === 'SENT' || inv.status === 'DRAFT').length;
    const disputedReconciliations = reconciliations.filter(r => r.status === 'DISPUTED').length;

    return {
      totalSaasRevenue,
      totalTransportRevenue,
      pendingSaasInvoices: pendingSaas,
      pendingTransportInvoices: pendingTransport,
      disputedReconciliations,
      reconciliationRate: reconciliations.length > 0
        ? ((reconciliations.filter(r => r.status === 'MATCHED').length / reconciliations.length) * 100).toFixed(1)
        : 0,
    };
  }

  private async generateInvoiceNumber(companyId: string, type: string): Promise<string> {
    const prefix = type === 'SaaS' ? 'NVS' : 'NVT';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await this.prisma.saaSInvoice.count({ where: { companyId } }) +
                  await this.prisma.transportInvoice.count({ where: { companyId } });
    return `${prefix}-${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
  }
}
