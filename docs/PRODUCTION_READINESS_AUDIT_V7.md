# MOVE-IN-SYNC — PRODUCTION READINESS AUDIT
# Date: 2026-09-04
# Standard: V7 Dashboard Remediation Specification (Phase 233-257)
# Methodology: Actual inspection of running application, database, API endpoints, and frontend

---

## HONEST STATUS SUMMARY

| Category | Score | Verdict |
|---|---|---|
| Database Schema | 217 models / 218 tables | SCAFFOLDED — models exist, many empty |
| Backend Build | 0 TS errors | BUILD PASSES |
| API Endpoints | 48 controllers registered | PARTIAL — many lack real logic |
| Auth (JWT) | Working | WORKS — but roles not in JWT |
| Org Structure | 3 sites, 3 LOBs, 3 processes, 3 shifts | SEEDED — real data |
| Users | 26 users across roles | SEEDED — real data |
| RBAC/Guards | 12 guard classes exist | BROKEN — RolesGuard fails for admin |
| Frontend | 11 TSX files | MINIMAL — 1 real page, rest scaffolded |
| Mobile | 0 files | NOT IMPLEMENTED |
| Tests | 0 passing | NOT IMPLEMENTED |

---

## P0 CRITICAL BLOCKERS

### BLOCKER 1: RolesGuard empty-array bug
- **File**: `apps/api-gateway/src/common/guards/roles.guard.ts` line 20
- **Bug**: `const userRoles = user.roles || [userRole]` — empty array `[]` is truthy, so fallback never triggers
- **Impact**: Admin user with `roles: []` in JWT gets "Insufficient permissions" on every guarded endpoint
- **Fix**: Change to `const userRoles = (user.roles && user.roles.length > 0) ? user.roles : [user.role]`

### BLOCKER 2: JWT missing role data
- **File**: `apps/api-gateway/src/modules/auth/auth.service.ts`
- **Bug**: Login JWT payload has `roles: []` and `permissions: []` — never populated from DB
- **Impact**: Even after fixing the guard, JWT carries no role/permission information
- **Fix**: Populate roles and permissions from UserRoleAssignment + RolePermissionConfig during login

### BLOCKER 3: No frontend pages for any real functionality
- **Current state**: 1 page (`/` — login + dashboard shell)
- **Required by V7**: 40+ pages across 12 portals
- **Missing**: Employee CRUD, Booking, Dispatch, Trips, Drivers, Vehicles, Vendors, Billing, Reports, Settings — ALL
- **Impact**: Cannot demonstrate any real business operation

### BLOCKER 4: No create/mutate operations tested
- **Current state**: GET endpoints exist for some resources, but POST/PATCH/DELETE untested
- **Required**: Full CRUD for Company, User, Employee, Booking, Driver, Vehicle, Trip, etc.
- **Impact**: Cannot onboard a single real company

### BLOCKER 5: Missing V7 required roles
- **Database has**: SUPER_ADMIN, ADMIN, TRANSPORT_ADMIN, MANAGER, TEAM_LEADER, EMPLOYEE, DRIVER (7 roles)
- **V7 requires**: 25 roles across 3 authority domains (Platform: 9, Customer: 11, Partner: 3)
- **Missing**: MOVE_IN_ADMIN, FINANCE_TEAM, PROJECT_MANAGER, PROJECT_COORDINATOR, PLATFORM_COMPLIANCE, SECURITY_ADMINISTRATOR, SUPPORT_ENGINEER, PLATFORM_AUDITOR, TRANSPORT_SUB_ADMIN, TRANSPORT_COORDINATOR, TRANSPORT_COMPLIANCE, DIRECTOR, SENIOR_MANAGER, ASSISTANT_MANAGER, TRAINER, VENDOR_ADMIN, VENDOR_DISPATCHER, GUARD

### BLOCKER 6: Zero DriverProfile records
- **Database**: DriverProfile table is empty
- **Impact**: No drivers for dispatch, no trip lifecycle possible

---

## P1 HIGH-PRIORITY GAPS

### GAP: No AccessScopeGuard enforcement
- Guard class exists in 3 files (duplicate implementations)
- None are applied via `@UseGuards()` on controllers
- Every endpoint is either unprotected or uses only JWT check
- Cross-tenant access is possible by changing companyId in request

### GAP: No real RBAC permission checks
- PermissionDefinition table exists (27 records)
- RolePermissionConfig exists but no guard reads them meaningfully
- All authorization is role-name matching, not permission-based

### GAP: No portal-specific frontend pages
- Admin sees transport sidebar but clicking items shows no real content
- Manager, Employee, Driver dashboards are different KPI cards only
- No real forms, lists, or CRUD operations in UI

### GAP: No booking flow
- Booking model exists (schema)
- No real booking creation endpoint tested
- No approval workflow tested end-to-end
- No dispatch engine

### GAP: No trip lifecycle
- Trip model exists (schema)
- No trip creation, boarding, GPS tracking, completion

### GAP: No GPS/WebSocket real-time
- EventsGateway exists (Socket.IO)
- No real GPS ingestion tested
- No geofence detection tested

### GAP: No billing
- RateCard model exists (0 records)
- No invoice generation
- No reconciliation

---

## WHAT ACTUALLY WORKS (VERIFIED)

| Feature | Status | Evidence |
|---|---|---|
| PostgreSQL connected | WORKS | 218 tables, 26 users, real queries return data |
| JWT login | WORKS | admin@acme.com / Admin@123 → valid token |
| /api/auth/me | WORKS | Returns user profile, roles, portals, navigation |
| Portal resolution | WORKS | Different portals per role (transport/admin gets 5, manager gets 1) |
| Navigation resolution | WORKS | Different sidebar per role (16 items for admin, 5 for manager) |
| Dashboard KPIs | WORKS | Real DB counts: 26 employees, 3 vehicles, 1 vendor |
| Scope bar | WORKS | Shows Bengaluru, Mumbai, Pune from AccessScope table |
| TS build | WORKS | 0 errors |
| NestJS startup | WORKS | API on port 3001 |
| Next.js startup | WORKS | Web on port 3080 |
| Company seed | WORKS | Acme Enterprise with sites/LOBs/processes/shifts |

---

## WHAT DOES NOT WORK (VERIFIED BROKEN)

| Feature | Status | Evidence |
|---|---|---|
| RolesGuard for admin | BROKEN | `roles: []` in JWT → "Insufficient permissions" |
| Org CRUD endpoints | BROKEN | RolesGuard blocks all org endpoints |
| Frontend actions | BROKEN | Quick Action buttons do nothing |
| DriverProfile | EMPTY | 0 records seeded |
| Any create/mutate | UNTESTED | No POST/PATCH tested |
| Cross-tenant denial | UNTESTED | No test attempted |
| Any E2E flow | NOT POSSIBLE | Blocked by missing features |

---

## SEED DATA REALITY

| Entity | Count | Status |
|---|---|---|
| Companies | 1 | Acme Enterprise |
| Users | 26 | 1 admin, 1 manager, 10 employees, 3 drivers, 11 role profiles, guard, trainer |
| Sites | 3 | Mumbai, Pune, Bengaluru |
| LOBs | 3 | Banking, Technology, Customer Support |
| Processes | 3 | Process A, B, C |
| Shifts | 3 | Morning, Evening, Night |
| Access Scopes | 12 | Real site/LOB/process assignments |
| Roles (DB) | 7 | Missing 18 of 25 required |
| Role Assignments | 24 | Real UserRoleAssignment records |
| Memberships | 24 | Real CompanyMembership records |
| Vehicles | 3 | MH01AB1234, MH02CD5678, KA01EF9012 |
| Drivers | 0 | **EMPTY — critical gap** |
| Vendors | 1 | Acme Transport Services |
| Routes | 0 | 0 RouteManagement records |
| Bookings | 0 | Empty |
| Trips | 0 | Empty |
| Audit Logs | 0 | Empty |

---

## ESTIMATED EFFORT TO PRODUCTION

| Phase | Effort | Priority |
|---|---|---|
| Fix RolesGuard + JWT roles | 1 session | P0 — nothing else works without this |
| Seed remaining 18 roles + permissions | 1 session | P0 |
| Seed driver profiles + routes | 1 session | P0 |
| Org CRUD (Company, Site, LOB, Process, Shift) | 2-3 sessions | P0 |
| User CRUD + role assignment + scope | 2-3 sessions | P0 |
| Employee CRUD + bulk import | 2-3 sessions | P0 |
| Booking + approval workflow | 3-4 sessions | P1 |
| Driver + vehicle CRUD | 2-3 sessions | P1 |
| Dispatch engine | 3-4 sessions | P1 |
| Trip lifecycle + GPS | 4-5 sessions | P1 |
| Frontend pages (40+) | 10-15 sessions | P1 |
| Billing + vendor reconciliation | 3-4 sessions | P1 |
| Security tests + tenant isolation | 3-4 sessions | P2 |
| E2E tests | 5+ sessions | P2 |
| **TOTAL** | **~45-55 sessions** | |

---

## VERDICT

**MOVE-IN-SYNC IS NOT PRODUCTION READY.**

The system has a working schema (217 models), working auth (JWT login), working portal resolution (different dashboards per role), and real seed data. However, it has:

1. A broken authorization guard that blocks most endpoints
2. No real CRUD operations for any business entity
3. No booking flow, no dispatch, no trip lifecycle
4. No frontend pages beyond the dashboard shell
5. Zero DriverProfile records
6. Missing 18 of 25 required roles

The foundation is real (PostgreSQL, Prisma, NestJS, real data). The gap between current state and production is approximately 45-55 implementation sessions.
