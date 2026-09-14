/**
 * Seed script for demo data for new services:
 * - Vendor Contracts
 * - Approval Requests
 * - Notification Preferences
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data for new services...');

  // 1. Create Vendor Contracts
  const vendors = await prisma.vendor.findMany({ take: 2 });
  if (vendors.length > 0) {
    for (const vendor of vendors) {
      const existing = await (prisma as any).vendorContract.findFirst({
        where: { vendorId: vendor.id, contractNumber: `VC-${vendor.id.slice(0, 8)}` },
      });
      if (!existing) {
        await (prisma as any).vendorContract.create({
          data: {
            companyId: vendor.companyId,
            vendorId: vendor.id,
            contractNumber: `VC-${vendor.id.slice(0, 8)}`,
            status: 'ACTIVE',
            contractStart: new Date('2026-01-01'),
            contractEnd: new Date('2026-12-31'),
            billingModel: 'COMPANY',
            paymentTerms: 'NET_30',
            currency: 'INR',
            createdBy: 'system',
            approvedBy: 'system',
          },
        });
        console.log(`Created vendor contract for ${vendor.id}`);
      }
    }
  }

  // 2. Create Approval Requests
  const companies = await prisma.company.findMany({ take: 1 });
  if (companies.length > 0) {
    const company = companies[0];
    const existing = await (prisma as any).approvalRequest.findFirst({
      where: { companyId: company.id, entityType: 'RATE_CARD' },
    });
    if (!existing) {
      await (prisma as any).approvalRequest.create({
        data: {
          companyId: company.id,
          entityType: 'RATE_CARD',
          entityId: 'demo-rate-card',
          action: 'CREATE',
          requestedBy: 'system',
          status: 'PENDING',
          reason: 'Demo rate card for testing',
          metadata: { amount: 1500 },
        },
      });
      console.log('Created demo approval request');
    }
  }

  // 3. Create Notification Preferences
  const users = await prisma.user.findMany({ take: 3 });
  for (const user of users) {
    const membership = await prisma.companyMembership.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });
    if (membership) {
      const existing = await prisma.communicationPreference.findUnique({
        where: { companyId_userId: { companyId: membership.companyId, userId: user.id } },
      });
      if (!existing) {
        await prisma.communicationPreference.create({
          data: {
            companyId: membership.companyId,
            userId: user.id,
            push: true,
            sms: true,
            email: true,
            whatsapp: true,
            tripAssigned: 'WHATSAPP',
            tripArriving: 'WHATSAPP',
            tripCompleted: 'PUSH',
            emergency: 'ALL',
          },
        });
        console.log(`Created notification preferences for ${user.id}`);
      }
    }
  }

  console.log('Demo data seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
