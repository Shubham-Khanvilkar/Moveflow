import { PrismaClient, SecurityDomain, IdentityType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Canonical Customer Roles
 * securityDomain = CUSTOMER_INTERNAL
 * identityType = CUSTOMER_USER
 */

export const CANONICAL_CUSTOMER_ROLES = [
  { code: 'COMPANY_ADMIN', displayName: 'Company Admin', hierarchyLevel: 1, parentRoleCode: null, purpose: 'Full administrative control over the company account' },
  { code: 'COMPANY_SUB_ADMIN', displayName: 'Company Sub-Admin', hierarchyLevel: 2, parentRoleCode: 'COMPANY_ADMIN', purpose: 'Delegated administrative control' },
  { code: 'DIRECTOR', displayName: 'Director', hierarchyLevel: 3, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Executive oversight and approvals' },
  { code: 'TRANSPORT_HEAD', displayName: 'Transport Head', hierarchyLevel: 3, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Lead transport operations across the company' },
  { code: 'TRANSPORT_ADMIN', displayName: 'Transport Admin', hierarchyLevel: 4, parentRoleCode: 'TRANSPORT_HEAD', purpose: 'Manage all transport operations' },
  { code: 'TRANSPORT_SUB_ADMIN', displayName: 'Transport Sub-Admin', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Delegated transport operations management' },
  { code: 'TRANSPORT_COORDINATOR', displayName: 'Transport Coordinator', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Coordinate dispatch and bookings' },
  { code: 'DISPATCHER', displayName: 'Dispatcher', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Assign drivers and vehicles to trips' },
  { code: 'CONTROL_ROOM_OPERATOR', displayName: 'Control Room Operator', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Monitor live trips and respond to alerts' },
  { code: 'FLEET_MANAGER', displayName: 'Fleet Manager', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Manage vehicle fleet and maintenance' },
  { code: 'ROUTE_ADMIN', displayName: 'Route Admin', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Create and optimize routes' },
  { code: 'SAFETY_ADMIN', displayName: 'Safety Admin', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Enforce safety policies and handle incidents' },
  { code: 'FEMALE_TRANSPORT_ADMIN', displayName: 'Female Transport Admin', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Manage female transport safety policies' },
  { code: 'EMERGENCY_RESPONSE_OFFICER', displayName: 'Emergency Response Officer', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Respond to emergencies and SOS alerts' },
  { code: 'INCIDENT_MANAGER', displayName: 'Incident Manager', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_ADMIN', purpose: 'Investigate and resolve incidents' },
  { code: 'VENDOR_MANAGER', displayName: 'Vendor Manager', hierarchyLevel: 5, parentRoleCode: 'TRANSPORT_HEAD', purpose: 'Manage vendor relationships and contracts' },
  { code: 'VENDOR_COMPLIANCE_MANAGER', displayName: 'Vendor Compliance Manager', hierarchyLevel: 5, parentRoleCode: 'VENDOR_MANAGER', purpose: 'Ensure vendor compliance with policies' },
  { code: 'FINANCE_ADMIN', displayName: 'Finance Admin', hierarchyLevel: 4, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Manage transport billing and finances' },
  { code: 'FINANCE_APPROVER', displayName: 'Finance Approver', hierarchyLevel: 5, parentRoleCode: 'FINANCE_ADMIN', purpose: 'Approve invoices and payments' },
  { code: 'FINANCE_VIEWER', displayName: 'Finance Viewer', hierarchyLevel: 5, parentRoleCode: 'FINANCE_ADMIN', purpose: 'View financial reports and data' },
  { code: 'COST_ANALYST', displayName: 'Cost Analyst', hierarchyLevel: 5, parentRoleCode: 'FINANCE_ADMIN', purpose: 'Analyze transport costs and optimize spending' },
  { code: 'REPORTING_ADMIN', displayName: 'Reporting Admin', hierarchyLevel: 4, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Generate and distribute reports' },
  { code: 'SECURITY_ADMIN', displayName: 'Security Admin', hierarchyLevel: 4, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Manage security policies and access control' },
  { code: 'AUDITOR', displayName: 'Auditor', hierarchyLevel: 4, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Conduct internal audits and compliance reviews' },
  { code: 'COMPLIANCE_OFFICER', displayName: 'Compliance Officer', hierarchyLevel: 4, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Ensure regulatory compliance' },
  { code: 'PROCESS_HEAD', displayName: 'Process Head', hierarchyLevel: 4, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Lead a specific process or business unit' },
  { code: 'PROCESS_ADMIN', displayName: 'Process Admin', hierarchyLevel: 5, parentRoleCode: 'PROCESS_HEAD', purpose: 'Manage transport operations for a process' },
  { code: 'SITE_ADMIN', displayName: 'Site Admin', hierarchyLevel: 4, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Manage transport operations at a specific site' },
  { code: 'SITE_TRANSPORT_ADMIN', displayName: 'Site Transport Admin', hierarchyLevel: 5, parentRoleCode: 'SITE_ADMIN', purpose: 'Manage transport operations at a specific site' },
  { code: 'SITE_SECURITY_ADMIN', displayName: 'Site Security Admin', hierarchyLevel: 5, parentRoleCode: 'SITE_ADMIN', purpose: 'Manage security at a specific site' },
  { code: 'FACILITY_MANAGER', displayName: 'Facility Manager', hierarchyLevel: 5, parentRoleCode: 'SITE_ADMIN', purpose: 'Manage facility operations including transport' },
  { code: 'SITE_OPERATIONS_MANAGER', displayName: 'Site Operations Manager', hierarchyLevel: 5, parentRoleCode: 'SITE_ADMIN', purpose: 'Manage day-to-day site operations' },
  { code: 'MANAGER', displayName: 'Manager', hierarchyLevel: 5, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Manage a team and approve bookings' },
  { code: 'TEAM_LEADER', displayName: 'Team Leader', hierarchyLevel: 6, parentRoleCode: 'MANAGER', purpose: 'Lead a small team and approve daily bookings' },
  { code: 'SHIFT_SUPERVISOR', displayName: 'Shift Supervisor', hierarchyLevel: 5, parentRoleCode: 'COMPANY_SUB_ADMIN', purpose: 'Supervise shift operations' },
  { code: 'TRAVEL_DESK_AGENT', displayName: 'Travel Desk Agent', hierarchyLevel: 6, parentRoleCode: 'MANAGER', purpose: 'Handle travel requests and bookings' },
  { code: 'TRANSPORT_HELPDESK_AGENT', displayName: 'Transport Helpdesk Agent', hierarchyLevel: 6, parentRoleCode: 'MANAGER', purpose: 'Handle transport-related queries and issues' },
  { code: 'BOOKING_COORDINATOR', displayName: 'Booking Coordinator', hierarchyLevel: 6, parentRoleCode: 'MANAGER', purpose: 'Coordinate employee bookings' },
  { code: 'EXECUTIVE_ASSISTANT_BOOKER', displayName: 'Executive Assistant Booker', hierarchyLevel: 6, parentRoleCode: 'MANAGER', purpose: 'Book transport for executives' },
  { code: 'EVACUATION_COORDINATOR', displayName: 'Evacuation Coordinator', hierarchyLevel: 6, parentRoleCode: 'MANAGER', purpose: 'Coordinate emergency evacuations' },
  { code: 'TRAINER', displayName: 'Trainer', hierarchyLevel: 6, parentRoleCode: 'MANAGER', purpose: 'Train employees on transport policies' },
  { code: 'EMPLOYEE', displayName: 'Employee', hierarchyLevel: 7, parentRoleCode: 'TEAM_LEADER', purpose: 'Book and use transport services' },
];

export async function seedCustomerRoles() {
  console.log('Seeding canonical customer roles...');

  for (const role of CANONICAL_CUSTOMER_ROLES) {
    await prisma.role.upsert({
      where: { name: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: SecurityDomain.CUSTOMER_INTERNAL,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
      create: {
        name: role.code,
        displayName: role.displayName,
        description: role.purpose,
        securityDomain: SecurityDomain.CUSTOMER_INTERNAL,
        hierarchyLevel: role.hierarchyLevel,
        isActive: true,
      },
    });

    await prisma.roleHierarchy.upsert({
      where: { roleCode: role.code },
      update: {
        displayName: role.displayName,
        securityDomain: SecurityDomain.CUSTOMER_INTERNAL,
        identityType: IdentityType.CUSTOMER_USER,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        purpose: role.purpose,
      },
      create: {
        roleCode: role.code,
        displayName: role.displayName,
        securityDomain: SecurityDomain.CUSTOMER_INTERNAL,
        identityType: IdentityType.CUSTOMER_USER,
        hierarchyLevel: role.hierarchyLevel,
        parentRoleCode: role.parentRoleCode,
        childRoleCodes: [],
        purpose: role.purpose,
        responsibilities: [],
        deniedActions: [],
        scopeTypes: ['COMPANY', 'SITE', 'PROCESS'],
      },
    });
  }

  console.log(`Seeded ${CANONICAL_CUSTOMER_ROLES.length} canonical customer roles`);
}
