/**
 * Legacy-to-Canonical Role Mapping
 *
 * This mapping is used to normalize legacy role names to canonical names
 * across the entire codebase. It should be the single source of truth
 * for role name normalization.
 *
 * Usage:
 *   import { LEGACY_TO_CANONICAL, normalizeRole } from './role-mapping';
 *
 *   const canonicalRole = normalizeRole('SUPER_ADMIN'); // 'NAVIRA_PLATFORM_ADMINISTRATOR'
 */

export const LEGACY_TO_CANONICAL: Record<string, string> = {
  // Legacy NAVIRA internal roles → canonical NAVIRA_ prefix
  'SUPER_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'MOVE_IN_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE_TEAM': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'PROJECT_MANAGER': 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
  'PROJECT_COORDINATOR': 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
  'PLATFORM_COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMINISTRATOR': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT_ENGINEER': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'PLATFORM_AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',

  // Legacy owner aliases → canonical
  'SAAS_OWNER': 'NAVIRA_OWNER',
  'MOVEINSYNC_OWNER': 'NAVIRA_OWNER',

  // Legacy PlatformRole aliases → canonical
  'SUPERADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMIN': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',

  // Legacy customer role aliases → canonical
  'COORDINATOR': 'TRANSPORT_COORDINATOR',
  'SUB_ADMIN': 'TRANSPORT_SUB_ADMIN',
  'SENIOR_MGR': 'SENIOR_MANAGER',
  'ASST_MANAGER': 'ASSISTANT_MANAGER',
  'VENDOR': 'VENDOR_ADMIN',
  'ADMIN': 'TRANSPORT_ADMIN',
};

/**
 * Canonical role names by security domain
 */
export const CANONICAL_ROLES = {
  NAVIRA_INTERNAL: [
    'NAVIRA_OWNER',
    'NAVIRA_PLATFORM_ADMINISTRATOR',
    'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
    'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
    'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
    'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
    'NAVIRA_PLATFORM_AUDITOR',
    'NAVIRA_INTEGRATION_API_ADMINISTRATOR',
    'NAVIRA_CLIENT_SUCCESS_MANAGER',
    'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
    'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  ],
  CUSTOMER_INTERNAL: [
    'COMPANY_ADMIN',
    'COMPANY_SUB_ADMIN',
    'DIRECTOR',
    'TRANSPORT_HEAD',
    'TRANSPORT_ADMIN',
    'TRANSPORT_SUB_ADMIN',
    'TRANSPORT_COORDINATOR',
    'DISPATCHER',
    'CONTROL_ROOM_OPERATOR',
    'FLEET_MANAGER',
    'ROUTE_ADMIN',
    'SAFETY_ADMIN',
    'FEMALE_TRANSPORT_ADMIN',
    'EMERGENCY_RESPONSE_OFFICER',
    'INCIDENT_MANAGER',
    'VENDOR_MANAGER',
    'VENDOR_COMPLIANCE_MANAGER',
    'FINANCE_ADMIN',
    'FINANCE_APPROVER',
    'FINANCE_VIEWER',
    'COST_ANALYST',
    'REPORTING_ADMIN',
    'SECURITY_ADMIN',
    'AUDITOR',
    'COMPLIANCE_OFFICER',
    'PROCESS_HEAD',
    'PROCESS_ADMIN',
    'SITE_ADMIN',
    'SITE_TRANSPORT_ADMIN',
    'SITE_SECURITY_ADMIN',
    'FACILITY_MANAGER',
    'SITE_OPERATIONS_MANAGER',
    'MANAGER',
    'TEAM_LEADER',
    'SHIFT_SUPERVISOR',
    'TRAVEL_DESK_AGENT',
    'TRANSPORT_HELPDESK_AGENT',
    'BOOKING_COORDINATOR',
    'EXECUTIVE_ASSISTANT_BOOKER',
    'EVACUATION_COORDINATOR',
    'TRAINER',
    'EMPLOYEE',
  ],
  VENDOR_EXTERNAL: [
    'VENDOR_ADMIN',
    'VENDOR_SUB_ADMIN',
    'VENDOR_OPERATIONS_MANAGER',
    'VENDOR_DISPATCHER',
    'VENDOR_FLEET_MANAGER',
    'VENDOR_DRIVER_MANAGER',
    'VENDOR_FINANCE',
    'VENDOR_COORDINATOR',
    'VENDOR_VIEWER',
  ],
  DRIVER_EXTERNAL: [
    'DRIVER_SUPERVISOR',
    'DRIVER',
  ],
  GUARD_EXTERNAL: [
    'GUARD_SUPERVISOR',
    'GUARD',
  ],
};

/**
 * All canonical role codes (flat array)
 */
export const ALL_CANONICAL_ROLES = Object.values(CANONICAL_ROLES).flat();

/**
 * Normalize a role name to its canonical form
 * If the role is already canonical, returns it unchanged
 * If the role is a legacy alias, returns the canonical equivalent
 * If the role is unknown, returns the original role name
 */
export function normalizeRole(role: string): string {
  return LEGACY_TO_CANONICAL[role] || role;
}

/**
 * Normalize an array of role names to canonical forms
 */
export function normalizeRoles(roles: string[]): string[] {
  const normalized = roles.map(r => normalizeRole(r));
  return [...new Set(normalized)]; // deduplicate
}

/**
 * Check if a role is a canonical NAVIRA internal role
 */
export function isNaviraInternalRole(role: string): boolean {
  return CANONICAL_ROLES.NAVIRA_INTERNAL.includes(role);
}

/**
 * Check if a role is a canonical customer role
 */
export function isCustomerRole(role: string): boolean {
  return CANONICAL_ROLES.CUSTOMER_INTERNAL.includes(role);
}

/**
 * Check if a role is a canonical vendor role
 */
export function isVendorRole(role: string): boolean {
  return CANONICAL_ROLES.VENDOR_EXTERNAL.includes(role);
}

/**
 * Check if a role is a canonical driver role
 */
export function isDriverRole(role: string): boolean {
  return CANONICAL_ROLES.DRIVER_EXTERNAL.includes(role);
}

/**
 * Check if a role is a canonical guard role
 */
export function isGuardRole(role: string): boolean {
  return CANONICAL_ROLES.GUARD_EXTERNAL.includes(role);
}

/**
 * Check if a role is canonical (not a legacy alias)
 */
export function isCanonicalRole(role: string): boolean {
  return ALL_CANONICAL_ROLES.includes(role);
}

/**
 * Get the security domain for a canonical role
 */
export function getSecurityDomainForRole(role: string): string | null {
  for (const [domain, roles] of Object.entries(CANONICAL_ROLES)) {
    if (roles.includes(role)) {
      return domain;
    }
  }
  return null;
}
