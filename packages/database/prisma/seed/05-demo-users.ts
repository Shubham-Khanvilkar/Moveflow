import { PrismaClient, SecurityDomain, IdentityType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Canonical Demo Users — one per canonical role
 * Development only — must not be exposed in production UI
 */

export const DEMO_USERS = [
  // === NAVIRA INTERNAL ===
  { email: 'owner@moveinsync.com', password: 'Admin@2026', name: 'Navira Owner', role: 'NAVIRA_OWNER', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'platform.admin@moveinsync.com', password: 'Admin@2026', name: 'Platform Administrator', role: 'NAVIRA_PLATFORM_ADMINISTRATOR', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'ops.manager@moveinsync.com', password: 'Admin@2026', name: 'Operations Manager', role: 'NAVIRA_PLATFORM_OPERATIONS_MANAGER', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'finance.admin@moveinsync.com', password: 'Admin@2026', name: 'Finance Administrator', role: 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'security.admin@moveinsync.com', password: 'Admin@2026', name: 'Security Administrator', role: 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'compliance.officer@moveinsync.com', password: 'Admin@2026', name: 'Compliance Officer', role: 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'auditor@moveinsync.com', password: 'Admin@2026', name: 'Platform Auditor', role: 'NAVIRA_PLATFORM_AUDITOR', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'integration.admin@moveinsync.com', password: 'Admin@2026', name: 'Integration Administrator', role: 'NAVIRA_INTEGRATION_API_ADMINISTRATOR', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'client.success@moveinsync.com', password: 'Admin@2026', name: 'Client Success Manager', role: 'NAVIRA_CLIENT_SUCCESS_MANAGER', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'implementation.coordinator@moveinsync.com', password: 'Admin@2026', name: 'Implementation Coordinator', role: 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },
  { email: 'support.engineer@moveinsync.com', password: 'Admin@2026', name: 'Support Engineer', role: 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER', securityDomain: SecurityDomain.NAVIRA_INTERNAL, identityType: IdentityType.NAVIRA_EMPLOYEE, companyId: null },

  // === CUSTOMER ===
  { email: 'admin@acme.com', password: 'Admin@2026', name: 'Transport Admin', role: 'TRANSPORT_ADMIN', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'sub.admin@acme.com', password: 'Admin@2026', name: 'Transport Sub-Admin', role: 'TRANSPORT_SUB_ADMIN', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'coordinator@acme.com', password: 'Admin@2026', name: 'Transport Coordinator', role: 'TRANSPORT_COORDINATOR', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'compliance@acme.com', password: 'Admin@2026', name: 'Transport Compliance', role: 'COMPLIANCE_OFFICER', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'director@acme.com', password: 'Admin@2026', name: 'Director', role: 'DIRECTOR', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'senior.manager@acme.com', password: 'Admin@2026', name: 'Senior Manager', role: 'SENIOR_MANAGER', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'manager@acme.com', password: 'Admin@2026', name: 'Manager', role: 'MANAGER', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'asst.manager@acme.com', password: 'Admin@2026', name: 'Assistant Manager', role: 'ASSISTANT_MANAGER', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'teamlead@acme.com', password: 'Admin@2026', name: 'Team Leader', role: 'TEAM_LEADER', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'employee@acme.com', password: 'Admin@2026', name: 'Employee', role: 'EMPLOYEE', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },
  { email: 'trainer@acme.com', password: 'Admin@2026', name: 'Trainer', role: 'TRAINER', securityDomain: SecurityDomain.CUSTOMER_INTERNAL, identityType: IdentityType.CUSTOMER_USER, companyId: 'acme' },

  // === VENDOR ===
  { email: 'vendor.admin@acme.com', password: 'Admin@2026', name: 'Vendor Admin', role: 'VENDOR_ADMIN', securityDomain: SecurityDomain.VENDOR_EXTERNAL, identityType: IdentityType.VENDOR_USER, companyId: 'acme' },

  // === DRIVER ===
  { email: 'driver@acme.com', password: 'Admin@2026', name: 'Driver', role: 'DRIVER', securityDomain: SecurityDomain.DRIVER_EXTERNAL, identityType: IdentityType.DRIVER, companyId: 'acme' },

  // === GUARD ===
  { email: 'guard@acme.com', password: 'Admin@2026', name: 'Guard', role: 'GUARD', securityDomain: SecurityDomain.GUARD_EXTERNAL, identityType: IdentityType.GUARD, companyId: 'acme' },
];

export async function seedDemoUsers() {
  console.log('Seeding canonical demo users...');

  // Find Acme company
  const acmeCompany = await prisma.company.findFirst({ where: { companyCode: 'ACME' } });

  for (const demo of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(demo.password, 12);

    // Resolve companyId
    let companyId = demo.companyId;
    if (companyId === 'acme' && acmeCompany) {
      companyId = acmeCompany.id;
    } else if (companyId === 'acme') {
      console.log(`  Skipping ${demo.email} — Acme company not found`);
      continue;
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        name: demo.name,
        securityDomain: demo.securityDomain,
        identityType: demo.identityType,
        status: 'ACTIVE',
      },
      create: {
        email: demo.email,
        name: demo.name,
        passwordHash,
        securityDomain: demo.securityDomain,
        identityType: demo.identityType,
        companyId: companyId || '',
        status: 'ACTIVE',
      },
    });

    // Create company membership if user belongs to a company
    if (companyId) {
      const existingMembership = await prisma.companyMembership.findFirst({
        where: { userId: user.id, companyId },
      });

      if (!existingMembership) {
        await prisma.companyMembership.create({
          data: {
            userId: user.id,
            companyId,
            role: demo.role as any,
            status: 'ACTIVE',
          },
        });
      }
    }

    // Create role assignment
    const role = await prisma.role.findFirst({ where: { name: demo.role } });
    if (role) {
      const existingAssignment = await prisma.userRoleAssignment.findFirst({
        where: { userId: user.id, roleId: role.id },
      });

      if (!existingAssignment) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }
    }

    // Create platform role assignment for NAVIRA internal users
    if (demo.securityDomain === SecurityDomain.NAVIRA_INTERNAL) {
      const platformRole = demo.role as any;
      const existingPlatformAssignment = await prisma.platformRoleAssignment.findFirst({
        where: { userId: user.id, role: platformRole },
      });

      if (!existingPlatformAssignment) {
        await prisma.platformRoleAssignment.create({
          data: {
            userId: user.id,
            role: platformRole,
            isActive: true,
          },
        });
      }
    }

    console.log(`  Created/updated: ${demo.email} (${demo.role})`);
  }

  console.log(`Seeded ${DEMO_USERS.length} canonical demo users`);
}
