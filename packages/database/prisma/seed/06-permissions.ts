import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Canonical Permission Definitions
 * Organized by domain with risk levels and scope types
 */

export const CANONICAL_PERMISSIONS = [
  // === PLATFORM PERMISSIONS (NAVIRA_INTERNAL) ===
  { key: 'platform.manage', displayName: 'Manage Platform', domain: 'NAVIRA_INTERNAL', riskLevel: 'CRITICAL', scopeType: 'PLATFORM' },
  { key: 'platform.config', displayName: 'Configure Platform', domain: 'NAVIRA_INTERNAL', riskLevel: 'HIGH', scopeType: 'PLATFORM' },
  { key: 'company.create', displayName: 'Create Company', domain: 'NAVIRA_INTERNAL', riskLevel: 'HIGH', scopeType: 'PLATFORM' },
  { key: 'company.manage', displayName: 'Manage Company', domain: 'NAVIRA_INTERNAL', riskLevel: 'HIGH', scopeType: 'PLATFORM' },
  { key: 'role.assign', displayName: 'Assign Roles', domain: 'NAVIRA_INTERNAL', riskLevel: 'CRITICAL', scopeType: 'PLATFORM' },
  { key: 'permission.grant', displayName: 'Grant Permissions', domain: 'NAVIRA_INTERNAL', riskLevel: 'CRITICAL', scopeType: 'PLATFORM' },
  { key: 'security.manage', displayName: 'Manage Security', domain: 'NAVIRA_INTERNAL', riskLevel: 'CRITICAL', scopeType: 'PLATFORM' },
  { key: 'security.audit', displayName: 'Audit Security', domain: 'NAVIRA_INTERNAL', riskLevel: 'HIGH', scopeType: 'PLATFORM' },
  { key: 'billing.manage', displayName: 'Manage Billing', domain: 'NAVIRA_INTERNAL', riskLevel: 'HIGH', scopeType: 'PLATFORM' },
  { key: 'audit.view', displayName: 'View Audit Logs', domain: 'NAVIRA_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'PLATFORM' },
  { key: 'audit.log', displayName: 'Create Audit Logs', domain: 'NAVIRA_INTERNAL', riskLevel: 'LOW', scopeType: 'PLATFORM' },

  // === CUSTOMER PERMISSIONS (CUSTOMER_INTERNAL) ===
  { key: 'booking.create', displayName: 'Create Booking', domain: 'CUSTOMER_INTERNAL', riskLevel: 'LOW', scopeType: 'COMPANY' },
  { key: 'booking.approve', displayName: 'Approve Booking', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'booking.cancel', displayName: 'Cancel Booking', domain: 'CUSTOMER_INTERNAL', riskLevel: 'LOW', scopeType: 'COMPANY' },
  { key: 'booking.self', displayName: 'Self Booking', domain: 'CUSTOMER_INTERNAL', riskLevel: 'LOW', scopeType: 'SELF' },
  { key: 'booking.team', displayName: 'Team Booking', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'HIERARCHY' },
  { key: 'booking.process', displayName: 'Process Booking', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'PROCESS' },
  { key: 'trip.view', displayName: 'View Trips', domain: 'CUSTOMER_INTERNAL', riskLevel: 'LOW', scopeType: 'COMPANY' },
  { key: 'trip.assign', displayName: 'Assign Trip', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'trip.reassign', displayName: 'Reassign Trip', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'trip.passenger_reassign', displayName: 'Reassign Passenger', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'dispatch.manage', displayName: 'Manage Dispatch', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'driver.view', displayName: 'View Drivers', domain: 'CUSTOMER_INTERNAL', riskLevel: 'LOW', scopeType: 'COMPANY' },
  { key: 'driver.assign', displayName: 'Assign Driver', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'vehicle.assign', displayName: 'Assign Vehicle', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'gps.view_live', displayName: 'View Live GPS', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'gps.view_history', displayName: 'View GPS History', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'incident.create', displayName: 'Create Incident', domain: 'CUSTOMER_INTERNAL', riskLevel: 'LOW', scopeType: 'COMPANY' },
  { key: 'incident.manage', displayName: 'Manage Incidents', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'billing.external.view', displayName: 'View External Billing', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'billing.external.approve', displayName: 'Approve External Billing', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'billing.internal.manage', displayName: 'Manage Internal Billing', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'report.export', displayName: 'Export Reports', domain: 'CUSTOMER_INTERNAL', riskLevel: 'LOW', scopeType: 'COMPANY' },
  { key: 'user.assign_scope', displayName: 'Assign User Scope', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'employee.create', displayName: 'Create Employee', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'employee.manage', displayName: 'Manage Employees', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'vendor.manage', displayName: 'Manage Vendors', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'route.manage', displayName: 'Manage Routes', domain: 'CUSTOMER_INTERNAL', riskLevel: 'MEDIUM', scopeType: 'COMPANY' },
  { key: 'policy.manage', displayName: 'Manage Policies', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'safety.manage', displayName: 'Manage Safety', domain: 'CUSTOMER_INTERNAL', riskLevel: 'HIGH', scopeType: 'COMPANY' },
  { key: 'sos.trigger', displayName: 'Trigger SOS', domain: 'CUSTOMER_INTERNAL', riskLevel: 'CRITICAL', scopeType: 'SELF' },

  // === VENDOR PERMISSIONS (VENDOR_EXTERNAL) ===
  { key: 'vendor.driver.manage', displayName: 'Manage Drivers', domain: 'VENDOR_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'VENDOR' },
  { key: 'vendor.vehicle.manage', displayName: 'Manage Vehicles', domain: 'VENDOR_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'VENDOR' },
  { key: 'vendor.trip.view', displayName: 'View Trips', domain: 'VENDOR_EXTERNAL', riskLevel: 'LOW', scopeType: 'VENDOR' },
  { key: 'vendor.invoice.manage', displayName: 'Manage Invoices', domain: 'VENDOR_EXTERNAL', riskLevel: 'HIGH', scopeType: 'VENDOR' },
  { key: 'vendor.compliance.view', displayName: 'View Compliance', domain: 'VENDOR_EXTERNAL', riskLevel: 'LOW', scopeType: 'VENDOR' },

  // === DRIVER PERMISSIONS (DRIVER_EXTERNAL) ===
  { key: 'driver.trip.view', displayName: 'View Assigned Trips', domain: 'DRIVER_EXTERNAL', riskLevel: 'LOW', scopeType: 'TRIP' },
  { key: 'driver.trip.accept', displayName: 'Accept Trip', domain: 'DRIVER_EXTERNAL', riskLevel: 'LOW', scopeType: 'TRIP' },
  { key: 'driver.trip.navigate', displayName: 'Navigate Trip', domain: 'DRIVER_EXTERNAL', riskLevel: 'LOW', scopeType: 'TRIP' },
  { key: 'driver.boarding.mark', displayName: 'Mark Boarding', domain: 'DRIVER_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'TRIP' },
  { key: 'driver.noshow.report', displayName: 'Report No-Show', domain: 'DRIVER_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'TRIP' },
  { key: 'driver.breakdown.report', displayName: 'Report Breakdown', domain: 'DRIVER_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'TRIP' },
  { key: 'driver.sos.trigger', displayName: 'Trigger SOS', domain: 'DRIVER_EXTERNAL', riskLevel: 'CRITICAL', scopeType: 'TRIP' },
  { key: 'driver.trip.complete', displayName: 'Complete Trip', domain: 'DRIVER_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'TRIP' },

  // === GUARD PERMISSIONS (GUARD_EXTERNAL) ===
  { key: 'guard.trip.monitor', displayName: 'Monitor Trips', domain: 'GUARD_EXTERNAL', riskLevel: 'LOW', scopeType: 'TRIP' },
  { key: 'guard.qr.scan', displayName: 'Scan QR', domain: 'GUARD_EXTERNAL', riskLevel: 'LOW', scopeType: 'TRIP' },
  { key: 'guard.boarding.verify', displayName: 'Verify Boarding', domain: 'GUARD_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'TRIP' },
  { key: 'guard.safety.report', displayName: 'Report Safety', domain: 'GUARD_EXTERNAL', riskLevel: 'MEDIUM', scopeType: 'TRIP' },
  { key: 'guard.alert.escalate', displayName: 'Escalate Alert', domain: 'GUARD_EXTERNAL', riskLevel: 'HIGH', scopeType: 'TRIP' },
];

export async function seedPermissions() {
  console.log('Seeding canonical permissions...');

  for (const perm of CANONICAL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        displayName: perm.displayName,
        category: perm.domain,
        riskLevel: perm.riskLevel,
      },
      create: {
        key: perm.key,
        displayName: perm.displayName,
        description: `${perm.displayName} — ${perm.domain}`,
        category: perm.domain,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${CANONICAL_PERMISSIONS.length} canonical permissions`);
}
