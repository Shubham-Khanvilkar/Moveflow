# PLAN 3: ROLE & IDENTITY MODEL MIGRATION

> **Date:** September 7, 2026
> **Status:** IMPLEMENTED — All 8 phases complete, schema migrated, data migrated, verified
> **Scope:** Canonical role separation, identity model normalization, cross-domain authorization
> **Blocks:** All future feature work (billing, safety, intelligence, mobile)

---

## TABLE OF CONTENTS

1. [Verified Current State](#1-verified-current-state)
2. [Confirmed Problems](#2-confirmed-problems)
3. [Canonical Model](#3-canonical-model)
4. [Phase 1: Schema Migration](#4-phase-1-schema-migration)
5. [Phase 2: Seed Consolidation](#5-phase-2-seed-consolidation)
6. [Phase 3: Auth Service Normalization](#6-phase-3-auth-service-normalization)
7. [Phase 4: Auth Controller Cleanup](#7-phase-4-auth-controller-cleanup)
8. [Phase 5: Guard Updates](#8-phase-5-guard-updates)
9. [Phase 6: Frontend Updates](#9-phase-6-frontend-updates)
10. [Phase 7: Migration Script](#10-phase-7-migration-script)
11. [Phase 8: Cross-Domain Authorization Tests](#11-phase-8-cross-domain-authorization-tests)
12. [Execution Order](#12-execution-order)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [Open Questions](#14-open-questions)

---

## 1. VERIFIED CURRENT STATE

| Component | Status | Details |
|-----------|--------|---------|
| `SecurityDomain` enum | ✅ CORRECT | 5 canonical values match spec |
| `IdentityType` enum | ✅ CORRECT | 5 canonical values match spec |
| `User.securityDomain` | ✅ PRESENT | Field exists with correct default |
| `User.identityType` | ✅ PRESENT | Field exists with correct default |
| `User.primaryRoleId` | ✅ PRESENT | Field exists, nullable |
| `PlatformAdminGuard` | ✅ CLEAN | Uses 11 canonical NAVIRA_ roles + `securityDomain === 'NAVIRA_INTERNAL'` |
| `RolesGuard` | ✅ FIXED | No empty-array bug, correct fallback logic |
| `UserRole` enum | ❌ MIXED | 38 values: 11 canonical NAVIRA_ + 27 legacy/non-prefixed |
| `PlatformRole` enum | ❌ LEGACY | Contains `SUPERADMIN`, `FINANCE`, `SECURITY_ADMIN`, `SUPPORT`, `AUDITOR` |
| Auth controller nav | ⚠️ DUPLICATE | Has both `COORDINATOR` and `TRANSPORT_COORDINATOR`, `FINANCE` and `FINANCE_TEAM` |
| Frontend DEMO_ACCOUNTS | ❌ LEGACY | Uses `SECURITY_ADMIN`, `FINANCE`, `SUPPORT`, `SUB_ADMIN`, `COORDINATOR`, `VENDOR` |
| Seed files | ❌ MIXED | 6 seed files with conflicting role names |
| `PlatformRoleAssignment` | ⚠️ DUAL SYSTEM | Separate from `UserRoleAssignment`, can disagree |

### Files Requiring Changes

| # | File | Lines | Issue |
|---|------|-------|-------|
| 1 | `packages/database/prisma/schema.prisma` | 6250-6288 | `UserRole` enum mixed canonical + legacy |
| 2 | `packages/database/prisma/schema.prisma` | 6026-6046 | `PlatformRole` enum has legacy aliases |
| 3 | `apps/api-gateway/src/modules/auth/auth.controller.ts` | 229-384 | Legacy navMap entries: `SAAS_OWNER`, `MOVEINSYNC_OWNER`, `COORDINATOR`, `FINANCE` |
| 4 | `apps/api-gateway/src/modules/auth/auth.service.ts` | 51, 464-564 | JWT payload contains raw legacy role names |
| 5 | `apps/web/src/app/page.tsx` | 84-106 | DEMO_ACCOUNTS use legacy role labels |
| 6 | `packages/database/prisma/seed.ts` | 120, 134 | `MOVE_IN_ADMIN`, `ADMIN` legacy names |
| 7 | `packages/database/prisma/v7-seed-roles.ts` | 16 | `MOVE_IN_ADMIN` legacy name |
| 8 | `packages/database/prisma/v8-seed.ts` | 10 | `MOVE_IN_ADMIN` legacy name |
| 9 | `packages/database/prisma/seed-permissions.ts` | 34 | `SAAS_OWNER`, `MOVEINSYNC_OWNER` legacy names |
| 10 | `packages/database/prisma/seed-owners.ts` | 19, 29 | Legacy `TransportAccessRole` names |
| 11 | `apps/api-gateway/src/common/guards/roles.guard.ts` | 35 | Owner bypass includes legacy names |
| 12 | `apps/api-gateway/src/common/guards/permissions.guard.ts` | 35 | Owner bypass includes legacy names |
| 13 | `apps/api-gateway/src/common/services/authorization.service.ts` | 138 | `MOVE_IN_ADMIN` in dashboard resolver |

---

## 2. CONFIRMED PROBLEMS

### Problem 1: Security Domain Extra
- **Spec requires:** `NAVIRA_INTERNAL`, `CUSTOMER_INTERNAL`, `VENDOR_EXTERNAL`, `DRIVER_EXTERNAL`, `GUARD_EXTERNAL`
- **Current:** Has extra `PLATFORM_INTERNAL` (not in current enum, but referenced in some seed files)
- **Impact:** Potential confusion about which domain internal employees belong to

### Problem 2: Internal Roles Not NAVIRA-Prefixed
- **Canonical internal roles must use `NAVIRA_` prefix**
- **Current legacy names still in codebase:**
  - `SUPER_ADMIN` → should be `NAVIRA_PLATFORM_ADMINISTRATOR`
  - `MOVE_IN_ADMIN` → should be `NAVIRA_PLATFORM_ADMINISTRATOR`
  - `FINANCE_TEAM` → should be `NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR`
  - `PROJECT_MANAGER` → should be `NAVIRA_PLATFORM_OPERATIONS_MANAGER`
  - `PROJECT_COORDINATOR` → should be `NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR`
  - `PLATFORM_COMPLIANCE` → should be `NAVIRA_PLATFORM_COMPLIANCE_OFFICER`
  - `SECURITY_ADMINISTRATOR` → should be `NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR`
  - `SUPPORT_ENGINEER` → should be `NAVIRA_CUSTOMER_SUPPORT_ENGINEER`
  - `PLATFORM_AUDITOR` → should be `NAVIRA_PLATFORM_AUDITOR`

### Problem 3: Roles Mixed in Same Model
- **Current `UserRole` enum** contains all domains in one flat list
- **No separation** between NAVIRA internal, customer, vendor, driver, guard roles
- **Impact:** Role resolution treats unrelated domains as one flat list

### Problem 4: Auth Collapses Roles Into Aliases
- **File:** `auth.controller.ts` `buildNavigation()`
- **Current:** Duplicate entries for legacy and canonical names
- **Legacy entries:** `SAAS_OWNER`, `MOVEINSYNC_OWNER`, `COORDINATOR`, `FINANCE`, `COMPLIANCE`
- **Impact:** Navigation shows wrong sidebar for legacy role names

### Problem 5: Platform Admin Guard Uses Legacy Roles
- **Current:** `PlatformAdminGuard` is CLEAN (uses only canonical NAVIRA_ roles)
- **But:** Other guards (`RolesGuard`, `PermissionsGuard`) still have legacy names in bypass lists

### Problem 6: Dual Authorization Systems
- **`UserRoleAssignment`** — new system, linked to `Role` model
- **`PlatformRoleAssignment`** — separate system for NAVIRA internal roles
- **They can disagree** about who a user is

### Problem 7: Frontend Has Another Role Vocabulary
- **Demo accounts use:** `SECURITY_ADMIN`, `FINANCE`, `SUPPORT`, `SUB_ADMIN`, `COORDINATOR`, `COMPLIANCE`, `VENDOR`, `SENIOR_MGR`, `ASST_MANAGER`
- **Backend uses:** `SECURITY_ADMINISTRATOR`, `FINANCE_TEAM`, `SUPPORT_ENGINEER`, `TRANSPORT_SUB_ADMIN`, `TRANSPORT_COORDINATOR`, `TRANSPORT_COMPLIANCE`, `VENDOR_ADMIN`, `SENIOR_MANAGER`, `ASSISTANT_MANAGER`

---

## 3. CANONICAL MODEL

### Security Domains

```prisma
enum SecurityDomain {
  NAVIRA_INTERNAL    // NAVIRA employees
  CUSTOMER_INTERNAL  // Customer organization users
  VENDOR_EXTERNAL    // Vendor partners
  DRIVER_EXTERNAL    // Drivers
  GUARD_EXTERNAL     // Guards
}
```

### Identity Types

```prisma
enum IdentityType {
  NAVIRA_EMPLOYEE
  CUSTOMER_USER
  VENDOR_USER
  DRIVER
  GUARD
}
```

### Canonical NAVIRA Internal Roles

| Role Code | Display Name | Hierarchy | Parent |
|-----------|-------------|-----------|--------|
| `NAVIRA_OWNER` | Owner | 1 | — |
| `NAVIRA_PLATFORM_ADMINISTRATOR` | Platform Administrator | 2 | `NAVIRA_OWNER` |
| `NAVIRA_PLATFORM_OPERATIONS_MANAGER` | Operations Manager | 3 | `NAVIRA_PLATFORM_ADMINISTRATOR` |
| `NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR` | Finance Administrator | 3 | `NAVIRA_PLATFORM_ADMINISTRATOR` |
| `NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR` | Security Administrator | 3 | `NAVIRA_PLATFORM_ADMINISTRATOR` |
| `NAVIRA_PLATFORM_COMPLIANCE_OFFICER` | Compliance Officer | 3 | `NAVIRA_PLATFORM_ADMINISTRATOR` |
| `NAVIRA_PLATFORM_AUDITOR` | Platform Auditor | 3 | `NAVIRA_PLATFORM_ADMINISTRATOR` |
| `NAVIRA_INTEGRATION_API_ADMINISTRATOR` | Integration Administrator | 3 | `NAVIRA_PLATFORM_ADMINISTRATOR` |
| `NAVIRA_CLIENT_SUCCESS_MANAGER` | Client Success Manager | 3 | `NAVIRA_PLATFORM_ADMINISTRATOR` |
| `NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR` | Implementation Coordinator | 4 | `NAVIRA_CLIENT_SUCCESS_MANAGER` |
| `NAVIRA_CUSTOMER_SUPPORT_ENGINEER` | Support Engineer | 4 | `NAVIRA_CLIENT_SUCCESS_MANAGER` |

### Canonical Customer Roles

| Role Code | Display Name | Hierarchy | Parent |
|-----------|-------------|-----------|--------|
| `COMPANY_ADMIN` | Company Admin | 1 | — |
| `COMPANY_SUB_ADMIN` | Company Sub-Admin | 2 | `COMPANY_ADMIN` |
| `DIRECTOR` | Director | 3 | `COMPANY_SUB_ADMIN` |
| `TRANSPORT_HEAD` | Transport Head | 3 | `COMPANY_SUB_ADMIN` |
| `TRANSPORT_ADMIN` | Transport Admin | 4 | `TRANSPORT_HEAD` |
| `TRANSPORT_SUB_ADMIN` | Transport Sub-Admin | 5 | `TRANSPORT_ADMIN` |
| `TRANSPORT_COORDINATOR` | Transport Coordinator | 5 | `TRANSPORT_ADMIN` |
| `DISPATCHER` | Dispatcher | 5 | `TRANSPORT_ADMIN` |
| `CONTROL_ROOM_OPERATOR` | Control Room Operator | 5 | `TRANSPORT_ADMIN` |
| `FLEET_MANAGER` | Fleet Manager | 5 | `TRANSPORT_ADMIN` |
| `ROUTE_ADMIN` | Route Admin | 5 | `TRANSPORT_ADMIN` |
| `SAFETY_ADMIN` | Safety Admin | 5 | `TRANSPORT_ADMIN` |
| `VENDOR_MANAGER` | Vendor Manager | 5 | `TRANSPORT_HEAD` |
| `FINANCE_ADMIN` | Finance Admin | 4 | `COMPANY_SUB_ADMIN` |
| `FINANCE_APPROVER` | Finance Approver | 5 | `FINANCE_ADMIN` |
| `FINANCE_VIEWER` | Finance Viewer | 5 | `FINANCE_ADMIN` |
| `COST_ANALYST` | Cost Analyst | 5 | `FINANCE_ADMIN` |
| `COMPLIANCE_OFFICER` | Compliance Officer | 4 | `COMPANY_SUB_ADMIN` |
| `SECURITY_ADMIN` | Security Admin | 4 | `COMPANY_SUB_ADMIN` |
| `REPORTING_ADMIN` | Reporting Admin | 4 | `COMPANY_SUB_ADMIN` |
| `PROCESS_HEAD` | Process Head | 4 | `COMPANY_SUB_ADMIN` |
| `PROCESS_ADMIN` | Process Admin | 5 | `PROCESS_HEAD` |
| `SITE_ADMIN` | Site Admin | 4 | `COMPANY_SUB_ADMIN` |
| `SITE_TRANSPORT_ADMIN` | Site Transport Admin | 5 | `SITE_ADMIN` |
| `MANAGER` | Manager | 5 | `COMPANY_SUB_ADMIN` |
| `TEAM_LEADER` | Team Leader | 6 | `MANAGER` |
| `EMPLOYEE` | Employee | 7 | `TEAM_LEADER` |
| `SHIFT_SUPERVISOR` | Shift Supervisor | 5 | `COMPANY_SUB_ADMIN` |
| `TRAINER` | Trainer | 6 | `MANAGER` |

### Canonical Vendor Roles

| Role Code | Display Name | Hierarchy | Parent |
|-----------|-------------|-----------|--------|
| `VENDOR_ADMIN` | Vendor Admin | 1 | — |
| `VENDOR_SUB_ADMIN` | Vendor Sub-Admin | 2 | `VENDOR_ADMIN` |
| `VENDOR_OPERATIONS_MANAGER` | Operations Manager | 3 | `VENDOR_SUB_ADMIN` |
| `VENDOR_DISPATCHER` | Dispatcher | 3 | `VENDOR_SUB_ADMIN` |
| `VENDOR_FLEET_MANAGER` | Fleet Manager | 3 | `VENDOR_SUB_ADMIN` |
| `VENDOR_DRIVER_MANAGER` | Driver Manager | 3 | `VENDOR_SUB_ADMIN` |
| `VENDOR_COMPLIANCE_MANAGER` | Compliance Manager | 3 | `VENDOR_SUB_ADMIN` |
| `VENDOR_FINANCE` | Finance | 3 | `VENDOR_SUB_ADMIN` |
| `VENDOR_COORDINATOR` | Coordinator | 3 | `VENDOR_SUB_ADMIN` |
| `VENDOR_VIEWER` | Viewer | 3 | `VENDOR_SUB_ADMIN` |

### Canonical Driver/Guard Roles

| Role Code | Display Name | Hierarchy | Parent |
|-----------|-------------|-----------|--------|
| `DRIVER_SUPERVISOR` | Driver Supervisor | 1 | — |
| `DRIVER` | Driver | 2 | `DRIVER_SUPERVISOR` |
| `GUARD_SUPERVISOR` | Guard Supervisor | 1 | — |
| `GUARD` | Guard | 2 | `GUARD_SUPERVISOR` |

### Authorization Resolution Flow

```
Authenticate token
  → Resolve user identity
  → Resolve security domain
  → Resolve identity type
  → Resolve active company
  → Resolve primary role
  → Resolve additional roles
  → Resolve permissions
  → Resolve scope
  → Resolve resource ownership
  → Apply business policy
  → Execute transaction
  → Audit
```

### Auth Response Structure

```json
{
  "userId": "user_123",
  "securityDomain": "CUSTOMER_INTERNAL",
  "identityType": "CUSTOMER_USER",
  "companyId": "company_123",
  "primaryRole": "TRANSPORT_ADMIN",
  "roles": ["TRANSPORT_ADMIN"],
  "permissions": ["trip.assign", "trip.reassign"],
  "scope": {
    "sites": ["site_1"],
    "processes": ["process_1"]
  }
}
```

For NAVIRA internal users:
```json
{
  "userId": "navira_123",
  "securityDomain": "NAVIRA_INTERNAL",
  "identityType": "NAVIRA_EMPLOYEE",
  "companyId": null,
  "primaryRole": "NAVIRA_PLATFORM_OPERATIONS_MANAGER",
  "roles": ["NAVIRA_PLATFORM_OPERATIONS_MANAGER"]
}
```

### Complete User Profile Structure

Every user profile must include:

**Identity:**
- User UUID, human-readable code, full legal name, preferred name
- Profile photo, official email, phone, alternate phone
- Date of birth, preferred language, timezone
- Identity type, security domain, account status

**Employment:**
- Employee/vendor/driver/guard code, official designation
- Department, team, organization, manager
- Employment type, joining date, effective date, end date
- Vendor association, driver license details, guard identification

**Company and Organization:**
- Company, company code, region, site, LOB, process, team, shift
- Cost center, business unit, assigned locations
- Home/pickup location, nodal preference

**Role and Access:**
- Primary role, additional roles, role hierarchy
- Permission toggles, explicit grants, explicit revocations
- Scope assignments, temporary access
- Access start date, access expiry date, delegations
- Approval authority, last access review

**Security:**
- MFA enabled, MFA method, last login, last password change
- Failed login count, locked until, active sessions
- Registered devices, device trust status
- Recovery status, security alerts

**Operational Eligibility:**
- Transport eligibility, eligibility status
- Female safety requirements, accessibility requirements
- Booking limits, no-show status, transport bans
- Active trips, assigned vehicle, driver availability
- Driver working hours, driver rest status, compliance status

**Documents:**
- Document type, document number, issued date, expiry date
- Verification status, verified by, verification date
- Private file reference, version history
- Rejection reason, renewal status

**Audit and History:**
- Profile changes, role changes, scope changes, permission changes
- Login history, session history, approval history
- Location history, document history, operational event history
- Offboarding history

### Role Definition Structure

Every role must have:
- Role code, display name, security domain, identity type
- Hierarchy level, parent role, child roles
- Purpose, responsibilities
- Allowed actions, denied actions
- Default permissions, scope types
- Approval authority, can delegate, delegation limits
- Required training, required documents
- MFA requirement, session policy
- Data visibility, reports available
- Audit requirements
- Effective date, retirement date, status

### Guard Rules

**PlatformAdminGuard:**
- Must require `securityDomain === 'NAVIRA_INTERNAL'`
- Must require `identityType === 'NAVIRA_EMPLOYEE'`
- Must check `primaryRole/assignedRole` is an approved NAVIRA role
- Must NOT accept: `SUPER_ADMIN`, `FINANCE`, `SUPPORT`, `AUDITOR`

**TenantGuard:**
- Must require one of:
  - `securityDomain === 'CUSTOMER_INTERNAL'`
  - `securityDomain === 'VENDOR_EXTERNAL'`
  - `securityDomain === 'DRIVER_EXTERNAL'`
  - `securityDomain === 'GUARD_EXTERNAL'`
- Must reject NAVIRA internal users unless audited platform context

**AccessScopeGuard:**
- Must only operate on tenant-domain users
- Must NOT be primary authorization for NAVIRA internal users

**RolesGuard:**
- Must compare canonical role codes only
- No alias fallback in security-sensitive code

---

## 4. PHASE 1: SCHEMA MIGRATION

**Goal:** Clean enums, add role hierarchy and responsibility models
**Effort:** ~500 lines | 1 session
**Dependencies:** None

### 1.1 Clean `UserRole` enum

**File:** `packages/database/prisma/schema.prisma` (lines 6250-6288)

**Remove:**
- `MOVE_IN_ADMIN` (use `NAVIRA_PLATFORM_ADMINISTRATOR`)

**Keep:**
- `COMPANY_ADMIN` (valid customer role)
- `DISPATCHER` (valid customer role)
- `SUPER_ADMIN` (temporary backward compatibility)

**Add missing customer/vendor/driver/guard roles:**
- `COMPANY_SUB_ADMIN`, `TRANSPORT_HEAD`, `CONTROL_ROOM_OPERATOR`
- `ROSTER_ADMIN`, `ROSTER_PLANNER`, `ROUTE_ADMIN`, `FLEET_MANAGER`
- `SAFETY_ADMIN`, `FEMALE_TRANSPORT_ADMIN`, `EMERGENCY_RESPONSE_OFFICER`
- `INCIDENT_MANAGER`, `VENDOR_COMPLIANCE_MANAGER`, `COST_ANALYST`
- `REPORTING_ADMIN`, `PROCESS_HEAD`, `PROCESS_ADMIN`
- `SITE_ADMIN`, `SITE_TRANSPORT_ADMIN`, `SITE_SECURITY_ADMIN`
- `FACILITY_MANAGER`, `SITE_OPERATIONS_MANAGER`, `SHIFT_SUPERVISOR`
- `TRAVEL_DESK_AGENT`, `TRANSPORT_HELPDESK_AGENT`
- `BOOKING_COORDINATOR`, `EXECUTIVE_ASSISTANT_BOOKER`, `EVACUATION_COORDINATOR`
- `VENDOR_SUB_ADMIN`, `VENDOR_OPERATIONS_MANAGER`, `VENDOR_FLEET_MANAGER`
- `VENDOR_DRIVER_MANAGER`, `VENDOR_FINANCE`, `VENDOR_COORDINATOR`, `VENDOR_VIEWER`
- `DRIVER_SUPERVISOR`, `GUARD_SUPERVISOR`

### 1.2 Clean `PlatformRole` enum

**File:** `packages/database/prisma/schema.prisma` (lines 6026-6046)

**Remove legacy aliases:**
- `SUPERADMIN` → use `NAVIRA_PLATFORM_ADMINISTRATOR`
- `FINANCE` → use `NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR`
- `PROJECT_MANAGER` → use `NAVIRA_PLATFORM_OPERATIONS_MANAGER`
- `PROJECT_COORDINATOR` → use `NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR`
- `COMPLIANCE` → use `NAVIRA_PLATFORM_COMPLIANCE_OFFICER`
- `SECURITY_ADMIN` → use `NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR`
- `SUPPORT` → use `NAVIRA_CUSTOMER_SUPPORT_ENGINEER`
- `AUDITOR` → use `NAVIRA_PLATFORM_AUDITOR`

### 1.3 Add `RoleHierarchy` model

```prisma
model RoleHierarchy {
  id              String         @id @default(uuid())
  roleCode        String         @unique
  displayName     String
  securityDomain  SecurityDomain
  identityType    IdentityType
  hierarchyLevel  Int
  parentRoleCode  String?
  childRoleCodes  String[]
  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@index([securityDomain, hierarchyLevel])
}
```

### 1.4 Add `RoleResponsibility` model

```prisma
model RoleResponsibility {
  id               String   @id @default(uuid())
  roleCode         String
  permissionKey    String
  isGranted        Boolean  @default(true)
  canDelegate      Boolean  @default(false)
  requiresApproval Boolean  @default(false)
  scopeType        String?  // COMPANY | SITE | PROCESS | SELF | PLATFORM
  createdAt        DateTime @default(now())

  @@unique([roleCode, permissionKey])
  @@index([roleCode])
}
```

### 1.5 Run migration

```bash
cd packages/database
npx prisma migrate dev --name role-identity-migration
npx prisma generate
```

---

## 5. PHASE 2: SEED CONSOLIDATION

**Goal:** Single canonical seed manifest, one demo user per role
**Effort:** ~800 lines | 1 session
**Dependencies:** Phase 1

### 5.1 Create seed directory structure

```
packages/database/prisma/seed/
  01-platform-roles.ts
  02-customer-roles.ts
  03-vendor-roles.ts
  04-driver-guard-roles.ts
  05-demo-users.ts
  06-permissions.ts
  07-role-hierarchy.ts
  08-role-responsibilities.ts
```

### 5.2 Legacy-to-canonical mapping

```typescript
const LEGACY_TO_CANONICAL = {
  'SUPER_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'MOVE_IN_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE_TEAM': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'PROJECT_MANAGER': 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
  'PROJECT_COORDINATOR': 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
  'PLATFORM_COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMINISTRATOR': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT_ENGINEER': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'PLATFORM_AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',
  'SAAS_OWNER': 'NAVIRA_OWNER',
  'MOVEINSYNC_OWNER': 'NAVIRA_OWNER',
};
```

### 5.3 Demo user catalog (development only)

```typescript
const DEMO_USERS = [
  // NAVIRA Internal
  { email: 'owner@moveinsync.com', role: 'NAVIRA_OWNER', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'platform.admin@moveinsync.com', role: 'NAVIRA_PLATFORM_ADMINISTRATOR', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'ops.manager@moveinsync.com', role: 'NAVIRA_PLATFORM_OPERATIONS_MANAGER', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'finance.admin@moveinsync.com', role: 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'security.admin@moveinsync.com', role: 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'compliance.officer@moveinsync.com', role: 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'auditor@moveinsync.com', role: 'NAVIRA_PLATFORM_AUDITOR', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'integration.admin@moveinsync.com', role: 'NAVIRA_INTEGRATION_API_ADMINISTRATOR', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'client.success@moveinsync.com', role: 'NAVIRA_CLIENT_SUCCESS_MANAGER', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'implementation.coordinator@moveinsync.com', role: 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  { email: 'support.engineer@moveinsync.com', role: 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER', securityDomain: 'NAVIRA_INTERNAL', identityType: 'NAVIRA_EMPLOYEE' },
  // Customer
  { email: 'admin@acme.com', role: 'TRANSPORT_ADMIN', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'sub.admin@acme.com', role: 'TRANSPORT_SUB_ADMIN', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'coordinator@acme.com', role: 'TRANSPORT_COORDINATOR', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'compliance@acme.com', role: 'TRANSPORT_COMPLIANCE', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'director@acme.com', role: 'DIRECTOR', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'senior.manager@acme.com', role: 'SENIOR_MANAGER', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'manager@acme.com', role: 'MANAGER', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'asst.manager@acme.com', role: 'ASSISTANT_MANAGER', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'teamlead@acme.com', role: 'TEAM_LEADER', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'employee@acme.com', role: 'EMPLOYEE', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  { email: 'trainer@acme.com', role: 'TRAINER', securityDomain: 'CUSTOMER_INTERNAL', identityType: 'CUSTOMER_USER' },
  // Vendor
  { email: 'vendor.admin@acme.com', role: 'VENDOR_ADMIN', securityDomain: 'VENDOR_EXTERNAL', identityType: 'VENDOR_USER' },
  // Driver
  { email: 'driver@acme.com', role: 'DRIVER', securityDomain: 'DRIVER_EXTERNAL', identityType: 'DRIVER' },
  // Guard
  { email: 'guard@acme.com', role: 'GUARD', securityDomain: 'GUARD_EXTERNAL', identityType: 'GUARD' },
];
```

### 5.4 Old seed files to deprecate

- `seed.ts` → replace with `seed/` directory
- `v7-seed-roles.ts` → delete (data migrated)
- `v8-seed.ts` → delete (data migrated)
- `seed-owners.ts` → merge into `seed/05-demo-users.ts`
- `seed-permissions.ts` → merge into `seed/06-permissions.ts`

---

## 6. PHASE 3: AUTH SERVICE NORMALIZATION

**Goal:** JWT tokens contain only canonical role names
**Effort:** ~300 lines | 1 session
**Dependencies:** Phase 1

### 6.1 Auth Service — JWT payload normalization

**File:** `apps/api-gateway/src/modules/auth/auth.service.ts`

In `issueLocalTokens()` (line 51):
```typescript
// BEFORE
app_metadata: {
  role: membership?.role || 'EMPLOYEE',
}

// AFTER
const canonicalRole = LEGACY_TO_CANONICAL[membership?.role] || membership?.role || 'EMPLOYEE';
app_metadata: {
  role: canonicalRole,
}
```

### 6.2 JWT Strategy — roles array normalization

**File:** `apps/api-gateway/src/modules/auth/strategies/jwt.strategy.ts`

In `buildUserContext()` (after line 494):
```typescript
// AFTER merging transportRoles and userRoles
const normalizedRoles = allRoles.map(r => LEGACY_TO_CANONICAL[r] || r);
const uniqueRoles = [...new Set(normalizedRoles)];
```

### 6.3 Auth Service — full profile endpoint

**New endpoint:**
```typescript
@Get('profile/:userId')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
async getUserProfile(@Param('userId') userId: string) {
  return this.authService.getFullUserProfile(userId);
}
```

**Full profile response includes:**
- Identity (UUID, email, name, photo, securityDomain, identityType, status)
- Employment (code, designation, department, team, manager, joining date)
- Company (company, sites, processes, shifts, cost center)
- Roles (primary role, additional roles, platform roles, hierarchy)
- Security (MFA, last login, failed attempts, locked until)
- Documents (type, number, expiry, verification status)
- Audit (profile changes, role changes, login history)

---

## 7. PHASE 4: AUTH CONTROLLER CLEANUP

**Goal:** Remove legacy navMap entries, single role vocabulary
**Effort:** ~100 lines | 1 session
**Dependencies:** Phase 3

### 7.1 Remove legacy navMap entries

**File:** `apps/api-gateway/src/modules/auth/auth.controller.ts`

**Remove:**
- `SAAS_OWNER` (lines 229-234)
- `MOVEINSYNC_OWNER` (lines 235-240)
- `COORDINATOR` (lines 301-308) → replace with `TRANSPORT_COORDINATOR`
- `FINANCE` (lines 352-358) → replace with `FINANCE_TEAM`
- `COMPLIANCE` (lines 334-339) → replace with `TRANSPORT_COMPLIANCE`

### 7.2 Add missing navMap entries

- `TRANSPORT_COORDINATOR` → add (currently only `COORDINATOR`)
- `VENDOR_DISPATCHER` → add

### 7.3 Update `getDataVisibility()`

Remove `SUPER_ADMIN` from visibility map (line 395) — NAVIRA internal users handled by `securityDomain === 'NAVIRA_INTERNAL'` check.

---

## 8. PHASE 5: GUARD UPDATES

**Goal:** All guards use canonical role names only
**Effort:** ~50 lines | 1 session
**Dependencies:** Phase 3

### 8.1 RolesGuard — owner tier bypass

**File:** `apps/api-gateway/src/common/guards/roles.guard.ts` (line 35)

```typescript
// BEFORE
const OWNER_TIERS = ['SAAS_OWNER', 'MOVEINSYNC_OWNER', 'SUPER_ADMIN', 'NAVIRA_OWNER'];

// AFTER
const OWNER_TIERS = ['NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR'];
```

### 8.2 PermissionsGuard — owner tier bypass

**File:** `apps/api-gateway/src/common/guards/permissions.guard.ts` (line 35)

Same update as RolesGuard.

### 8.3 PlatformAdminGuard — already clean

No changes needed. Uses canonical NAVIRA_ roles and `securityDomain === 'NAVIRA_INTERNAL'`.

---

## 9. PHASE 6: FRONTEND UPDATES

**Goal:** Frontend uses canonical role names from backend
**Effort:** ~200 lines | 1 session
**Dependencies:** Phase 3

### 9.1 Update DEMO_ACCOUNTS

**File:** `apps/web/src/app/page.tsx` (lines 84-106)

Replace all legacy role labels with canonical names (see Section 5.3 demo user catalog).

### 9.2 Update RoleDashboard routing

**File:** `apps/web/src/app/page.tsx` (lines 286-334)

Remove legacy fallback checks:
```typescript
// BEFORE
const isCoordinator = role === 'COORDINATOR' || role === 'TRANSPORT_COORDINATOR';

// AFTER
const isCoordinator = role === 'TRANSPORT_COORDINATOR';
```

### 9.3 Update sidebar navigation

Use `securityDomain + primaryRole` from `/auth/me` response, not hardcoded role checks.

---

## 10. PHASE 7: MIGRATION SCRIPT

**Goal:** Migrate existing data to canonical model
**Effort:** ~400 lines | 1 session
**Dependencies:** Phase 1, 2

### 10.1 Data migration steps

1. Update `CompanyMembership.role` using `LEGACY_TO_CANONICAL` mapping
2. Update `UserRoleAssignment.roleId` to canonical role IDs
3. Update `PlatformRoleAssignment.role` to canonical `PlatformRole` values
4. Set `securityDomain` and `identityType` for all existing users
5. Seed `RoleHierarchy` and `RoleResponsibility` tables
6. Verify no legacy role names remain in any table

### 10.2 Verification queries

```sql
-- 1. No legacy role names in UserRoleAssignment
SELECT * FROM "UserRoleAssignment" 
WHERE "roleId" IN (SELECT id FROM "Role" WHERE name IN ('MOVE_IN_ADMIN', 'SAAS_OWNER', 'MOVEINSYNC_OWNER'));

-- 2. All users have securityDomain
SELECT COUNT(*) FROM "User" WHERE "securityDomain" IS NULL;

-- 3. All users have identityType
SELECT COUNT(*) FROM "User" WHERE "identityType" IS NULL;

-- 4. PlatformRoleAssignment only has NAVIRA_ roles
SELECT * FROM "PlatformRoleAssignment" 
WHERE role NOT LIKE 'NAVIRA_%';
```

---

## 11. PHASE 8: CROSS-DOMAIN AUTHORIZATION TESTS

**Goal:** Prevent cross-domain authorization violations
**Effort:** ~300 lines | 1 session
**Dependencies:** Phase 3, 4, 5

### 11.1 Test cases

1. NAVIRA internal user cannot access customer data without platform context
2. Customer user cannot access NAVIRA internal endpoints
3. Vendor user cannot access customer employee data
4. Driver cannot access billing endpoints
5. Guard cannot access trip assignment endpoints
6. Role hierarchy: child role cannot perform parent-only actions
7. Scope isolation: User A (site BLR01) cannot access site BLR02 data
8. Platform admin guard rejects legacy role names
9. RolesGuard rejects empty roles without fallback
10. Permission changes invalidate active sessions

### 11.2 Test file

**Create:** `apps/api-gateway/test/cross-domain-auth.spec.ts`

---

## 12. EXECUTION ORDER

| Phase | Effort | Dependencies | Sessions |
|-------|--------|--------------|----------|
| Phase 1: Schema Migration | ~500 lines | None | 1 |
| Phase 2: Seed Consolidation | ~800 lines | Phase 1 | 1 |
| Phase 3: Auth Service Normalization | ~300 lines | Phase 1 | 1 |
| Phase 4: Auth Controller Cleanup | ~100 lines | Phase 3 | 1 |
| Phase 5: Guard Updates | ~50 lines | Phase 3 | 1 |
| Phase 6: Frontend Updates | ~200 lines | Phase 3 | 1 |
| Phase 7: Migration Script | ~400 lines | Phase 1, 2 | 1 |
| Phase 8: Cross-Domain Tests | ~300 lines | Phase 3, 4, 5 | 1 |

**Total: ~2,650 lines across 8 phases, ~8 sessions**

---

## 13. ACCEPTANCE CRITERIA

- [ ] Every user has `securityDomain` set
- [ ] Every user has `identityType` set
- [ ] Every user has one canonical `primaryRole`
- [ ] No runtime role aliases in authorization code
- [ ] Internal NAVIRA roles all use `NAVIRA_` prefix
- [ ] Customer, vendor, driver, guard roles cannot inherit NAVIRA permissions
- [ ] Every role has responsibilities, denied actions, hierarchy, scope rules
- [ ] Every user profile includes identity, employment, organization, access, security, documents, history
- [ ] NAVIRA Owner-only actions enforced server-side
- [ ] Role changes invalidate/revalidate active sessions
- [ ] Every access change is audited
- [ ] Web and mobile navigation use same canonical role response
- [ ] No role exists only in seed file without API, guard, UI behavior
- [ ] `PlatformRole` enum contains only NAVIRA_ prefixed values
- [ ] `UserRole` enum contains domain-separated values
- [ ] Legacy `TransportAccessRole` deprecated or removed

---

## 14. OPEN QUESTIONS

1. **Backward compatibility:** Should we keep `SUPER_ADMIN` in `UserRole` enum temporarily for existing records, or do a full data migration to `NAVIRA_PLATFORM_ADMINISTRATOR`?

2. **TransportAccessRole model:** Should we:
   - (A) Deprecate `TransportAccessRole` entirely and migrate all data to `Role` + `UserRoleAssignment`
   - (B) Keep both systems with normalization at the auth layer

3. **PlatformRoleAssignment:** Should this model be the sole source of truth for NAVIRA internal roles, replacing `UserRoleAssignment` for internal users?

4. **Seed files:** Should we delete the old seed files (`v7-seed-roles.ts`, `v8-seed.ts`, `seed-owners.ts`) or keep them as reference?

5. **Frontend login:** Should we update all demo emails to match canonical role names?

6. **Mobile app:** Should we update mobile role routing in this phase or defer to a separate mobile migration?

---

*This plan must be executed before any further feature work. Every later phase—billing, safety, analytics, mobile, and platform administration—depends on correct role separation.*
