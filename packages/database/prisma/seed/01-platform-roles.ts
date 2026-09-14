import { PrismaClient, SecurityDomain, IdentityType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Canonical NAVIRA Internal Roles
 * securityDomain = NAVIRA_INTERNAL
 * identityType = NAVIRA_EMPLOYEE
 */

export const CANONICAL_NAVIRA_ROLES = [
  {
    code: 'NAVIRA_OWNER',
    displayName: 'Owner',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 1,
    parentRoleCode: null,
    purpose: 'Highest governance authority over the NAVIRA platform',
    responsibilities: ['platform.manage', 'company.create', 'role.assign', 'permission.grant', 'billing.manage', 'security.manage', 'audit.view'],
    deniedActions: [],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    displayName: 'Platform Administrator',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 2,
    parentRoleCode: 'NAVIRA_OWNER',
    purpose: 'Manage platform configuration and customer lifecycle',
    responsibilities: ['company.manage', 'platform.config', 'customer.lifecycle', 'security.audit'],
    deniedActions: ['navira.employee.create', 'navira.employee.primaryRole.change', 'navira.permission.grant', 'navira.owner.access.modify'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
    displayName: 'Operations Manager',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 3,
    parentRoleCode: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    purpose: 'Cross-company operational monitoring and dispatch oversight',
    responsibilities: ['trip.view', 'dispatch.manage', 'driver.view', 'vehicle.view', 'performance.monitor'],
    deniedActions: ['navira.employee.manage', 'billing.manage', 'security.manage'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
    displayName: 'Finance Administrator',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 3,
    parentRoleCode: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    purpose: 'Manage SaaS billing, platform invoices, and revenue',
    responsibilities: ['billing.manage', 'invoice.manage', 'revenue.track', 'payment.reconcile', 'financial.report'],
    deniedActions: ['trip.assign', 'driver.manage', 'gps.manage', 'permission.grant'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
    displayName: 'Security Administrator',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 3,
    parentRoleCode: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    purpose: 'Manage identity, access control, and security policies',
    responsibilities: ['security.manage', 'mfa.manage', 'access.control', 'security.audit', 'incident.respond'],
    deniedActions: ['billing.manage', 'trip.assign', 'driver.manage'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
    displayName: 'Compliance Officer',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 3,
    parentRoleCode: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    purpose: 'Ensure regulatory compliance and policy adherence',
    responsibilities: ['compliance.monitor', 'audit.view', 'policy.enforce', 'regulation.track'],
    deniedActions: ['billing.manage', 'trip.assign', 'security.manage'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_PLATFORM_AUDITOR',
    displayName: 'Platform Auditor',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 3,
    parentRoleCode: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    purpose: 'Conduct audits and generate compliance reports',
    responsibilities: ['audit.view', 'audit.log', 'compliance.report', 'data.export'],
    deniedActions: ['billing.manage', 'trip.assign', 'security.manage', 'role.assign'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_INTEGRATION_API_ADMINISTRATOR',
    displayName: 'Integration Administrator',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 3,
    parentRoleCode: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    purpose: 'Manage API integrations, webhooks, and third-party connections',
    responsibilities: ['api.manage', 'webhook.manage', 'integration.configure', 'integration.monitor'],
    deniedActions: ['billing.manage', 'trip.assign', 'security.manage'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_CLIENT_SUCCESS_MANAGER',
    displayName: 'Client Success Manager',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 3,
    parentRoleCode: 'NAVIRA_PLATFORM_ADMINISTRATOR',
    purpose: 'Manage customer lifecycle, onboarding, and retention',
    responsibilities: ['customer.manage', 'onboarding.manage', 'retention.track', 'support.escalate'],
    deniedActions: ['billing.manage', 'security.manage', 'trip.assign'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
    displayName: 'Implementation Coordinator',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 4,
    parentRoleCode: 'NAVIRA_CLIENT_SUCCESS_MANAGER',
    purpose: 'Coordinate customer implementation and onboarding',
    responsibilities: ['implementation.manage', 'onboarding.execute', 'training.deliver', 'go_live.support'],
    deniedActions: ['billing.manage', 'security.manage', 'trip.assign', 'role.assign'],
    scopeTypes: ['PLATFORM'],
  },
  {
    code: 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
    displayName: 'Support Engineer',
    securityDomain: SecurityDomain.NAVIRA_INTERNAL,
    identityType: IdentityType.NAVIRA_EMPLOYEE,
    hierarchyLevel: 4,
    parentRoleCode: 'NAVIRA_CLIENT_SUCCESS_MANAGER',
    purpose: 'Handle customer support tickets and triage issues',
    responsibilities: ['ticket.manage', 'issue.triage', 'support.escalate', 'knowledge.maintain'],
    deniedActions: ['billing.manage', 'security.manage', 'trip.assign', 'role.assign'],
    scopeTypes: ['PLATFORM'],
  },
];

export async function seedPlatformRoles() {
  console.log('Seeding canonical NAVIRA platform roles...');

  for (const role of CANONICAL_NAVIRA_ROLES) {
    await prisma.role.upsert({
      where: { name: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: role.securityDomain,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
      create: {
        name: role.code,
        displayName: role.displayName,
        description: role.purpose,
        securityDomain: role.securityDomain,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
    });

    await prisma.roleHierarchy.upsert({
      where: { roleCode: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: role.securityDomain,
        identityType: role.identityType,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        childRoleCodes: [],
        purpose: role.purpose,
        responsibilities: role.responsibilities,
        deniedActions: role.deniedActions,
        scopeTypes: role.scopeTypes,
      },
      create: {
        roleCode: role.code,
        displayName: role.displayName,
        securityDomain: role.securityDomain,
        identityType: role.identityType,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        childRoleCodes: [],
        purpose: role.purpose,
        responsibilities: role.responsibilities,
        deniedActions: role.deniedActions,
        scopeTypes: role.scopeTypes,
      },
    });
  }

  console.log(`Seeded ${CANONICAL_NAVIRA_ROLES.length} canonical NAVIRA roles`);
}
