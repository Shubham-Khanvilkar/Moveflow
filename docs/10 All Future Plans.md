# FUTURE PLAN 6 SHUBHAM — Complete Production Master Plan

**Created:** Sep 9, 2026
**Author:** Shubham
**Scope:** EVERYTHING — from current state to full enterprise production
**Status:** Master Reference Document

---

# PART A: CURRENT STATE ASSESSMENT

## A1. What Exists Now

| Component | Stack | Lines of Code | Status |
|-----------|-------|---------------|--------|
| API Gateway | NestJS 10, Prisma, TypeScript | ~50,000+ | 46 modules, 73 controllers, 131 services |
| Web Frontend | Next.js 14, React 18, Tailwind | ~40,000+ | 74 page components |
| Mobile App | React Native, Expo SDK 50 | ~15,000+ | 21 screens, 4 roles |
| ML Service | Python, FastAPI, scikit-learn | ~3,000+ | 5 ML capabilities, 9 endpoints |
| Database | PostgreSQL, Prisma ORM | 7,601 lines schema | 163 models, 72 enums |
| Shared Packages | TypeScript | ~3,000+ | config, types (997 lines), ui (1 component), utils (7 functions) |
| Infrastructure | Docker, Kubernetes | ~1,500+ | Docker Compose, K8s manifests, CI/CD |
| Tests | Jest, supertest | ~350 cases | 33 test files, 12/46 modules covered |

## A2. What Works End-to-End

| Feature | Status | Evidence |
|---------|--------|----------|
| JWT login/register/logout | Working | 229 tests passing |
| Role-based dashboard routing | Working | 19 role profiles, each gets different sidebar |
| Employee CRUD | Working | Create/Edit/Onboard/Offboard with V8 fields |
| Trip state machine | Working | 18 states, 20 transitions, versioned assignments |
| Vehicle CRUD + QR | Working | Full lifecycle, QR generation |
| Driver CRUD + onboarding | Working | Invite → token → upload → verify |
| Audit logging | Working | 255+ records from real operations |
| Organization hierarchy | Working | Company → BU → Department → Team → Site → LOB → Process |
| Billing rate cards | Working | CRUD + cost calculation |
| GPS tracking endpoint | Working | Location recording, vehicle locations |
| WebSocket gateway | Working | Company-scoped rooms, JWT auth |

## A3. What Is Broken or Missing

### CRITICAL (Blocks any real workflow)

| # | Gap | Impact |
|---|-----|--------|
| 1 | **0 trips, 0 bookings, 0 rate cards in DB** | Cannot demo a single real workflow |
| 2 | **No database migrations ever applied** | Schema exists but PostgreSQL has no tables |
| 3 | **AccessScopeGuard not applied to controllers** | Cross-tenant access possible |
| 4 | **Supabase Auth not used** (spec requires it) | Custom JWT lacks OTP, proper MFA, session management |
| 5 | **RLS not implemented** | No defense-in-depth tenant isolation |
| 6 | **No NAVIRA Owner-only enforcement** | Any role could onboard/offboard internal employees |
| 7 | **Platform name still "Move In Sync"** | Not rebranded to NAVIRA |
| 8 | **Port mismatch in docker-compose** | API=3000 in compose but 3001 in code — broken out of box |
| 9 | **Duplicate CI/CD workflows** | Two pipeline files run simultaneously, wasting resources |
| 10 | **No .dockerignore** | Build bloat, potential secret leakage |

### HIGH (Required for production)

| # | Gap | Impact |
|---|-----|--------|
| 11 | 34/46 backend modules have ZERO tests | No quality assurance |
| 12 | 0 frontend tests (no Playwright/Cypress) | No UI verification |
| 13 | No notification delivery (email/SMS/push/WhatsApp) | Users can't receive alerts |
| 14 | No Google Maps integration | No geocoding, routing, places, distance matrix |
| 15 | No geofence detection logic | Schema exists but no enter/exit/dwell detection |
| 16 | No dispatch board (real-time UI) | Coordinators can't manage fleet visually |
| 17 | 34/74 frontend pages are PARTIAL | Hardcoded fallbacks, incomplete API wiring |
| 18 | No export/report system (xlsx, PDF, CSV) | No business reporting |
| 19 | No subscription/plan model | Can't bill customers for SaaS |
| 20 | No CSRF protection | Browser-based attacks possible |
| 21 | Hardcoded demo credentials in source | Security risk |
| 22 | No input validation DTOs | Injection attacks possible |
| 23 | 47 models missing @updatedAt | Data tracking gaps |
| 24 | Duplicate/conflicting K8s manifests | Deployment confusion |
| 25 | No monitoring/observability stack | Can't detect or diagnose issues |
| 26 | No Terraform/IaC | Can't reproduce infrastructure |
| 27 | No backup/disaster recovery | Data loss risk |
| 28 | No secret management | Plaintext credentials |
| 29 | No document expiry automation | Expired docs not blocked from dispatch |
| 30 | Mobile TypeScript errors | Build failures |

### MEDIUM (Improves quality)

| # | Gap | Impact |
|---|-----|--------|
| 31 | 54/74 pages use `any` types | Type safety gaps |
| 32 | 49/74 pages silently catch errors | Poor UX |
| 33 | No 401/403 handling in frontend | Silent auth failures |
| 34 | Triple API client pattern | Code duplication |
| 35 | Inconsistent styling (inline + Tailwind) | Inconsistent UI |
| 36 | No i18n | No localization |
| 37 | No accessibility (ARIA) | Compliance risk |
| 38 | Legacy "moveflow"/"Move In Sync" naming | Brand inconsistency |

---

# PART B: PLAN 5 — MVP OPERATIONAL CORE

**Goal:** You can open the web app, login, book a transport, get it approved, have it dispatched, ride the trip, and see the cost calculated — all with real data.

**Duration:** 35-50 hours
**Prerequisite:** PLAN-3-SHUBHAM CRITICAL items (#1-6) done first

---

## Phase B1: Database Foundation (2-3 hours)

### B1.1 Generate migration
```bash
cd packages/database
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
npx prisma migrate deploy
```
**File:** `packages/database/prisma/migrations/0_init/migration.sql`

### B1.2 Fix seed enum mismatches
- `packages/database/prisma/seed.ts` line ~12: Replace `HOME_TO_OFFICE` with valid enum value
- `packages/database/prisma/v8-seed.ts`: Replace `HATCHBACK` with `SEDAN`
- `packages/database/prisma/v7-seed-roles.ts`: Deduplicate emails

### B1.3 Run clean seed
```bash
cd packages/database && npx prisma db seed
```
**Verify:** `npx prisma studio` shows all tables populated

**Acceptance criteria:**
- [ ] `prisma migrate deploy` succeeds
- [ ] All 163 tables exist in PostgreSQL
- [ ] Seed completes without errors
- [ ] Company, Users, Vehicles, Drivers, Roles, Permissions all present

---

## Phase B2: Operational Seed Data (3-4 hours)

### B2.1 Create `packages/database/prisma/seed-operational.ts`

#### Rate Cards (4 cards)
| Name | Type | BaseFare | PerKm | PerMin | MinFare | NightMult |
|------|------|----------|-------|--------|---------|-----------|
| Mumbai Cab | CAB | ₹100 | ₹12 | ₹2 | ₹150 | 1.5x |
| Pune Shuttle | SHUTTLE | ₹50 | ₹8 | ₹1 | ₹80 | 1.2x |
| Bangalore Bus | BUS | ₹30 | ₹5 | ₹0.5 | ₹50 | 1.0x |
| EV Cab | CAB_EV | ₹80 | ₹10 | ₹1.5 | ₹120 | 1.3x |

#### Bookings (15 bookings)
- 3 PENDING_APPROVAL (employee → manager approval pending)
- 3 APPROVED (ready for dispatch)
- 3 IN_PROGRESS (active trips with assigned drivers)
- 3 COMPLETED (historical with cost calculated)
- 3 CANCELLED

Each booking: employeeId, pickup coordinates, drop coordinates, shiftId, vehicleType, scheduledDate, status.

#### Trips (9 trips from bookings)
- 3 DISPATCHED (driver + vehicle assigned, not started)
- 3 IN_PROGRESS (driver picked up, en route)
- 3 COMPLETED (finished, cost calculated)

Each trip: tripCode (TRP-YYYYMMDD-NNNNNN), bookingId, driverId, vehicleId, routeId, status, cost.

#### TripPassenger records (15+ records)
Boarding status lifecycle: PICKUP_PENDING → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → BOARDED → IN_TRANSIT → ALIGHTED → COMPLETED

#### VendorContracts (2 contracts)
- Acme Transport Services (Mumbai, active)
- Pune Mobility Partners (Pune, active)

#### EmployeeAddresses (2-3 per employee)
Home address, alternate address, emergency contact.

#### ComplianceDocuments (per driver)
Driving license (verified), vehicle fitness (verified), insurance (pending).

#### GPS history (100+ points)
20-30 points per completed trip along Mumbai-Pune-Bangalore corridors.

#### AuditEvents
booking.created, booking.approved, trip.dispatched, trip.completed for all seeded data.

### B2.2 Execute
```bash
cd packages/database && npx ts-node prisma/seed-operational.ts
```

**Acceptance criteria:**
- [ ] `SELECT COUNT(*) FROM "Booking"` → 15+
- [ ] `SELECT COUNT(*) FROM "Trip"` → 9+
- [ ] `SELECT COUNT(*) FROM "RateCard"` → 4+
- [ ] `SELECT COUNT(*) FROM "TripPassenger"` → 15+
- [ ] `SELECT COUNT(*) FROM "GpsPoint"` → 100+

---

## Phase B3: Core Backend Wiring (4-6 hours)

### B3.1 Dashboard KPIs — Real DB queries
**File:** `apps/api-gateway/src/modules/dashboard/dashboard-kpi.service.ts`

Replace hardcoded values with real DB queries:
```typescript
const [activeBookings, tripsInProgress, availableDrivers, totalDrivers,
       availableVehicles, totalVehicles, completedThisWeek, avgCost] = await Promise.all([
  prisma.booking.count({ where: { companyId, status: 'APPROVED' } }),
  prisma.trip.count({ where: { companyId, status: { in: ['IN_PROGRESS', 'DISPATCHED'] } } }),
  prisma.driverProfile.count({ where: { companyId, availabilityStatus: 'AVAILABLE' } }),
  prisma.driverProfile.count({ where: { companyId } }),
  prisma.vehicle.count({ where: { companyId, status: 'AVAILABLE' } }),
  prisma.vehicle.count({ where: { companyId } }),
  prisma.trip.count({ where: { companyId, status: 'COMPLETED', completedAt: { gte: weekStart } } }),
  prisma.tripCostSnapshot.aggregate({ where: { companyId }, _avg: { totalCost: true } }),
]);
```

### B3.2 Dispatch engine — Real driver assignment
**File:** `apps/api-gateway/src/modules/trips/dispatch-engine.service.ts`

Verify flow:
1. `POST /api/dispatch/execute` with bookingId
2. Find available driver (availabilityStatus = AVAILABLE, within shift, documents valid)
3. Find available vehicle (status = AVAILABLE, capacity >= passengers)
4. Create TripDispatch record
5. Update driver availabilityStatus → IN_TRIP
6. Update vehicle status → IN_USE
7. Create Trip with status DISPATCHED
8. Create TripPassenger records
9. Write AuditEvent

### B3.3 Trip state machine enforcement
**File:** `apps/api-gateway/src/modules/trips/trip.service.ts`

Verify valid transitions:
```
CREATED → DISPATCHED → DRIVER_EN_ROUTE → ARRIVED_AT_PICKUP →
PASSENGERS_BOARDED → IN_TRANSIT → APPROACHING_DESTINATION →
ARRIVED_AT_DESTINATION → COMPLETED

Exception branches: → CANCELLED, → NO_SHOW, → REASSIGNED, → ABORTED
```

Each transition must:
- Validate current state allows the action
- Update trip status
- Write TripAssignmentHistory
- Write AuditEvent
- Trigger notifications (when Phase B8 done)

### B3.4 Full booking → trip lifecycle
Verify chain:
```
POST /api/bookings → 201 (PENDING_APPROVAL)
POST /api/bookings/:id/approve → 200 (APPROVED)
POST /api/dispatch/execute → 201 (DISPATCHED, trip created)
POST /api/trips/:id/transition { action: 'START' } → 200 (IN_PROGRESS)
POST /api/trips/:id/transition { action: 'COMPLETE' } → 200 (COMPLETED)
GET /api/trips/:id → trip with cost calculated
```

### B3.5 Billing — Rate card + cost calculation
**File:** `apps/api-gateway/src/modules/billing/billing.service.ts`

Verify:
- Rate card lookup: find active card matching vehicleType + companyId
- Cost: `baseFare + (distanceKm × perKmRate) + (durationMin × perMinuteRate)`
- Night multiplier: if trip crosses 22:00-06:00, apply nightMultiplier
- Minimum fare: if calculated < minimumFare, use minimumFare
- Save to TripCostSnapshot

### B3.6 Access scope enforcement
Wire `@UseGuards(AccessScopeGuard)` to:
- `apps/api-gateway/src/modules/trips/trips.controller.ts`
- `apps/api-gateway/src/modules/fleet/fleet.controller.ts`
- `apps/api-gateway/src/modules/employees/employee.controller.ts`
- `apps/api-gateway/src/modules/billing/billing.controller.ts`

**Acceptance criteria:**
- [ ] `GET /api/dashboard/kpi` returns real counts from DB
- [ ] Dispatch creates real Trip + TripPassenger records
- [ ] Trip state machine rejects invalid transitions
- [ ] Full booking→dispatch→trip→complete works via API
- [ ] Cost calculated from rate card on trip completion
- [ ] AccessScopeGuard blocks cross-tenant access

---

## Phase B4: Frontend Booking Flow (6-8 hours)

For EVERY page, apply this pattern:

```typescript
'use client';
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function PageName({ token }: { token: string }) {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/endpoint`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setData(d.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}<button onClick={() => {}} className="ml-2 underline">Retry</button></div>;
  if (!data.length) return <div className="p-8 text-center text-gray-500">No data available</div>;

  return (/* real content */);
}
```

### Pages to wire (10 pages):

| # | Page | API Endpoint | Key Fix |
|---|------|-------------|---------|
| B4.1 | `BookTransportPage.tsx` | POST /api/bookings | Form submit → real API |
| B4.2 | `BookingsPage.tsx` | GET /api/bookings | Status filter tabs, click → detail |
| B4.3 | `TripsPage.tsx` | GET /api/trips | Trip progress indicator |
| B4.4 | `DispatchPage.tsx` | POST /api/dispatch/execute | Dispatch assigns real driver |
| B4.5 | `ApprovalsPage.tsx` | GET /api/bookings?status=PENDING_APPROVAL | Approve/reject buttons |
| B4.6 | `DriversPage.tsx` | GET /api/drivers | Availability toggle |
| B4.7 | `VehiclesPage.tsx` | GET /api/vehicles | Status badges + QR |
| B4.8 | `RoutesPage.tsx` | GET /api/routes | "New Route" form functional |
| B4.9 | `EmployeeTransportMasterPage.tsx` | Full CRUD | Verify all operations |
| B4.10 | `ImportExportPage.tsx` | POST /api/employees/import | CSV export |

**Acceptance criteria per page:**
- [ ] Loading spinner shows during fetch
- [ ] Error message shows on failure with retry button
- [ ] Empty state shows when no data
- [ ] All CRUD operations hit real API
- [ ] No hardcoded/mock data
- [ ] No `any` types for main data structures

---

## Phase B5: Frontend Fleet & Driver (4-6 hours)

| # | Page | Fix |
|---|------|-----|
| B5.1 | `DriverHomePage.tsx` | Wire availability toggle to PATCH /api/drivers/:id/availability |
| B5.2 | `BoardingPage.tsx` | Wire passenger boarding/alighting to trip API |
| B5.3 | `NoShowPage.tsx` | Wire no-show evidence API + appeal workflow |
| B5.4 | `VehicleCheckPage.tsx` | Wire inspection checklist → ComplianceDocument |
| B5.5 | `VehicleQRPage.tsx` | Wire QR generation to vehicle data |
| B5.6 | `NodalPointsPage.tsx` | Wire CRUD + map visualization |
| B5.7 | `EmployeeAddressesPage.tsx` | Wire address CRUD, fix map placeholder |
| B5.8 | `EmployeeSchedulingPage.tsx` | Wire shift assignment to API |
| B5.9 | `TeamsPage.tsx` | Wire team CRUD to API |
| B5.10 | `LocationChangeRequestsPage.tsx` | Wire location change workflow |

---

## Phase B6: Frontend Dashboards (4-6 hours)

| # | Dashboard | API Endpoint |
|---|-----------|-------------|
| B6.1 | `OwnerManagementPage.tsx` | /api/platform/admin/stats |
| B6.2 | `SuperAdminPage.tsx` | /api/platform/stats |
| B6.3 | `DirectorDashboard.tsx` | /api/dashboard/kpi |
| B6.4 | `CoordinatorDashboard.tsx` | /api/dashboard/summary |
| B6.5 | `ManagerDashboard.tsx` | /api/dashboard/kpi |
| B6.6 | `SupportDashboard.tsx` | /api/dashboard/kpi |
| B6.7 | `VendorDashboard.tsx` | /api/vendor/dashboard |
| B6.8 | `GuardDashboard.tsx` | /api/dashboard/kpi |
| B6.9 | `AuditLogPage.tsx` + `SettingsPage.tsx` + `PoliciesPage.tsx` + `CompliancePage.tsx` + `InvoicesPage.tsx` | Each to its real API |
| B6.10 | `ReportsPage.tsx` + `AnalyticsPage.tsx` + `CXOIntelligencePage.tsx` + `PredictiveAnalyticsPage.tsx` | Each to its real API |

---

## Phase B7: GPS Live Tracking (3-4 hours)

### B7.1 GPS ingestion verification
**File:** `apps/api-gateway/src/modules/gps-tracking/gps-tracking.controller.ts`

Verify `POST /api/gps/location` stores GpsPoint with: tripId, driverId, lat, lng, speed, heading, timestamp.

### B7.2 WebSocket broadcast
**File:** `apps/api-gateway/src/common/events.gateway.ts`

GPS ping → store in DB → broadcast `gps:update` to company room.

### B7.3 Web MapboxTracker
**File:** `apps/web/src/components/maps/MapboxTracker.tsx`

Wire to Socket.IO `gps:update` events for real-time vehicle markers.

### B7.4 Control room
**File:** `apps/web/src/components/pages/ControlRoomPageV2.tsx`

Replace fabricated data with real DB vehicle locations.

### B7.5 Mobile GPS
Verify `apps/mobile/src/services/gps.ts` sends real coordinates → backend stores → web shows live.

---

## Phase B8: Notification Delivery (2-3 hours)

### B8.1 In-app notifications
Verify `NotificationsPage.tsx` fetches real Notification records.

### B8.2 Email (SendGrid)
**File:** `apps/api-gateway/src/modules/notifications/notification-channels.service.ts`

Replace `logger.log()` stubs with actual SendGrid API calls.

### B8.3 Graceful degradation
If `SENDGRID_API_KEY` not configured → log attempt, mark DELIVERED_IN_APP, don't throw.

---

## Phase B9: Mobile App Alignment (2-3 hours)

### B9.1 API path verification
Verify all `apps/mobile/src/services/api.ts` calls map to real backend endpoints.

### B9.2 Fix TypeScript errors
```bash
cd apps/mobile && npx tsc --noEmit
```

### B9.3 Auth flow verification
Login → AsyncStorage → Authorization header → 401 handling.

---

## Phase B10: E2E Verification (3-4 hours)

### B10.1 Playwright test
**File:** `apps/web/e2e/booking-flow.spec.ts`

Login → create booking → approve → dispatch → trip → complete → verify cost.

### B10.2 API integration test
**File:** `apps/api-gateway/test/trip-lifecycle.integration.spec.ts`

Full chain: POST /api/bookings → approve → dispatch → transition → complete → verify.

### B10.3 Mobile smoke test
```bash
cd apps/mobile && npx tsc --noEmit
```

---

## Phase B11: CI/CD & Docker (2-3 hours)

### B11.1 Fix docker-compose port mapping
**File:** `moveflow/docker-compose.yml`

Change API port from `3000:3000` to `3001:3001`. Change web port from `3001:3000` to `3000:3000`.

### B11.2 Add ML service to docker-compose
Add `ml-service` service: build from `apps/ml-service`, port 8000.

### B11.3 Delete duplicate CI workflow
Remove `.github/workflows/ci-cd.yml` (keep `ci.yml`).

### B11.4 Remove `apps/mobile` reference from CI
Fix typecheck job to only check `api-gateway` and `web`.

### B11.5 Add .dockerignore
**File:** `moveflow/.dockerignore`
```
node_modules
.git
.env
*.log
dist
.next
.turbo
```

### B11.6 Clean root artifacts
Remove from `moveflow/` root: `fix_schema*.py`, `plan-part*.js`, `write-plan.js`, `api-new.*`.

---

# PART C: PLAN 6 — SECURITY & AUTHORIZATION HARDENING

**Goal:** Every endpoint is properly guarded, no cross-tenant access, no privilege escalation, all inputs validated.

**Duration:** 20-30 hours

---

## Phase C1: AccessScopeGuard Wiring (4-6 hours)

### C1.1 Wire to all tenant-scoped controllers
Add `@UseGuards(AccessScopeGuard)` or `@RequireAccessScope()` to every controller that accesses tenant data:

| Controller | File |
|-----------|------|
| TripsController | `modules/trips/trips.controller.ts` |
| DispatchController | `modules/trips/dispatch.controller.ts` |
| EmployeeController | `modules/employees/employee.controller.ts` |
| FleetController | `modules/fleet/fleet.controller.ts` |
| BillingController | `modules/billing/billing.controller.ts` |
| DualBillingController | `modules/dual-billing/dual-billing.controller.ts` |
| IntelligenceController | `modules/intelligence/intelligence.controller.ts` |
| AnalyticsController | `modules/analytics/analytics.controller.ts` |
| ReportingEngineController | `modules/reporting-engine/reporting-engine.controller.ts` |
| NotificationCenterController | `modules/notification-center/notification-center.controller.ts` |
| DocumentManagementController | `modules/document-management/document-management.controller.ts` |
| PassengerOperationsController | `modules/passenger-operations/passenger-operations.controller.ts` |
| NodalPointsController | `modules/nodal-points/nodal-points.controller.ts` |
| CompanyContactsController | `modules/company-contacts/company-contacts.controller.ts` |
| SafetyController | `modules/safety/safety.controller.ts` |
| FinanceController | `modules/finance/` (all controllers) |

### C1.2 Fix AccessScopeGuard bypass
**File:** `apps/api-gateway/src/common/guards/access-scope.guard.ts`

Remove the non-production bypass at line 76. Always throw ForbiddenException when Prisma is unavailable.

### C1.3 Add deny-by-default
When no scopes are assigned to a user AND the endpoint requires scope access → deny.

**Acceptance criteria:**
- [ ] Cross-tenant read returns 403
- [ ] Cross-tenant write returns 403
- [ ] User with site-scoped access cannot access other sites' data
- [ ] Guard fails closed when DB is unavailable

---

## Phase C2: Owner-Only Enforcement (4-6 hours)

### C2.1 Define Owner-only actions
Per AGENTS.md, only NAVIRA_OWNER may:
- Onboard/offboard NAVIRA employees
- Assign/change primary roles
- Grant/revoke additional permission toggles
- Change internal scope
- Suspend/reactivate internal employees
- Create/edit/retire internal roles

### C2.2 Create `@OwnerOnly()` decorator
**File:** `apps/api-gateway/src/common/decorators/owner-only.decorator.ts`

```typescript
export const OwnerOnly = () => SetMetadata('ownerOnly', true);
```

### C2.3 Create `OwnerOnlyGuard`
**File:** `apps/api-gateway/src/common/guards/owner-only.guard.ts`

```typescript
@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return user?.roles?.includes('NAVIRA_OWNER') ||
           user?.primaryRoleId === 'NAVIRA_OWNER';
  }
}
```

### C2.4 Apply to platform-admin endpoints
**File:** `apps/api-gateway/src/modules/platform-admin/platform-admin.controller.ts`

Add `@UseGuards(OwnerOnlyGuard)` + `@OwnerOnly()` to class level.

### C2.5 Create permission delta endpoint
When a role is changed, return before/after permission sets:
```
GET /api/platform/roles/:roleId/permissions-delta
POST /api/platform/users/:userId/change-role { newRoleId }
→ Response includes: gainedPermissions[], revokedPermissions[]
```

**Acceptance criteria:**
- [ ] Non-Owner users cannot onboard/offboard NAVIRA employees
- [ ] Role changes return permission delta
- [ ] Attempting Owner-only action as non-Owner returns 403

---

## Phase C3: Input Validation DTOs (4-6 hours)

### C3.1 Create DTOs for all auth endpoints
**Files:** `apps/api-gateway/src/modules/auth/dto/`

```
login.dto.ts          → { email: string (@IsEmail), password: string (@MinLength(8)) }
register.dto.ts       → { email, name, phone, companyId, password }
refresh.dto.ts        → { refreshToken: string }
password-reset.dto.ts → { email: string (@IsEmail) }
```

### C3.2 Create DTOs for booking endpoints
```
create-booking.dto.ts   → { employeeId, pickupLat, pickupLng, dropLat, dropLng, shiftId, vehicleType, scheduledDate }
approve-booking.dto.ts  → { action: 'APPROVE' | 'REJECT', reason?: string }
```

### C3.3 Create DTOs for trip endpoints
```
transition-trip.dto.ts  → { action: string (@IsIn(validActions)), reason?: string }
gps-location.dto.ts     → { tripId, lat, lng, speed?, heading?, accuracy? }
```

### C3.4 Create DTOs for fleet endpoints
```
create-vehicle.dto.ts   → { registrationNo, make, model, vehicleType, fuelType, capacity }
create-driver.dto.ts    → { name, email, phone, licenseNo }
```

### C3.5 Apply ValidationPipe to all controllers
Ensure `main.ts` has `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`.

**Acceptance criteria:**
- [ ] POST /api/auth/login with invalid email returns 400
- [ ] POST /api/bookings with missing required fields returns 400
- [ ] Unknown properties are stripped (whitelist)
- [ ] Non-whitelisted properties cause rejection

---

## Phase C4: Security Fixes (4-6 hours)

### C4.1 Remove hardcoded demo credentials
**File:** `apps/web/src/app/page.tsx`

Replace 24 hardcoded DEMO_ACCOUNTS with a single demo mode toggle:
```typescript
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
if (DEMO_MODE) { /* show demo login helper */ }
```

### C4.2 Fix TypeScript strict mode
**File:** `apps/api-gateway/tsconfig.json`

Change `"strict": false` to `"strict": true`. Fix resulting type errors.

### C4.3 Add CSRF protection
**File:** `apps/api-gateway/src/main.ts`

For browser-based access, implement CSRF token validation:
```typescript
app.use(csurf({ cookie: { httpOnly: true, sameSite: 'strict' } }));
```

### C4.4 Add request body size limits
**File:** `apps/api-gateway/src/main.ts`
```typescript
app.use(json({ limit: '1mb' }));
app.use(urlencoded({ extended: true, limit: '1mb' }));
```

### C4.5 Fix CSP headers
**File:** `apps/api-gateway/src/main.ts`

Remove `unsafe-eval` from scriptSrc in Helmet config.

### C4.6 Fix WebSocket auth
**File:** `apps/api-gateway/src/common/events.gateway.ts`

Remove `jsonwebtoken` fallback. Use only the Passport JWT strategy.

**Acceptance criteria:**
- [ ] No hardcoded credentials in any source file
- [ ] TypeScript strict mode passes
- [ ] CSRF tokens validated on state-changing requests
- [ ] Request bodies limited to 1MB
- [ ] No `unsafe-eval` in CSP
- [ ] WebSocket uses single JWT verification path

---

## Phase C5: MFA Enforcement (2-3 hours)

### C5.1 MFA enrollment flow
After first login, if MFA is required for the company:
1. Generate TOTP secret
2. Show QR code to user
3. User enters verification code
4. Save MFA secret, mark user as MFA-enabled

### C5.2 MFA verification on login
After password validation, if user has MFA:
1. Return `{ requiresMfa: true, mfaToken: '...' }`
2. Client shows MFA code input
3. POST /api/auth/mfa/verify with code + mfaToken
4. On success, return JWT

### C5.3 MFA admin policy
**File:** `apps/api-gateway/src/modules/security/mfa.controller.ts`

NAVIRA Security Administrator can:
- Enable/disable MFA requirement per company
- Set MFA enforcement policy (all users, specific roles, etc.)

**Acceptance criteria:**
- [ ] MFA enrollment generates TOTP secret + QR
- [ ] MFA verification required on login when enabled
- [ ] Invalid MFA code returns 401
- [ ] MFA can be enforced per company

---

# PART D: PLAN 7 — PLATFORM SAAS LAYER

**Goal:** Multi-tenant SaaS with subscriptions, provisioning, billing, and white-label support.

**Duration:** 40-60 hours

---

## Phase D1: Subscription & Plans (10-12 hours)

### D1.1 Add schema models
**File:** `packages/database/prisma/schema.prisma`

```prisma
model SubscriptionPlan {
  id            String   @id @default(cuid())
  name          String
  code          String   @unique
  description   String?
  tier          PlanTier // STARTER, PROFESSIONAL, ENTERPRISE, CUSTOM
  monthlyPrice  Decimal  @db.Decimal(10,2)
  annualPrice   Decimal  @db.Decimal(10,2)
  maxEmployees  Int
  maxVehicles   Int
  maxDrivers    Int
  maxSites      Int
  features      Json     // feature codes included
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Subscription {
  id              String   @id @default(cuid())
  companyId       String
  planId          String
  status          SubscriptionStatus // ACTIVE, TRIAL, SUSPENDED, CANCELLED, PAST_DUE
  billingCycle    BillingCycle // MONTHLY, ANNUAL
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  trialEndsAt     DateTime?
  cancelledAt     DateTime?
  suspensionReason String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  company         Company  @relation(fields: [companyId], references: [id])
  plan            SubscriptionPlan @relation(fields: [planId], references: [id])
}

model SubscriptionUsage {
  id              String   @id @default(cuid())
  subscriptionId  String
  metricCode      String   // employees, vehicles, trips, api_calls
  quantity        Int
  periodStart     DateTime
  periodEnd       DateTime
  createdAt       DateTime @default(now())
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
}
```

### D1.2 Subscription service
**File:** `apps/api-gateway/src/modules/billing/subscription.service.ts`

Methods:
- `createSubscription(companyId, planId, billingCycle)`
- `changePlan(subscriptionId, newPlanId)`
- `cancelSubscription(subscriptionId, reason)`
- `suspendSubscription(subscriptionId, reason)`
- `reactivateSubscription(subscriptionId)`
- `getSubscriptionUsage(companyId, period)`
- `checkFeatureAccess(companyId, featureCode)`

### D1.3 Usage metering
**File:** `apps/api-gateway/src/modules/billing/usage-metering.service.ts`

Track per-company usage:
- Employee count
- Vehicle count
- Trip count (monthly)
- API call count

Compare against plan limits. Warn at 80%, enforce at 100%.

### D1.4 Trial management
- New companies get 14-day trial by default
- Trial can be extended by NAVIRA Platform Administrator
- Trial expiry → grace period (3 days) → suspension
- Suspension: all users except Platform Admins locked out

### D1.5 Subscription management UI
**File:** `apps/web/src/components/pages/SubscriptionPage.tsx`

For NAVIRA Platform Administrators:
- View all company subscriptions
- Change plans
- Extend trials
- Suspend/reactivate
- View usage metrics

**Acceptance criteria:**
- [ ] SubscriptionPlan CRUD works
- [ ] Company can be subscribed to a plan
- [ ] Usage tracked against plan limits
- [ ] Feature access checked before allowing actions
- [ ] Trial → suspension flow works
- [ ] Subscription management UI functional

---

## Phase D2: Company Provisioning (8-10 hours)

### D2.1 Company activation gate
Per spec, company activation requires completed contact directory.

**File:** `apps/api-gateway/src/modules/company-admin/company-admin.service.ts`

Before activating a company, verify:
- [ ] At least 1 Company Head contact
- [ ] At least 1 Regional Head contact
- [ ] At least 1 Site Head per site
- [ ] All mandatory fields filled (name, email, phone, designation)
- [ ] No duplicate contacts

### D2.2 Provisioning workflow
```
Company Created → CONTACTS_PENDING → CONTACTS_COMPLETE → ACTIVATION_READY → ACTIVE
                                    → CONTACTS_INCOMPLETE (blocks activation)
```

### D2.3 Onboarding wizard backend
**File:** `apps/api-gateway/src/modules/company-admin/onboarding.service.ts`

Steps:
1. Company details (name, domain, industry, size)
2. Organization structure (sites, LOBs, processes)
3. Contact directory (mandatory contacts)
4. Transport policy configuration
5. Subscription plan selection
6. Activation

**Acceptance criteria:**
- [ ] Company cannot activate without required contacts
- [ ] Onboarding wizard saves progress at each step
- [ ] Activation creates all necessary default data

---

## Phase D3: White Label (4-6 hours)

### D3.1 Company branding fields
Already exist on Company model: `brandName`, `primaryColor`, `secondaryColor`, `customDomain`, `logo`.

### D3.2 White-label rendering service
**File:** `apps/api-gateway/src/modules/company-admin/branding.service.ts`

Methods:
- `getCompanyBranding(companyId)` → returns brand config
- `updateCompanyBranding(companyId, branding)` → updates brand

### D3.3 Frontend theme application
**File:** `apps/web/src/components/admin/BrandingProvider.tsx`

```typescript
const BrandingProvider = ({ children }) => {
  const { branding } = useAuth();
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', branding.secondaryColor);
  }, [branding]);
  return children;
};
```

### D3.4 Custom domain support
For white-label: company can use `transport.acme.com` instead of `navira.app`.

DNS CNAME → platform ingress → tenant resolution via `customDomain` field.

**Acceptance criteria:**
- [ ] Company branding applied to web app (colors, logo, name)
- [ ] Custom domain resolves to correct tenant
- [ ] Email templates use company branding

---

## Phase D4: SSO/OIDC/SAML (6-8 hours)

### D4.1 SSO configuration model
```prisma
model SSOConfiguration {
  id              String   @id @default(cuid())
  companyId       String
  provider        SSOProvider // OKTA, AZURE_AD, GOOGLE_WORKSPACE, CUSTOM_SAML, CUSTOM_OIDC
  clientId        String
  clientSecret    String   // encrypted
  issuerUrl       String
  metadataUrl     String?
  enabled         Boolean  @default(true)
  enforceSSO      Boolean  @default(false) // require SSO, disable password login
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  company         Company  @relation(fields: [companyId], references: [id])
}
```

### D4.2 Passport SSO strategies
**File:** `apps/api-gateway/src/modules/auth/strategies/`

Create strategies for:
- `oidc.strategy.ts` (generic OIDC)
- `saml.strategy.ts` (SAML 2.0)
- `azure-ad.strategy.ts` (Azure AD/Entra)
- `okta.strategy.ts` (Okta)

### D4.3 SSO login flow
1. User clicks "Sign in with SSO"
2. Redirect to identity provider
3. IdP authenticates user
4. Callback receives token/assertion
5. Map IdP user to NAVIRA user (by email)
6. Create session, return JWT

### D4.4 SSO enforcement
If `enforceSSO = true` for company:
- Password login disabled
- "Sign in with SSO" is the only option
- API key auth still works for service accounts

**Acceptance criteria:**
- [ ] SSO configuration CRUD works
- [ ] OIDC login flow completes successfully
- [ ] SAML login flow completes successfully
- [ ] Password login disabled when SSO enforced
- [ ] IdP user mapped to NAVIRA user by email

---

## Phase D5: Webhook Management (4-6 hours)

### D5.1 Schema
```prisma
model WebhookConfig {
  id              String   @id @default(cuid())
  companyId       String
  url             String
  secret          String   // for HMAC signature
  events          String[] // booking.created, trip.completed, etc.
  status          WebhookStatus // ACTIVE, INACTIVE, FAILED
  failureCount    Int      @default(0)
  lastTriggeredAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  company         Company  @relation(fields: [companyId], references: [id])
}

model WebhookLog {
  id              String   @id @default(cuid())
  webhookId       String
  event           String
  payload         Json
  responseStatus  Int?
  responseBody    String?
  deliveredAt     DateTime @default(now())
  success         Boolean
  webhook         WebhookConfig @relation(fields: [webhookId], references: [id])
}
```

### D5.2 Webhook dispatcher
**File:** `apps/api-gateway/src/modules/notifications/webhook-dispatcher.service.ts`

On event (e.g., booking.created):
1. Find all webhooks subscribed to that event for the company
2. Sign payload with HMAC-SHA256 using webhook secret
3. POST to webhook URL with 10s timeout
4. Log response in WebhookLog
5. If failed 3x, mark webhook as FAILED

### D5.3 Webhook management UI
**File:** `apps/web/src/components/pages/WebhooksPage.tsx`

CRUD for webhook configs, view delivery logs, retry failed deliveries.

**Acceptance criteria:**
- [ ] Webhook created with event subscription
- [ ] Event triggers webhook delivery
- [ ] HMAC signature verified by receiver
- [ ] Failed deliveries logged and retried
- [ ] Webhook disabled after 3 failures

---

# PART E: PLAN 8 — GPS, MAPS & REAL-TIME

**Goal:** Full Google Maps integration, geofence detection, real-time dispatch board.

**Duration:** 30-40 hours

---

## Phase E1: Google Maps Provider (8-10 hours)

### E1.1 MapProvider interface
**File:** `apps/api-gateway/src/common/maps/map-provider.interface.ts`

```typescript
export interface MapProvider {
  geocode(address: string): Promise<{ lat: number; lng: number }>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  validateAddress(address: string): Promise<{ valid: boolean; suggestion?: string }>;
  searchPlaces(query: string, location?: { lat: number; lng: number }): Promise<Place[]>;
  calculateRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, waypoints?: { lat: number; lng: number }[]): Promise<RouteResult>;
  calculateMatrix(origins: { lat: number; lng: number }[], destinations: { lat: number; lng: number }[]): Promise<MatrixResult>;
  matchGpsTrace(points: { lat: number; lng: number; timestamp: Date }[]): Promise<{ lat: number; lng: number }[]>;
  optimizeRoute(stops: { lat: number; lng: number }[]): Promise<{ order: number[]; totalDistance: number; totalDuration: number }>;
}
```

### E1.2 Google Maps implementation
**File:** `apps/api-gateway/src/common/maps/google-maps.provider.ts`

Uses Google Maps Platform APIs:
- Geocoding API (geocode, reverseGeocode)
- Places API (searchPlaces)
- Directions API (calculateRoute)
- Distance Matrix API (calculateMatrix)
- Road API (matchGpsTrace)

### E1.3 Provider abstraction
**File:** `apps/api-gateway/src/common/maps/map-provider.factory.ts`

```typescript
export class MapProviderFactory {
  static create(provider: string): MapProvider {
    switch (provider) {
      case 'google': return new GoogleMapsProvider(process.env.GOOGLE_MAPS_API_KEY);
      case 'mapbox': return new MapboxProvider(process.env.MAPBOX_ACCESS_TOKEN);
      default: throw new Error(`Unknown map provider: ${provider}`);
    }
  }
}
```

### E1.4 Server-side key protection
NEVER expose server-side API keys to the browser.

For client-side maps (Mapbox GL JS), use `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (browser-restricted key).
For all routing/geocoding/distance calculations, use server-side keys only.

**Acceptance criteria:**
- [ ] Geocode address → lat/lng
- [ ] Reverse geocode → address string
- [ ] Calculate route → distance, duration, polyline
- [ ] Calculate matrix → distance/duration between multiple points
- [ ] Server keys never exposed to browser
- [ ] Provider can be swapped via config

---

## Phase E2: Geofence Detection (8-10 hours)

### E2.1 Enhanced Geofence model
Add to existing Geofence model:
- `polygonPoints Json?` — for polygon geofences (not just circles)
- `entryRules Json?` — conditions for triggering on enter
- `exitRules Json?` — conditions for triggering on exit
- `alertConfig Json?` — who to notify, escalation
- `schedule Json?` — active hours (e.g., office hours only)

### E2.2 Geofence detection engine
**File:** `apps/api-gateway/src/modules/gps-tracking/geofence-detector.service.ts`

```typescript
async processGpsPoint(driverId: string, lat: number, lng: number, timestamp: Date) {
  const geofences = await this.prisma.geofence.findMany({ where: { companyId, isActive: true } });

  for (const geofence of geofences) {
    const isInside = this.isPointInGeofence(lat, lng, geofence);
    const wasInside = await this.wasLastKnownInside(driverId, geofence.id);

    if (isInside && !wasInside) {
      // ENTER event
      await this.createGeofenceEvent(driverId, geofence.id, 'ENTERED', timestamp);
      await this.checkEntryRules(geofence, driverId);
    } else if (!isInside && wasInside) {
      // EXIT event
      await this.createGeofenceEvent(driverId, geofence.id, 'EXITED', timestamp);
      await this.checkExitRules(geofence, driverId);
    }

    await this.updateLastKnownPosition(driverId, geofence.id, isInside);
  }
}

private isPointInGeofence(lat: number, lng: number, geofence: Geofence): boolean {
  if (geofence.radius) {
    // Circle: distance from center < radius
    const distance = this.haversineDistance(lat, lng, geofence.latitude, geofence.longitude);
    return distance <= geofence.radius;
  }
  if (geofence.polygonPoints) {
    // Polygon: ray casting algorithm
    return this.isPointInPolygon(lat, lng, geofence.polygonPoints);
  }
  return false;
}
```

### E2.3 Geofence event types
- `ENTERED` — driver entered geofence
- `EXITED` — driver exited geofence
- `DWELL` — driver stayed > configured minutes
- `LATE_ARRIVAL` — driver arrived after scheduled time
- `WRONG_SITE` — driver at wrong site
- `ROUTE_DEVIATION` — driver left expected route

### E2.4 Geofence management UI
**File:** `apps/web/src/components/pages/GeofencePage.tsx`

- Create/edit/delete geofences
- Draw on Mapbox map (circle or polygon)
- View geofence events
- Configure alerts per geofence

**Acceptance criteria:**
- [ ] Circle geofence detection works
- [ ] Polygon geofence detection works
- [ ] Enter/exit events recorded
- [ ] Dwell detection works
- [ ] Route deviation detection works
- [ ] Geofence management UI functional

---

## Phase E3: Route Deviation Detection (4-6 hours)

### E3.1 Deviation detection service
**File:** `apps/api-gateway/src/modules/gps-tracking/route-deviation.service.ts`

```typescript
async checkRouteDeviation(tripId: string, lat: number, lng: number) {
  const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, include: { route: true } });
  if (!trip?.route) return;

  const routePoints = await this.decodeRoutePolyline(trip.route.polyline);
  const distanceFromRoute = this.minDistanceToRoute(lat, lng, routePoints);

  if (distanceFromRoute > DEVIATION_THRESHOLD_METERS) {
    await this.prisma.routeDeviation.create({
      data: {
        tripId, driverId: trip.driverId, companyId: trip.companyId,
        lat, lng, distanceFromRoute,
        severity: distanceFromRoute > 500 ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
      }
    });
    // Notify control room via WebSocket
    this.eventsGateway.emitToCompany(trip.companyId, 'route:deviation', { tripId, lat, lng, distance });
  }
}
```

### E3.2 Deviation resolution
**File:** `apps/api-gateway/src/modules/gps-tracking/route-deviation.service.ts`

Methods:
- `listOpenDeviations(companyId)`
- `resolveDeviation(deviationId, resolution, notes)`
- `falseAlarm(deviationId, reason)`

**Acceptance criteria:**
- [ ] Deviation detected when driver leaves route by >200m
- [ ] Deviation severity classified (HIGH >500m)
- [ ] Control room notified in real-time
- [ ] Deviation can be resolved or marked false alarm

---

## Phase E4: Dispatch Board (6-8 hours)

### E4.1 Dispatch board data endpoint
**File:** `apps/api-gateway/src/modules/trips/dispatch.controller.ts`

```
GET /api/dispatch/board
→ Response: {
    unassignedTrips: Trip[],
    availableDrivers: Driver[],
    availableVehicles: Vehicle[],
    liveTrips: Trip[],
    delayedTrips: Trip[],
    gpsStaleVehicles: Vehicle[],
    safetyAlerts: SOSAlert[]
  }
```

### E4.2 Real-time dispatch updates
WebSocket events:
- `dispatch:trip-updated` — trip status changed
- `dispatch:driver-status` — driver availability changed
- `dispatch:vehicle-status` — vehicle status changed
- `dispatch:alert` — safety/GPS alert

### E4.3 Dispatch board UI
**File:** `apps/web/src/components/pages/DispatchBoardPage.tsx`

Layout:
- Left panel: Unassigned trips (drag to assign)
- Center: Map with all vehicles (color-coded by status)
- Right panel: Available drivers + vehicles
- Bottom: Live alerts ticker

Features:
- Drag-and-drop trip assignment
- Click vehicle → see trip details
- Real-time position updates
- Alert notifications

### E4.4 Pre-commit validation
Before dispatch, validate:
- Driver availabilityStatus = AVAILABLE
- Driver shift active (current time within shift window)
- Driver documents not expired
- Vehicle status = AVAILABLE
- Vehicle capacity >= passenger count
- Vehicle compliance valid
- Driver not fatigued (work hours within policy)

**Acceptance criteria:**
- [ ] Dispatch board shows real data from DB
- [ ] Real-time updates via WebSocket
- [ ] Drag-and-drop assignment works
- [ ] Pre-commit validation blocks invalid dispatch
- [ ] Delayed trips highlighted
- [ ] GPS stale vehicles flagged

---

# PART F: PLAN 9 — NOTIFICATIONS & COMMUNICATIONS

**Goal:** Multi-channel notification delivery (email, SMS, push, WhatsApp, in-app).

**Duration:** 20-30 hours

---

## Phase F1: Email Delivery (6-8 hours)

### F1.1 Email service
**File:** `apps/api-gateway/src/modules/notifications/email.service.ts`

```typescript
@Injectable()
export class EmailService {
  private sgMail: typeof import('@sendgrid/mail');

  constructor(private config: ConfigService) {
    if (config.get('SENDGRID_API_KEY')) {
      this.sgMail = require('@sendgrid/mail');
      this.sgMail.setApiKey(config.get('SENDGRID_API_KEY'));
    }
  }

  async send(to: string, subject: string, html: string, options?: { from?: string; attachments?: any[] }) {
    if (!this.sgMail) {
      this.logger.warn('SendGrid not configured, email not sent', { to, subject });
      return { sent: false, reason: 'PROVIDER_NOT_CONFIGURED' };
    }

    const msg = {
      to,
      from: options?.from || this.config.get('EMAIL_FROM') || 'noreply@navira.app',
      subject,
      html,
      ...options,
    };

    const result = await this.sgMail.send(msg);
    return { sent: true, messageId: result[0].headers['x-message-id'] };
  }
}
```

### F1.2 Email templates
**File:** `apps/api-gateway/src/modules/notifications/templates/`

```
booking-approved.html
booking-rejected.html
trip-dispatched.html
trip-completed.html
no-show-marked.html
password-reset.html
mfa-code.html
welcome.html
document-expiry-warning.html
```

Template engine: Handlebars or simple string replacement.

### F1.3 Email triggers
Wire email sending to business events:
- Booking approved → email to employee
- Booking rejected → email to employee with reason
- Trip dispatched → email to employee with driver details
- Trip completed → email to employee with trip summary + cost
- No-show marked → email to employee with evidence
- Document expiring → email to document owner + manager

**Acceptance criteria:**
- [ ] SendGrid integration works
- [ ] Email sent on booking approval
- [ ] Email sent on trip dispatch
- [ ] Email sent on trip completion
- [ ] Graceful degradation when SendGrid not configured
- [ ] Email templates render correctly

---

## Phase F2: SMS Delivery (4-6 hours)

### F2.1 SMS service
**File:** `apps/api-gateway/src/modules/notifications/sms.service.ts`

Integration with Twilio or AWS SNS:
```typescript
async sendSms(phoneNumber: string, message: string) {
  // Twilio implementation
  await this.twilio.messages.create({
    body: message,
    from: this.config.get('TWILIO_PHONE_NUMBER'),
    to: phoneNumber,
  });
}
```

### F2.2 SMS triggers
- OTP delivery (login, password reset)
- Trip dispatched → "Your ride is on the way"
- Trip arriving → "Driver is 2 minutes away"
- SOS triggered → emergency contacts notified

**Acceptance criteria:**
- [ ] SMS delivery works via Twilio/SNS
- [ ] OTP delivered via SMS
- [ ] Trip notifications via SMS
- [ ] Graceful degradation when provider not configured

---

## Phase F3: Push Notifications (4-6 hours)

### F3.1 Push token management
```prisma
model PushToken {
  id              String   @id @default(cuid())
  userId          String
  token           String   @unique
  platform        PushPlatform // IOS, ANDROID, WEB
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
}
```

### F3.2 Push service
**File:** `apps/api-gateway/src/modules/notifications/push.service.ts`

Firebase Cloud Messaging integration:
```typescript
async sendPush(userId: string, title: string, body: string, data?: Record<string, string>) {
  const tokens = await this.prisma.pushToken.findMany({ where: { userId, active: true } });
  const message = { notification: { title, body }, data, tokens: tokens.map(t => t.token) };
  await this.firebase.messaging().sendEachForMulticast(message);
}
```

### F3.3 Push triggers
- Trip dispatched → "Your ride has been assigned"
- Driver approaching → "Your driver is arriving"
- SOS acknowledged → "Your SOS has been received"
- Booking approved → "Your booking has been approved"

**Acceptance criteria:**
- [ ] Push token registration works
- [ ] Push notifications delivered via FCM
- [ ] Push notifications work on iOS and Android
- [ ] Token cleanup on app uninstall

---

## Phase F4: WhatsApp Integration (4-6 hours)

### F4.1 WhatsApp Business API
**File:** `apps/api-gateway/src/modules/notifications/whatsapp.service.ts`

Integration with WhatsApp Business API or Twilio WhatsApp:
```typescript
async sendWhatsApp(phoneNumber: string, templateName: string, parameters: string[]) {
  await this.whatsapp.messages.send({
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: { name: templateName, language: { code: 'en' }, components: [{ type: 'body', parameters: parameters.map(p => ({ type: 'text', text: p })) }] }
  });
}
```

### F4.2 WhatsApp templates
Pre-approved WhatsApp templates for:
- Trip notification
- Booking confirmation
- SOS alert
- Document expiry

**Acceptance criteria:**
- [ ] WhatsApp messages delivered
- [ ] Templates approved by WhatsApp
- [ ] Graceful degradation when not configured

---

## Phase F5: Notification Preferences & Quiet Hours (2-3 hours)

### F5.1 User notification preferences
Per-user, per-notification-type preferences:
```typescript
// NotificationPreferencesPage already exists — wire to real API
{
  tripUpdates: { inApp: true, email: true, sms: true, push: true, whatsapp: false },
  bookingUpdates: { inApp: true, email: true, sms: false, push: true, whatsapp: false },
  safetyAlerts: { inApp: true, email: true, sms: true, push: true, whatsapp: true },
  // ...
}
```

### F5.2 Quiet hours
If user has quiet hours configured (e.g., 22:00-07:00):
- Non-urgent notifications: queue and deliver at end of quiet hours
- Safety/SOS notifications: always deliver immediately

**Acceptance criteria:**
- [ ] User can set per-type notification preferences
- [ ] Quiet hours respected for non-urgent notifications
- [ ] Safety notifications always delivered

---

# PART G: PLAN 10 — REPORTS, ANALYTICS & INTELLIGENCE

**Goal:** 30+ report types, export to Excel/PDF/CSV, scheduled reports, AI analytics.

**Duration:** 30-40 hours

---

## Phase G1: Report Builder (10-12 hours)

### G1.1 Report catalogue
Implement 30+ report types:

| # | Report | Description | Permission |
|---|--------|-------------|------------|
| 1 | Employee Master | All employees with org data | employees:view |
| 2 | Booking Detail | All bookings with status breakdown | bookings:view |
| 3 | Trip Detail | All trips with cost, distance, duration | trips:view |
| 4 | Trip Cost Summary | Cost by department/vendor/route | finance:view |
| 5 | Vendor Performance | Vendor scorecards, SLA compliance | vendor:view |
| 6 | Driver Performance | Driver ratings, trip counts, compliance | drivers:view |
| 7 | Vehicle Utilization | Vehicle usage, maintenance status | vehicles:view |
| 8 | Route Analysis | Route efficiency, popular routes | routes:view |
| 9 | No-Show Report | No-show rates, appeal outcomes | noshow:view |
| 10 | Compliance Dashboard | Document expiry, compliance scores | safety:view |
| 11 | Safety Incidents | Incidents by type, severity, location | safety:view |
| 12 | Carbon Footprint | Emissions by mode, department, trend | analytics:view |
| 13 | Budget vs Actual | Budget allocation vs spending | finance:view |
| 14 | Monthly Cost Trend | Cost over time | finance:view |
| 15 | Shift Analysis | Shift coverage, overtime | employees:view |
| 16 | Attendance Report | Check-in/out, late arrivals | employees:view |
| 17 | SOS Report | SOS alerts, response times | safety:view |
| 18 | Audit Trail | System audit logs | audit:view |
| 19 | User Activity | Login frequency, feature usage | admin:view |
| 20 | Billing Summary | Invoices, payments, outstanding | finance:view |
| 21 | Vendor Invoice Detail | Invoice line items | finance:view |
| 22 | Reconciliation Report | Expected vs actual charges | finance:view |
| 23 | GPS Heatmap | Trip density by location | analytics:view |
| 24 | Peak Hours Analysis | Demand patterns by hour | analytics:view |
| 25 | Fuel Consumption | Fuel usage by vehicle | vehicles:view |
| 26 | Maintenance Schedule | Upcoming/overdue maintenance | vehicles:view |
| 27 | Employee Transport Cost | Per-employee transport cost | finance:view |
| 28 | Department wise Summary | Department-level metrics | analytics:view |
| 29 | SLA Compliance | SLA breaches and trends | safety:view |
| 30 | Capacity Utilization | Seat utilization by route | analytics:view |

### G1.2 Report service
**File:** `apps/api-gateway/src/modules/reporting-engine/report.service.ts`

```typescript
async generateReport(reportType: string, filters: ReportFilters, companyId: string) {
  const reportDef = this.getReportDefinition(reportType);

  // Build Prisma query from report definition
  const query = this.buildQuery(reportDef, filters, companyId);

  // Execute query
  const data = await this.prisma.$queryRaw(query);

  // Apply grouping/sorting
  const processed = this.applyGrouping(data, reportDef.groupBy, reportDef.sortBy);

  return {
    reportType,
    generatedAt: new Date(),
    filters,
    data: processed,
    rowCount: processed.length,
  };
}
```

### G1.3 Report builder UI
**File:** `apps/web/src/components/pages/ReportBuilderPage.tsx`

Features:
- Select report type from catalogue
- Configure filters (date range, department, site, status)
- Preview results (table + chart)
- Save report configuration
- Export to Excel/CSV/PDF

**Acceptance criteria:**
- [ ] 30+ report types implemented
- [ ] Filters work correctly
- [ ] Report preview shows real data
- [ ] Reports can be saved and re-run

---

## Phase G2: Export Engine (6-8 hours)

### G2.1 Excel export
**File:** `apps/api-gateway/src/modules/reporting-engine/export.service.ts`

Using `xlsx` library:
```typescript
async exportToExcel(data: any[], filename: string): Promise<Buffer> {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Report');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
```

### G2.2 PDF export
Using `pdfkit` or `puppeteer` for HTML-to-PDF:
```typescript
async exportToPDF(data: any[], template: string): Promise<Buffer> {
  const html = this.renderTemplate(template, data);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm' } });
  await browser.close();
  return pdf;
}
```

### G2.3 CSV export
```typescript
async exportToCSV(data: any[]): Promise<string> {
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${row[h]}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}
```

### G2.4 Background export for large datasets
For exports > 10,000 rows:
1. Create ExportJob record (status: PENDING)
2. Queue background job
3. Job generates file, stores in filesystem/S3
4. Update ExportJob (status: COMPLETED, downloadUrl)
5. Notify user when ready

### G2.5 Export audit
Every export creates an AuditEvent:
- requester, report type, format, filters, scope, row count, completion status

**Acceptance criteria:**
- [ ] Excel export downloads .xlsx file
- [ ] PDF export downloads formatted report
- [ ] CSV export downloads comma-separated data
- [ ] Large exports processed in background
- [ ] Export audit trail created

---

## Phase G3: Scheduled Reports (4-6 hours)

### G3.1 Schedule model
```prisma
model ScheduledReport {
  id              String   @id @default(cuid())
  companyId       String
  reportType      String
  filters         Json
  format          ExportFormat // XLSX, PDF, CSV
  schedule        String   // cron expression: "0 9 * * 1" = every Monday 9am
  recipients      String[] // email addresses
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  status          ScheduleStatus // ACTIVE, PAUSED, COMPLETED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### G3.2 Scheduler service
**File:** `apps/api-gateway/src/modules/reporting-engine/scheduled-report.service.ts`

Using `@nestjs/schedule`:
```typescript
@Cron('0 * * * *') // Every hour
async checkScheduledReports() {
  const dueReports = await this.prisma.scheduledReport.findMany({
    where: { status: 'ACTIVE', nextRunAt: { lte: new Date() } }
  });

  for (const report of dueReports) {
    const data = await this.reportService.generateReport(report.reportType, report.filters, report.companyId);
    const file = await this.exportService.export(data, report.format);
    await this.emailService.send(report.recipients, `Report: ${report.reportType}`, file);
    await this.updateNextRun(report);
  }
}
```

**Acceptance criteria:**
- [ ] Reports can be scheduled (daily, weekly, monthly)
- [ ] Scheduled reports delivered to recipients
- [ ] Schedule can be paused/resumed
- [ ] Next run time calculated correctly

---

## Phase G4: AI Analytics (6-8 hours)

### G4.1 Wire ML service endpoints
Connect frontend to existing ML service:
- PredictiveAnalyticsPage → POST /api/v1/demand/forecast-demand
- RouteOptimizer → POST /api/v1/route/optimize-route
- CarbonIntelligence → POST /api/v1/carbon/calculate-carbon

### G4.2 Digital twin
**File:** `apps/web/src/components/pages/DigitalTwinPage.tsx`

Wire to real simulation data from intelligence module.

### G4.3 Cost leak detection
**File:** `apps/web/src/components/pages/CostLeakDashboard.tsx`

Wire to real analytics from billing + intelligence modules.

**Acceptance criteria:**
- [ ] Predictive analytics shows real forecasts
- [ ] Route optimization suggests real routes
- [ ] Carbon tracking calculates real emissions
- [ ] Cost leak detection identifies real issues

---

# PART H: PLAN 11 — MOBILE APP PRODUCTION

**Goal:** Mobile app compiles, all API contracts verified, offline support, production-ready.

**Duration:** 20-30 hours

---

## Phase H1: TypeScript & Build Fixes (4-6 hours)

### H1.1 Fix all TypeScript errors
```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | tee errors.txt
```

Fix every error. Common issues:
- Missing imports
- Incorrect types
- Expo API changes
- Navigation type mismatches

### H1.2 Add to CI
```yaml
- name: Mobile Typecheck
  run: npm run typecheck --workspace @moveflow/mobile
```

**Acceptance criteria:**
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npx expo export` succeeds
- [ ] CI runs mobile typecheck

---

## Phase H2: API Contract Verification (6-8 hours)

### H2.1 Map every mobile API call
For each call in `apps/mobile/src/services/api.ts`, verify:
- Backend endpoint exists
- Request payload matches backend DTO
- Response shape matches mobile expectations
- Auth header handled correctly

### H2.2 Fix mismatches
Update either mobile api.ts or backend controllers to match.

### H2.3 Add type-safe API client
Replace loose fetch calls with typed client:
```typescript
interface ApiClient {
  auth: {
    login(data: LoginRequest): Promise<AuthResponse>;
    register(data: RegisterRequest): Promise<AuthResponse>;
  };
  bookings: {
    list(params?: BookingListParams): Promise<PaginatedResponse<Booking>>;
    create(data: CreateBookingRequest): Promise<Booking>;
    approve(id: string, data: ApproveRequest): Promise<Booking>;
  };
  // ...
}
```

**Acceptance criteria:**
- [ ] All mobile API calls verified against backend
- [ ] Request/response types match
- [ ] No runtime contract mismatches

---

## Phase H3: Offline Support (6-8 hours)

### H3.1 Offline event queue
**File:** `apps/mobile/src/services/offline-queue.ts`

```typescript
class OfflineQueue {
  private queue: QueuedAction[] = [];

  async enqueue(action: QueuedAction) {
    this.queue.push(action);
    await AsyncStorage.setItem('offline-queue', JSON.stringify(this.queue));
  }

  async processQueue() {
    const isOnline = await NetInfo.fetch();
    if (!isOnline.isConnected) return;

    for (const action of this.queue) {
      try {
        await this.executeAction(action);
        this.queue = this.queue.filter(a => a.id !== action.id);
      } catch (e) {
        // Keep in queue for retry
      }
    }
    await AsyncStorage.setItem('offline-queue', JSON.stringify(this.queue));
  }
}
```

### H3.2 Queueable actions
- GPS location updates (highest priority)
- Trip status transitions
- Boarding confirmations
- SOS triggers

### H3.3 Connectivity indicator
Show network status in app header:
- Online: green dot
- Offline: red dot + "Offline — changes will sync when connected"

**Acceptance criteria:**
- [ ] Actions queued when offline
- [ ] Queue processed when connection restored
- [ ] GPS updates queued and delivered
- [ ] Connectivity status shown in UI

---

## Phase H4: Production Hardening (4-6 hours)

### H4.1 App icon and splash screen
Update `app.json` with production icons and splash screen.

### H4.2 Crash reporting
Integrate Sentry or Expo Crashlytics:
```typescript
import * as Sentry from 'sentry-expo';
Sentry.init({ dsn: 'https://...' });
```

### H4.3 Push notification setup
Configure FCM/APNs for push notifications.

### H4.4 App store metadata
Prepare for App Store / Play Store submission:
- App description
- Screenshots
- Privacy policy URL
- Terms of service URL

**Acceptance criteria:**
- [ ] App icon and splash screen production-ready
- [ ] Crash reporting captures errors
- [ ] Push notifications work on iOS and Android
- [ ] App store metadata prepared

---

# PART I: PLAN 12 — TESTING & QUALITY

**Goal:** Comprehensive test coverage: unit, integration, E2E, load, security.

**Duration:** 40-60 hours

---

## Phase I1: Backend Unit Tests (10-12 hours)

### I1.1 Add tests for untested modules (34 modules)
Priority order:
1. safety (SOS, incidents)
2. notifications (delivery, preferences)
3. finance (SLA penalty, budget, reconciliation)
4. security (MFA, device binding, privacy)
5. vendor (fleet, compliance, payments)
6. document-management (upload, verify, expiry)
7. intelligence (digital twin, cost leak, predictive)
8. reporting-engine (reports, exports)
9. policy (enforcement)
10. remaining modules

**Pattern:**
```typescript
describe('SafetyService', () => {
  let service: SafetyService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new SafetyService(prisma as any, mockAudit);
  });

  describe('triggerSOS', () => {
    it('should create SOS alert with OPEN status', async () => {
      prisma.sOSAlert.create.mockResolvedValue({ id: 'sos_1', status: 'OPEN' });
      const result = await service.triggerSOS('user_1', 'trip_1', { lat: 19.0, lng: 72.8 });
      expect(result.status).toBe('OPEN');
      expect(prisma.sOSAlert.create).toHaveBeenCalled();
    });

    it('should broadcast to company room via WebSocket', async () => {
      await service.triggerSOS('user_1', 'trip_1', { lat: 19.0, lng: 72.8 });
      expect(mockEventsGateway.emitToCompany).toHaveBeenCalledWith(
        expect.any(String), 'sos:triggered', expect.any(Object)
      );
    });
  });
});
```

### I1.2 Target: 200+ new test cases
Current: ~350 cases. Target: 550+ cases.

**Acceptance criteria:**
- [ ] All 46 modules have unit tests
- [ ] 550+ test cases total
- [ ] All tests pass

---

## Phase I2: Authorization Tests (8-10 hours)

### I2.1 Permission enforcement tests
For every endpoint with `@RequirePermissions()`:
```typescript
describe('Authorization', () => {
  it('should deny EMPLOYEE accessing /api/platform/admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/platform/admin/companies')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(response.status).toBe(403);
  });

  it('should allow NAVIRA_OWNER accessing /api/platform/admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/platform/admin/companies')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(response.status).toBe(200);
  });
});
```

### I2.2 Tenant isolation tests
```typescript
describe('Tenant Isolation', () => {
  it('should deny Company A reading Company B data', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/employees`)
      .set('Authorization', `Bearer ${companyAToken}`);
    // All returned employees must belong to Company A
    expect(response.body.data.every(e => e.companyId === companyA.id)).toBe(true);
  });
});
```

### I2.3 IDOR tests
```typescript
describe('IDOR Protection', () => {
  it('should deny accessing other company booking by ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/bookings/${companyBBookingId}`)
      .set('Authorization', `Bearer ${companyAToken}`);
    expect(response.status).toBe(403);
  });
});
```

**Acceptance criteria:**
- [ ] Every permission-checked endpoint tested (allow + deny)
- [ ] Cross-tenant access blocked and tested
- [ ] IDOR attempts blocked and tested

---

## Phase I3: E2E Browser Tests (10-12 hours)

### I3.1 Playwright setup
**File:** `apps/web/playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

### I3.2 Critical path tests
```
1. Login → Dashboard (all 19 role profiles)
2. Employee: Book transport → See booking in list
3. Manager: Approve booking → Status changes
4. Coordinator: Dispatch trip → Driver assigned
5. Driver: Start trip → Complete trip → Cost calculated
6. Admin: Create vehicle → Vehicle appears in list
7. Admin: Import employees → Employees appear
8. Finance: View invoices → Export to Excel
9. Security: MFA setup → MFA verification on login
10. SOS: Trigger SOS → Alert visible in control room
```

### I3.3 Visual regression
Capture screenshots of key pages and compare against baselines.

**Acceptance criteria:**
- [ ] 10+ E2E test scenarios
- [ ] All role profiles tested
- [ ] Full booking lifecycle tested in browser
- [ ] Screenshots captured for visual regression

---

## Phase I4: Load Testing (6-8 hours)

### I4.1 k6 load tests
**File:** `apps/api-gateway/test/load/gps-ingestion.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    gps_ingestion: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
  },
};

export default function () {
  const payload = JSON.stringify({
    tripId: 'trip_001',
    lat: 19.076 + Math.random() * 0.01,
    lng: 72.877 + Math.random() * 0.01,
    speed: 30 + Math.random() * 20,
    heading: Math.random() * 360,
    timestamp: new Date().toISOString(),
  });

  const params = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${__ENV.TOKEN}` } };
  const res = http.post('http://localhost:3001/api/gps/location', payload, params);
  check(res, { 'status is 201': (r) => r.status === 201 });
}
```

### I4.2 Test scenarios
- GPS ingestion: 100 VUs for 5 minutes
- Booking creation: 50 VUs for 3 minutes
- Dashboard KPI: 200 VUs for 5 minutes
- Search queries: 100 VUs for 3 minutes

### I4.3 Performance targets
- GPS ingestion: < 100ms p95
- API responses: < 500ms p95
- Dashboard load: < 2s p95
- Concurrent users: 500+

**Acceptance criteria:**
- [ ] Load tests run without errors
- [ ] Performance targets met
- [ ] No memory leaks detected

---

## Phase I5: Security Testing (4-6 hours)

### I5.1 OWASP Top 10 checks
- SQL injection → parameterized queries (Prisma)
- XSS → input sanitization, CSP headers
- CSRF → CSRF token validation
- Broken authentication → JWT validation, session management
- Sensitive data exposure → no secrets in responses, HTTPS
- XML external entities → N/A (JSON API)
- Broken access control → guard testing
- Security misconfiguration → Helmet, CORS
- Known vulnerabilities → `npm audit`
- Insufficient logging → audit trail

### I5.2 Automated security scanning
```yaml
# In CI pipeline
- name: Security Scan
  run: |
    npm audit --audit-level=high
    npx semgrep --config=auto apps/api-gateway/src/
```

**Acceptance criteria:**
- [ ] No high/critical npm vulnerabilities
- [ ] No SQL injection vectors
- [ ] No XSS vectors
- [ ] CSRF protection validated
- [ ] Auth bypass attempts blocked

---

# PART J: PLAN 13 — INFRASTRUCTURE & DEVOPS

**Goal:** Production-grade infrastructure with Terraform, proper K8s, backup, DR.

**Duration:** 40-60 hours

---

## Phase J1: Fix Current Infrastructure (4-6 hours)

### J1.1 Fix docker-compose port mapping
```yaml
# BEFORE (broken)
services:
  api:
    ports: ["3000:3000"]  # WRONG
  web:
    ports: ["3001:3000"]  # WRONG

# AFTER (fixed)
services:
  api:
    ports: ["3001:3001"]
  web:
    ports: ["3000:3000"]
```

### J1.2 Fix Dockerfile CMD path
```dockerfile
# BEFORE (wrong)
CMD ["node", "dist/main.js"]

# AFTER (correct)
CMD ["node", "dist/src/main.js"]
```

### J1.3 Add .dockerignore
```
node_modules
.git
.env
*.log
dist
.next
.turbo
coverage
test_output.txt
```

### J1.4 Consolidate K8s manifests
Delete `infra/kubernetes/` directory. Keep `k8s/` as single source of truth.

### J1.5 Delete duplicate CI workflow
Remove `.github/workflows/ci-cd.yml`. Keep `ci.yml`.

### J1.6 Add ML service to docker-compose
```yaml
ml-service:
  build: ./apps/ml-service
  ports: ["8000:8000"]
  environment:
    - REDIS_URL=redis://redis:6379
```

**Acceptance criteria:**
- [ ] `docker compose up` starts all services correctly
- [ ] API accessible on port 3001
- [ ] Web accessible on port 3000
- [ ] ML service accessible on port 8000
- [ ] Health checks pass
- [ ] Single K8s manifest set

---

## Phase J2: Terraform IaC (12-16 hours)

### J2.1 Provider configuration
**File:** `infra/terraform/providers.tf`

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "navira-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }
}
```

### J2.2 VPC
**File:** `infra/terraform/vpc.tf`

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  name    = "navira-prod"
  cidr    = "10.0.0.0/16"
  azs     = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = false  # HA: one per AZ
}
```

### J2.3 RDS (PostgreSQL)
**File:** `infra/terraform/rds.tf`

```hcl
resource "aws_db_instance" "navira" {
  identifier     = "navira-prod"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.r6g.large"
  allocated_storage = 100
  storage_encrypted = true
  multi_az = true
  backup_retention_period = 30
  deletion_protection = true
}
```

### J2.4 ElastiCache (Redis)
**File:** `infra/terraform/redis.tf`

```hcl
resource "aws_elasticache_cluster" "navira" {
  cluster_id      = "navira-prod"
  engine          = "redis"
  node_type       = "cache.r6g.large"
  num_cache_nodes = 2
  port            = 6379
}
```

### J2.5 EKS (Kubernetes)
**File:** `infra/terraform/eks.tf`

```hcl
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "navira-prod"
  cluster_version = "1.28"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  eks_managed_node_groups = {
    general = { instance_types = ["m6i.xlarge"], min_size = 3, max_size = 10 }
  }
}
```

### J2.6 S3 (Documents + Exports)
**File:** `infra/terraform/s3.tf`

```hcl
resource "aws_s3_bucket" "documents" {
  bucket = "navira-documents-prod"
}
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration { status = "Enabled" }
}
```

### J2.7 Secrets Manager
**File:** `infra/terraform/secrets.tf`

```hcl
resource "aws_secretsmanager_secret" "db_password" {
  name = "navira/prod/db-password"
}
resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "navira/prod/jwt-secret"
}
```

**Acceptance criteria:**
- [ ] `terraform plan` succeeds
- [ ] VPC with 3 AZs, public + private subnets
- [ ] RDS PostgreSQL 16 with encryption, multi-AZ, backups
- [ ] ElastiCache Redis with 2 nodes
- [ ] EKS cluster with auto-scaling node group
- [ ] S3 bucket with versioning
- [ ] Secrets Manager for all credentials

---

## Phase J3: Kubernetes Production (8-10 hours)

### J3.1 Helm charts
**File:** `infra/helm/navira/`

```
Chart.yaml
values.yaml
values-staging.yaml
values-production.yaml
templates/
  api-gateway/
  web/
  ml-service/
  ingress/
  hpa/
  pdb/
  networkpolicy/
  configmap/
  secret/
```

### J3.2 Environment separation
- Staging: 1 replica, smaller instances, debug logging
- Production: 3+ replicas, HPA, structured logging, no debug

### J3.3 Pod Disruption Budgets
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-gateway
```

### J3.4 Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway-netpol
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: web
    ports:
    - port: 3001
```

**Acceptance criteria:**
- [ ] Helm chart installs cleanly
- [ ] Staging and production values separate
- [ ] PDB prevents downtime during disruptions
- [ ] Network policies restrict traffic flow
- [ ] HPA scales based on CPU/memory

---

## Phase J4: Backup & Disaster Recovery (6-8 hours)

### J4.1 Database backup
```hcl
# In Terraform
resource "aws_db_instance_automated_backups_replication" "navira" {
  source_db_instance_arn = aws_db_instance.navira.arn
  backup_retention_period = 30
}
```

### J4.2 S3 backup
```hcl
resource "aws_s3_bucket" "backups" {
  bucket = "navira-backups-prod"
}
```

### J4.3 Backup cron job
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command: ["pg_dump", "-h", "db-host", "-U", "postgres", "navira"]
```

### J4.4 DR runbook
**File:** `infra/docs/DISASTER_RECOVERY.md`

Steps:
1. Restore RDS from automated backup (point-in-time recovery)
2. Restore S3 from versioned objects
3. Deploy from latest CI/CD pipeline
4. Verify health checks
5. DNS failover if region down

**Acceptance criteria:**
- [ ] Automated daily backups
- [ ] 30-day backup retention
- [ ] Point-in-time recovery tested
- [ ] S3 versioning enabled
- [ ] DR runbook documented

---

## Phase J5: Secret Management (4-6 hours)

### J5.1 Remove .env from source
- Delete all `.env` files from repository
- Add `*.env` (except `.env.example`) to `.gitignore`
- Rotate all exposed credentials

### J5.2 External Secrets Operator
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: navira-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: navira-secrets
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: navira/prod/database-url
  - secretKey: JWT_SECRET
    remoteRef:
      key: navira/prod/jwt-secret
```

### J5.3 CI/CD secret injection
GitHub Actions secrets → Kubernetes secrets via External Secrets Operator.

**Acceptance criteria:**
- [ ] No secrets in source code
- [ ] All credentials in AWS Secrets Manager
- [ ] External Secrets Operator syncs to K8s
- [ ] CI/CD uses GitHub Secrets
- [ ] All exposed credentials rotated

---

# PART K: PLAN 14 — OBSERVABILITY & MONITORING

**Goal:** Full observability stack: metrics, traces, logs, alerts.

**Duration:** 30-40 hours

---

## Phase K1: Structured Logging (6-8 hours)

### K1.1 Pino structured logger
**File:** `apps/api-gateway/src/common/structured-logger.service.ts`

```typescript
@Injectable()
export class StructuredLoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: { service: 'api-gateway', version: process.env.APP_VERSION },
    });
  }

  log(context: string, message: string, data?: any) {
    this.logger.info({ context, ...data }, message);
  }

  error(context: string, message: string, error?: Error, data?: any) {
    this.logger.error({ context, err: error, ...data }, message);
  }

  warn(context: string, message: string, data?: any) {
    this.logger.warn({ context, ...data }, message);
  }
}
```

### K1.2 Request context logging
Every log entry includes:
- requestId (from X-Request-ID header)
- userId (from JWT)
- companyId (from tenant context)
- timestamp
- duration (for completed requests)

### K1.3 Log levels
- ERROR: System errors, unhandled exceptions
- WARN: Business rule violations, degraded performance
- INFO: Request lifecycle, business events
- DEBUG: Detailed data (only in non-production)

**Acceptance criteria:**
- [ ] All log entries are structured JSON
- [ ] Request context propagated through logs
- [ ] Log levels appropriate
- [ ] No sensitive data in logs (passwords, tokens)

---

## Phase K2: Metrics (8-10 hours)

### K2.1 Prometheus metrics
**File:** `apps/api-gateway/src/common/metrics/metrics.service.ts`

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

export const gpsPointsIngested = new Counter({
  name: 'gps_points_ingested_total',
  help: 'Total GPS points ingested',
  labelNames: ['company_id'],
});

export const tripsActive = new Gauge({
  name: 'trips_active',
  help: 'Number of active trips',
});
```

### K2.2 Metrics endpoint
**File:** `apps/api-gateway/src/common/metrics/metrics.controller.ts`

```
GET /metrics → Prometheus-format metrics
```

### K2.3 Business metrics
- Bookings created per hour
- Trips completed per day
- Active drivers
- Active vehicles
- SOS alerts triggered
- Notifications sent per channel
- Export jobs completed
- API errors by endpoint

**Acceptance criteria:**
- [ ] /metrics endpoint returns Prometheus-format data
- [ ] HTTP request metrics captured
- [ ] Business metrics captured
- [ ] GPS ingestion metrics captured
- [ ] Metrics scrapeable by Prometheus

---

## Phase K3: Distributed Tracing (6-8 hours)

### K3.1 OpenTelemetry setup
**File:** `apps/api-gateway/src/common/tracing/tracing.service.ts`

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const provider = new NodeTracerProvider();
const exporter = new JaegerExporter({ endpoint: 'http://jaeger:14268/api/traces' });
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();
```

### K3.2 Trace context propagation
- HTTP requests: W3C Trace Context headers
- WebSocket: Custom trace ID in event metadata
- Database queries: Prisma spans
- External calls: HTTP client spans

### K3.3 Trace visualization
Jaeger UI at `http://jaeger:16686` showing:
- Request lifecycle across services
- Database query duration
- External call duration
- Error traces

**Acceptance criteria:**
- [ ] Traces exported to Jaeger
- [ ] HTTP requests traced end-to-end
- [ ] Database queries visible in traces
- [ ] Errors highlighted in trace view

---

## Phase K4: Alerting (4-6 hours)

### K4.1 Prometheus alerting rules
**File:** `infra/monitoring/prometheus-rules.yml`

```yaml
groups:
- name: navira
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 5m
    labels: { severity: critical }
    annotations: { summary: "High error rate detected" }

  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels: { severity: warning }
    annotations: { summary: "High latency detected (p95 > 2s)" }

  - alert: DatabaseDown
    expr: up{job="postgres"} == 0
    for: 1m
    labels: { severity: critical }
    annotations: { summary: "PostgreSQL is down" }

  - alert: RedisDown
    expr: up{job="redis"} == 0
    for: 1m
    labels: { severity: critical }
    annotations: { summary: "Redis is down" }

  - alert: SOSTriggered
    expr: increase(sos_alerts_total[5m]) > 0
    labels: { severity: critical }
    annotations: { summary: "SOS alert triggered" }
```

### K4.2 Alertmanager configuration
```yaml
route:
  receiver: 'slack'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
receivers:
- name: 'slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/...'
    channel: '#navira-alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ .CommonAnnotations.summary }}'
```

### K4.3 PagerDuty integration
For critical alerts → PagerDuty → on-call rotation.

**Acceptance criteria:**
- [ ] Alerting rules defined for critical metrics
- [ ] Alertmanager sends to Slack
- [ ] Critical alerts go to PagerDuty
- [ ] Alert fatigue managed (grouping, throttling)

---

## Phase K5: Grafana Dashboards (4-6 hours)

### K5.1 Infrastructure dashboard
- CPU/memory usage per pod
- Network I/O
- Disk usage
- Pod restarts

### K5.2 Application dashboard
- Request rate, error rate, latency (RED metrics)
- Active users, active sessions
- GPS points ingested per minute
- Trips in progress
- Notifications sent

### K5.3 Business dashboard
- Bookings per day
- Revenue per day
- Active companies
- New registrations
- Churn rate

**Acceptance criteria:**
- [ ] Infrastructure dashboard shows real data
- [ ] Application dashboard shows RED metrics
- [ ] Business dashboard shows key KPIs
- [ ] Dashboards accessible via Grafana UI

---

# PART L: PLAN 15 — SECURITY & PRIVACY COMPLIANCE

**Goal:** GDPR compliance, field-level encryption, data retention, audit integrity.

**Duration:** 20-30 hours

---

## Phase L1: Field-Level Encryption (6-8 hours)

### L1.1 Encrypt PII fields
**File:** `packages/database/prisma/schema.prisma`

Add encryption to sensitive fields:
```prisma
model User {
  // ... existing fields
  phone        String?   // @encrypted
  email        String    // @encrypted (for non-login lookup, use hashed index)
  passwordHash String    // already hashed
}
```

### L1.2 Encryption service
**File:** `apps/api-gateway/src/common/crypto/encryption.service.ts`

```typescript
@Injectable()
export class EncryptionService {
  private cipher: crypto.Cipher;

  constructor(private config: ConfigService) {
    const key = Buffer.from(config.get('ENCRYPTION_KEY'), 'hex');
    this.cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  }

  encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return { encrypted, iv: iv.toString('hex'), tag };
  }

  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

### L1.3 Searchable encryption
For fields that need to be queried (email, phone):
- Store encrypted value for display
- Store hash for lookup
- Use Prisma middleware to transparently encrypt/decrypt

**Acceptance criteria:**
- [ ] PII fields encrypted at rest
- [ ] Encryption key in Secrets Manager
- [ ] Search by encrypted fields works via hash index
- [ ] Decryption only by authorized services

---

## Phase L2: Data Retention (4-6 hours)

### L2.1 Retention policy model
```prisma
model DataRetentionPolicy {
  id              String   @id @default(cuid())
  companyId       String
  entityType      String   // GPS_POINT, AUDIT_LOG, NOTIFICATION, SESSION
  retentionDays   Int
  autoDelete      Boolean  @default(false)
  lastCleanupAt   DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  company         Company  @relation(fields: [companyId], references: [id])
}
```

### L2.2 Cleanup cron job
```typescript
@Cron('0 3 * * *') // 3 AM daily
async enforceRetentionPolicy() {
  const policies = await this.prisma.dataRetentionPolicy.findMany({ where: { autoDelete: true } });

  for (const policy of policies) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const deleted = await this.prisma[policy.entityType].deleteMany({
      where: { createdAt: { lt: cutoffDate }, companyId: policy.companyId }
    });

    this.logger.log(`Retention cleanup: ${policy.entityType} — ${deleted.count} records deleted`);
  }
}
```

### L2.3 Default retention periods
- GPS points: 90 days
- Audit logs: 365 days (or 7 years for compliance)
- Notifications: 30 days
- Sessions: 30 days
- Export files: 7 days

**Acceptance criteria:**
- [ ] Retention policies configurable per company
- [ ] Auto-cleanup runs daily
- [ ] Default periods applied to new companies
- [ ] Cleanup audit logged

---

## Phase L3: DSAR (Data Subject Access Requests) (4-6 hours)

### L3.1 DSAR model
```prisma
model DSARRequest {
  id              String   @id @default(cuid())
  companyId       String
  userId          String
  requestType     DSARType // ACCESS, DELETION, PORTABILITY, RECTIFICATION
  status          DSARStatus // PENDING, IN_PROGRESS, COMPLETED, REJECTED
  requestedAt     DateTime @default(now())
  completedAt     DateTime?
  responseUrl     String?  // download link for data export
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  company         Company  @relation(fields: [companyId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
}
```

### L3.2 DSAR service
**File:** `apps/api-gateway/src/modules/security/dsar.service.ts`

Methods:
- `submitRequest(userId, type)` → creates DSARRequest
- `processAccessRequest(id)` → collects all user data, creates export file
- `processDeletionRequest(id)` → anonymizes/deletes user data
- `processPortabilityRequest(id)` → creates machine-readable export (JSON)
- `processRectificationRequest(id, corrections)` → updates user data

### L3.3 Frontend DSAR page
**File:** `apps/web/src/components/pages/DSARPage.tsx`

For users: request data access, download data, request deletion.
For admins: view all DSAR requests, process them.

**Acceptance criteria:**
- [ ] User can request data access
- [ ] User can download their data (JSON export)
- [ ] User can request data deletion
- [ ] Admin can process DSAR requests
- [ ] DSAR audit trail maintained

---

## Phase L4: Audit Integrity (4-6 hours)

### L4.1 Hash chain for audit logs
```typescript
// In AuditService
async createAuditLog(data: AuditLogData) {
  const previousLog = await this.prisma.auditLog.findFirst({
    where: { companyId: data.companyId },
    orderBy: { createdAt: 'desc' },
  });

  const previousHash = previousLog?.currentHash || '0'.repeat(64);
  const content = JSON.stringify({ ...data, previousHash });
  const currentHash = crypto.createHash('sha256').update(content).digest('hex');

  return this.prisma.auditLog.create({
    data: { ...data, previousHash, currentHash }
  });
}
```

### L4.2 Audit verification
```typescript
async verifyAuditChain(companyId: string): Promise<{ valid: boolean; brokenAt?: string }> {
  const logs = await this.prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: 'asc' }
  });

  for (let i = 1; i < logs.length; i++) {
    if (logs[i].previousHash !== logs[i-1].currentHash) {
      return { valid: false, brokenAt: logs[i].id };
    }
  }
  return { valid: true };
}
```

**Acceptance criteria:**
- [ ] Every audit log has hash chain
- [ ] Chain integrity verifiable
- [ ] Broken chain detected and reported
- [ ] Audit logs immutable (no updates/deletes)

---

# PART M: PLAN 16 — DOCUMENTATION & DEVELOPER EXPERIENCE

**Goal:** Complete documentation, API docs, developer onboarding, runbooks.

**Duration:** 15-20 hours

---

## Phase M1: API Documentation (4-6 hours)

### M1.1 Swagger/OpenAPI
**File:** `apps/api-gateway/src/main.ts`

Swagger already configured at `/docs`. Enhance with:
- Complete endpoint descriptions
- Request/response examples
- Authentication requirements
- Error response schemas

### M1.2 Per-module Swagger decorators
```typescript
@ApiOperation({ summary: 'Create a booking', description: 'Creates a new transport booking for an employee' })
@ApiResponse({ status: 201, description: 'Booking created', type: BookingResponse })
@ApiResponse({ status: 400, description: 'Validation error' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
@Post('bookings')
async createBooking(@Body() dto: CreateBookingDto, @Tenant() companyId: string) {
  // ...
}
```

**Acceptance criteria:**
- [ ] All endpoints documented in Swagger
- [ ] Request/response examples provided
- [ ] Auth requirements clear
- [ ] Error responses documented

---

## Phase M2: Developer Onboarding (4-6 hours)

### M2.1 Enhanced README
**File:** `moveflow/README.md`

Sections:
1. Project overview
2. Tech stack
3. Prerequisites (Node 18, PostgreSQL 16, Redis 7)
4. Quick start (docker compose up)
5. Development setup
6. Project structure
7. Available scripts
8. Testing
9. Deployment
10. Contributing guidelines

### M2.2 Development setup script
```bash
#!/bin/bash
# setup.sh
echo "Setting up NAVIRA development environment..."
docker compose up -d db redis
cd packages/database && npx prisma migrate deploy && npx prisma db seed
cd ../.. && npm install
echo "Development environment ready!"
echo "API: http://localhost:3001"
echo "Web: http://localhost:3000"
```

### M2.3 Architecture Decision Records
**File:** `docs/adr/`

Document key decisions:
- Why NestJS over Express
- Why Prisma over TypeORM
- Why custom JWT over Supabase Auth
- Why Turborepo over Nx
- Why React Native over Flutter

**Acceptance criteria:**
- [ ] README has complete setup instructions
- [ ] setup.sh works on fresh clone
- [ ] ADRs document key decisions
- [ ] New developer can start contributing in < 1 hour

---

## Phase M3: Runbooks (4-6 hours)

### M3.1 Deployment runbook
**File:** `infra/docs/DEPLOYMENT.md`

Steps:
1. Merge to main → CI builds images
2. CI pushes to GHCR
3. CI applies K8s manifests
4. Verify health checks
5. Monitor Grafana dashboards

### M3.2 Incident response runbook
**File:** `infra/docs/INCIDENT_RESPONSE.md`

Steps:
1. Detect (alert fires)
2. Triage (severity assessment)
3. Mitigate (rollback, scale, restart)
4. Investigate (logs, traces, metrics)
5. Resolve (fix, deploy)
6. Post-mortem (document, improve)

### M3.3 Database runbook
**File:** `infra/docs/DATABASE.md`

Steps:
1. Schema migration process
2. Backup and restore
3. Performance tuning
4. Connection pooling
5. Failover procedures

### M3.4 Secrets rotation runbook
**File:** `infra/docs/SECRETS_ROTATION.md`

Steps:
1. Generate new secret
2. Update Secrets Manager
3. Restart affected services
4. Verify functionality
5. Revoke old secret

**Acceptance criteria:**
- [ ] Deployment runbook complete
- [ ] Incident response runbook complete
- [ ] Database runbook complete
- [ ] Secrets rotation runbook complete
- [ ] All runbooks reviewed and tested

---

# EXECUTION SUMMARY

## Total Effort Estimate

| Plan | Phase | Hours |
|------|-------|-------|
| **PLAN 5** | B1-B11 (MVP Core) | 35-50 |
| **PLAN 6** | C1-C5 (Security) | 20-30 |
| **PLAN 7** | D1-D5 (Platform SaaS) | 40-60 |
| **PLAN 8** | E1-E4 (GPS/Maps) | 30-40 |
| **PLAN 9** | F1-F5 (Notifications) | 20-30 |
| **PLAN 10** | G1-G4 (Reports) | 30-40 |
| **PLAN 11** | H1-H4 (Mobile) | 20-30 |
| **PLAN 12** | I1-I5 (Testing) | 40-60 |
| **PLAN 13** | J1-J5 (Infrastructure) | 40-60 |
| **PLAN 14** | K1-K5 (Observability) | 30-40 |
| **PLAN 15** | L1-L4 (Privacy) | 20-30 |
| **PLAN 16** | M1-M3 (Documentation) | 15-20 |
| **TOTAL** | | **340-490 hours** |

## Execution Order

```
PHASE 1: Foundation (Week 1-2)
├── B1-B3: Database + Seed + Backend wiring
├── B4-B6: Frontend wiring (30 pages)
└── C1-C2: AccessScopeGuard + Owner-only enforcement

PHASE 2: Core Features (Week 3-4)
├── B7-B9: GPS + Notifications + Mobile alignment
├── B10-B11: E2E verification + CI/CD fixes
├── E1-E2: Google Maps + Geofence detection
└── C3-C5: DTOs + Security fixes + MFA

PHASE 3: Production Features (Week 5-8)
├── D1-D3: Subscriptions + Provisioning + White label
├── E3-E4: Route deviation + Dispatch board
├── F1-F5: Email + SMS + Push + WhatsApp + Preferences
└── G1-G2: Report builder + Export engine

PHASE 4: Quality & Scale (Week 9-12)
├── G3-G4: Scheduled reports + AI analytics
├── H1-H4: Mobile production readiness
├── I1-I5: Comprehensive testing
└── J1-J3: Fix infra + Terraform + K8s

PHASE 5: Enterprise (Week 13-16)
├── D4-D5: SSO + Webhooks
├── J4-J5: Backup/DR + Secret management
├── K1-K5: Full observability stack
├── L1-L4: Encryption + Retention + DSAR + Audit
└── M1-M3: Documentation + Runbooks

PHASE 6: Launch Prep (Week 17-18)
├── Security audit
├── Load testing
├── DR testing
├── Penetration testing
├── Documentation review
└── Go-live checklist
```

## Success Criteria

### MVP (After Plan 5)
- [ ] Employee can book transport end-to-end
- [ ] Manager can approve bookings
- [ ] Coordinator can dispatch trips
- [ ] Driver can complete trips
- [ ] Cost calculated from rate cards
- [ ] Dashboard shows real numbers
- [ ] GPS tracking works
- [ ] docker-compose up gives working system
- [ ] All tests pass

### Production (After Plans 5-16)
- [ ] 550+ test cases passing
- [ ] All 46 modules tested
- [ ] E2E browser tests covering all roles
- [ ] Load tests pass (500+ concurrent users)
- [ ] Terraform manages all infrastructure
- [ ] Kubernetes with HPA, PDB, network policies
- [ ] Monitoring, tracing, alerting operational
- [ ] Backup and DR tested
- [ ] All secrets in Secrets Manager
- [ ] GDPR compliance (encryption, retention, DSAR)
- [ ] SSO working with major providers
- [ ] Email, SMS, push, WhatsApp notifications working
- [ ] 30+ report types with export
- [ ] Mobile app in app stores
- [ ] Complete documentation and runbooks
- [ ] Security audit passed
- [ ] Penetration test passed
