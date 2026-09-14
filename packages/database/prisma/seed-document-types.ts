/**
 * SECTION 37: Document Type Taxonomy — Seed Data
 *
 * Seeds the DocumentTypeDefinition table with representative document types
 * for India (countryCode: "IN") and universal (countryCode: null).
 *
 * Compliance Team/SUPERADMIN can extend this per country without code changes.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DocumentTypeDefinition...');

  const documentTypes = [
    // ============================================================
    // IDENTITY — INDIA (countryCode: "IN")
    // ============================================================
    { countryCode: 'IN', category: 'IDENTITY', appliesTo: ['DRIVER', 'EMPLOYEE'], code: 'AADHAAR', label: 'Aadhaar Card', requiresExpiry: false, isMandatory: true },
    { countryCode: 'IN', category: 'IDENTITY', appliesTo: ['DRIVER', 'EMPLOYEE'], code: 'PAN', label: 'PAN Card', requiresExpiry: false, isMandatory: false },
    { countryCode: 'IN', category: 'IDENTITY', appliesTo: ['DRIVER', 'EMPLOYEE'], code: 'VOTER_ID', label: 'Voter ID (EPIC)', requiresExpiry: false, isMandatory: false },
    { countryCode: 'IN', category: 'IDENTITY', appliesTo: ['DRIVER', 'EMPLOYEE'], code: 'PASSPORT', label: 'Passport', requiresExpiry: true, isMandatory: false },
    { countryCode: 'IN', category: 'IDENTITY', appliesTo: ['DRIVER'], code: 'DRIVING_LICENCE', label: 'Driving Licence', requiresExpiry: true, isMandatory: true },

    // ============================================================
    // IDENTITY — UNIVERSAL (countryCode: null)
    // ============================================================
    { countryCode: null, category: 'IDENTITY', appliesTo: ['DRIVER', 'EMPLOYEE', 'VENDOR'], code: 'PASSPORT', label: 'Passport', requiresExpiry: true, isMandatory: false },

    // ============================================================
    // VEHICLE — UNIVERSAL
    // ============================================================
    { countryCode: null, category: 'VEHICLE', appliesTo: ['DRIVER'], code: 'RC', label: 'Registration Certificate (RC)', requiresExpiry: true, isMandatory: true },
    { countryCode: null, category: 'VEHICLE', appliesTo: ['DRIVER'], code: 'INSURANCE', label: 'Vehicle Insurance', requiresExpiry: true, isMandatory: true },
    { countryCode: null, category: 'VEHICLE', appliesTo: ['DRIVER'], code: 'FITNESS_CERT', label: 'Fitness Certificate', requiresExpiry: true, isMandatory: true },
    { countryCode: null, category: 'VEHICLE', appliesTo: ['DRIVER'], code: 'ROAD_TAX', label: 'Road Tax Receipt', requiresExpiry: true, isMandatory: false },
    { countryCode: null, category: 'VEHICLE', appliesTo: ['DRIVER'], code: 'PERMIT', label: 'Commercial Vehicle Permit', requiresExpiry: true, isMandatory: true },

    // ============================================================
    // VEHICLE — INDIA-SPECIFIC
    // ============================================================
    { countryCode: 'IN', category: 'VEHICLE', appliesTo: ['DRIVER'], code: 'PUC', label: 'PUC (Pollution Under Control)', requiresExpiry: true, isMandatory: true },

    // ============================================================
    // VENDOR — UNIVERSAL
    // ============================================================
    { countryCode: null, category: 'VENDOR', appliesTo: ['VENDOR'], code: 'VENDOR_REG_CERT', label: 'Vendor Registration Certificate', requiresExpiry: false, isMandatory: true },
    { countryCode: null, category: 'VENDOR', appliesTo: ['VENDOR'], code: 'COMPANY_INCORP', label: 'Company Incorporation Proof', requiresExpiry: false, isMandatory: true },
    { countryCode: null, category: 'VENDOR', appliesTo: ['VENDOR'], code: 'GST_CERT', label: 'GST/Tax Registration Certificate', requiresExpiry: false, isMandatory: true },
    { countryCode: null, category: 'VENDOR', appliesTo: ['VENDOR'], code: 'VENDOR_ID_CARD', label: 'Vendor ID Card', requiresExpiry: false, isMandatory: false },
    { countryCode: null, category: 'VENDOR', appliesTo: ['VENDOR'], code: 'VENDOR_INSURANCE', label: 'Vendor Insurance/Liability Certificate', requiresExpiry: true, isMandatory: true },
    { countryCode: null, category: 'VENDOR', appliesTo: ['VENDOR'], code: 'BANK_PROOF', label: 'Bank Account Proof (for payouts)', requiresExpiry: false, isMandatory: true },

    // ============================================================
    // OTHER — UNIVERSAL (always available)
    // ============================================================
    { countryCode: null, category: 'OTHER', appliesTo: ['DRIVER', 'EMPLOYEE', 'VENDOR'], code: 'OTHER', label: 'Other Document', requiresExpiry: false, isMandatory: false },
  ];

  let created = 0;
  let skipped = 0;

  for (const dt of documentTypes) {
    try {
      const existing = await prisma.documentTypeDefinition.findFirst({
        where: {
          countryCode: dt.countryCode as any,
          category: dt.category as any,
          code: dt.code,
        },
      });

      if (existing) {
        await prisma.documentTypeDefinition.update({
          where: { id: existing.id },
          data: {
            label: dt.label,
            requiresExpiry: dt.requiresExpiry,
            isMandatory: dt.isMandatory,
            appliesTo: dt.appliesTo as any,
          },
        });
      } else {
        await prisma.documentTypeDefinition.create({
          data: {
            countryCode: dt.countryCode as any,
            category: dt.category as any,
            appliesTo: dt.appliesTo as any,
            code: dt.code,
            label: dt.label,
            requiresExpiry: dt.requiresExpiry,
            isMandatory: dt.isMandatory,
          },
        });
      }
      created++;
    } catch (error: any) {
      console.log(`Skipped ${dt.code}: ${error?.message}`);
      skipped++;
    }
  }

  console.log(`Document types: ${created} created/updated, ${skipped} skipped`);

  // ============================================================
  // SECTION 39: Seed INTERNAL vendor type values
  // ============================================================
  // The actual INTERNAL vendor per company is created at company setup time.
  // This just ensures the enum concept is documented.
  console.log('Section 39: INTERNAL vendor type will be auto-seeded per company at creation time.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
