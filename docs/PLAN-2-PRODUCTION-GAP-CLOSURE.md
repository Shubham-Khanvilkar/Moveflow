# PLAN 2: PRODUCTION GAP CLOSURE MASTER

> **Date:** September 6, 2026
> **Status:** Implementation Plan
> **Scope:** Complete production readiness for MoveInSync (NAVIRA) Enterprise Transportation Platform

---

## TABLE OF CONTENTS

1. [Current State Assessment](#1-current-state-assessment)
2. [Phase 0: Foundation Fixes (P0)](#2-phase-0-foundation-fixes-p0)
3. [Phase 1: Company Onboarding & Lifecycle (P0)](#3-phase-1-company-onboarding--lifecycle-p0)
4. [Phase 2: Real Authorization Engine (P0)](#4-phase-2-real-authorization-engine-p0)
5. [Phase 3: Trip & Passenger Lifecycle (P0)](#5-phase-3-trip--passenger-lifecycle-p0)
6. [Phase 4: Dispatch & Driver Engine (P0)](#6-phase-4-dispatch--driver-engine-p0)
7. [Phase 5: Billing Engine (P0)](#7-phase-5-billing-engine-p0)
8. [Phase 6: Notifications (P1)](#8-phase-6-notifications-p1)
9. [Phase 7: Policy Engine (P1)](#9-phase-7-policy-engine-p1)
10. [Phase 8: Safety & Emergency (P1)](#10-phase-8-safety--emergency-p1)
11. [Phase 9: Vendor Compliance (P1)](#11-phase-9-vendor-compliance-p1)
12. [Phase 10: Intelligence Layer (P2)](#12-phase-10-intelligence-layer-p2)
13. [Phase 11: CXO & Analytics (P2)](#13-phase-11-cxo--analytics-p2)
14. [Phase 12: Testing (P0 - Production Gate)](#14-phase-12-testing-p0---production-gate)
15. [Phase 13: Infrastructure (P0 - Production Gate)](#15-phase-13-infrastructure-p0---production-gate)
16. [Production Readiness Gate](#16-production-readiness-gate)
17. [Unique Differentiators](#17-unique-differentiators)
18. [Session-by-Session Execution Plan](#18-session-by-session-execution-plan)

---

## 1. CURRENT STATE ASSESSMENT

Based on deep audit of all codebases (API gateway, web frontend, Prisma schema):

| Area | Status | Real vs Placeholder |
|------|--------|-------------------|
| RBAC/Guards | **BROKEN** | 3 critical bugs: accessScopes always empty, UserAccessOverride dead code, company-scoping missing |
| Booking | **PARTIAL** | Create/approve works, status sync broken, 10/15 enum values unused |
| Trip State Machine | **PARTIAL** | Normal flow works, 7 exception states missing from DB enum |
| Passenger States | **SCHEMA ONLY** | TripPassenger exists but no state machine, no boarding/alighting logic |
| Dispatch | **BROKEN** | Auto-dispatch writes to non-existent field, no assignment records |
| Seat Optimization | **SCHEMA ONLY** | VehicleOccupancyLog never written, no seat assignment |
| Billing | **30%** | Rate cards + basic costing work, no invoice lifecycle, no vendor settlement |
| Vendor | **40%** | CRUD works, 3 disconnected vendor models, no contract system |
| GPS | **FRONTEND ONLY** | Map component exists, no real-time WebSocket ingestion |
| Notifications | **SCHEMA ONLY** | Notification model exists, no send logic |
| Reports | **STRUCTURAL** | Export works, 22/28 report types are stubs |
| Security | **MINIMAL** | JWT auth exists, no MFA, no rate limiting, no CSRF |
| Testing | **UNIT ONLY** | 222 unit tests, zero integration/E2E |
| Infrastructure | **LOCAL DEV ONLY** | No Docker, no CI/CD, no production config |
| Monitoring | **NONE** | No logging framework, no health checks, no alerting |

### Critical Bugs Found

| # | Bug | Severity | File |
|---|-----|----------|------|
| 1 | `accessScopes` hardcoded to `[]` in JWT strategy | CRITICAL | `jwt.strategy.ts:89` |
| 2 | `UserAccessOverride` never read by any guard | CRITICAL | Dead code |
| 3 | Two duplicate `AccessScopeGuard` implementations | HIGH | `common/guards/` vs `common/` |
| 4 | `UserRoleAssignment` not scoped to company | HIGH | `jwt.strategy.ts:117` |
| 5 | CompoundGuard passes `null` PrismaService | HIGH | `compound.guard.ts:26` |
| 6 | `PermissionsGuard` bypass asymmetry | MEDIUM | `permissions.guard.ts` |
| 7 | 7 trip states missing from DB enum | HIGH | `schema.prisma` |
| 8 | Auto-dispatch writes to non-existent field | HIGH | `dispatch-engine.service.ts:43` |
| 9 | Booking status never syncs with trip status | MEDIUM | `trip.service.ts` |
| 10 | `VehicleOccupancyLog` never written | MEDIUM | No code references it |

---

## 2. PHASE 0: FOUNDATION FIXES (P0)

**Goal:** Fix the broken authorization engine so every other feature built on top is secure.

**Effort:** ~2000 lines | 1 session

### 0.1 Fix JWT Strategy accessScopes

**File:** `apps/api-gateway/src/modules/auth/strategies/jwt.strategy.ts`

**Bug:** Line 89 hardcodes `accessScopes: []`

**Fix:**
```typescript
// In buildUserContext(), add:
const accessScopes = await this.prisma.accessScope.findMany({
  where: {
    userId,
    companyId,
    isActive: true,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ],
  },
  include: {
    site: { select: { id: true, siteName: true, siteCode: true } },
    lob: { select: { id: true, lobName: true, lobCode: true } },
    process: { select: { id: true, processName: true, processCode: true } },
    shift: { select: { id: true, name: true } },
  },
});

return {
  // ... existing fields ...
  accessScopes,  // <-- REAL scopes instead of []
};
```

**Also fix:**
- Scope `UserRoleAssignment` query by `companyId` (currently leaks across companies)
- Read `UserAccessOverride` and merge into permissions (currently dead code)
- Add `expiresAt` check on `TransportAccessAssignment`

### 0.2 Consolidate AccessScopeGuard

**Bug:** Two duplicate implementations exist:
- `common/guards/access-scope.guard.ts` (used by CompoundGuard, always gets empty scopes)
- `common/access-scope.guard.ts` (standalone 267-line service, queries DB directly)

**Fix:**
1. Delete `common/access-scope.guard.ts` (standalone version)
2. Enhance `common/guards/access-scope.guard.ts` to query DB directly when scopes are empty
3. Fix `CompoundGuard` passing `null as any` as PrismaService

### 0.3 Fix PermissionsGuard Bypass Asymmetry

**Bug:** `SAAS_OWNER` and `MOVEINSYNC_OWNER` bypass `RolesGuard` but NOT `PermissionsGuard`

**Fix:**
```typescript
// In permissions.guard.ts, add to bypass list:
const OWNER_TIERS = ['SAAS_OWNER', 'MOVEINSYNC_OWNER', 'SUPER_ADMIN', 'NAVIRA_OWNER'];
if (userRoles.some((r: string) => OWNER_TIERS.includes(r))) {
  return true;
}
```

### 0.4 Permission Inheritance Chain

**New model:** `PermissionInheritance`
```prisma
model PermissionInheritance {
  id            String   @id @default(uuid())
  userId        String
  companyId     String
  permissionKey String
  source        String   // ROLE | COMPANY_SCOPE | SITE_SCOPE | PROCESS_SCOPE | INDIVIDUAL_OVERRIDE
  sourceId      String?  // ID of the role/scope/override that provided this permission
  isGranted     Boolean
  hierarchy     Int      // Lower = higher priority (0=override, 1=process, 2=site, 3=company, 4=role)
  createdAt     DateTime @default(now())

  @@unique([userId, companyId, permissionKey, source])
  @@index([userId, companyId])
}
```

**New service:** `PermissionResolver`
- Resolves: Role defaults → Company scope → Site scope → Process scope → Individual override
- Returns full inheritance chain with "why" metadata
- API: `GET /permissions/resolve/:userId`

### 0.5 Temporary Access

**Existing field:** `TransportAccessAssignment.expiresAt` (already in schema)

**Missing:** Background job that checks expiry and deactivates

**Fix:**
```typescript
// Add to a scheduled task service:
@Cron('0 * * * *') // Every hour
async deactivateExpiredAccess() {
  await this.prisma.transportAccessAssignment.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: new Date() },
    },
    data: { isActive: false },
  });

  await this.prisma.accessScope.updateMany({
    where: {
      isActive: true,
      expiresAt: { lt: new Date() },
    },
    data: { isActive: false },
  });
}
```

### 0.6 Four-Eyes / Maker-Checker

**New model:**
```prisma
model ApprovalRequest {
  id             String         @id @default(uuid())
  companyId      String
  entityType     String         // RATE_CARD | VENDOR_INVOICE | ROLE_CHANGE | COMPANY_SETUP | SITE_CREATE | POLICY_CHANGE
  entityId       String
  action         String         // CREATE | UPDATE | DELETE | ACTIVATE | DEACTIVATE
  requestedBy    String
  approvedBy     String?
  status         ApprovalStatus @default(PENDING)
  reason         String?
  metadata       Json?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  expiresAt      DateTime?

  @@index([companyId, entityType, status])
  @@index([requestedBy])
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
  CANCELLED
}
```

**New service:** `ApprovalWorkflowService`
- `createRequest()` — creates approval request
- `approveRequest()` — approves with audit
- `rejectRequest()` — rejects with reason
- `getPendingRequests()` — list pending for user

**New guard:** `@RequireApproval({ entityType: 'RATE_CARD', action: 'UPDATE' })`

**Sensitive actions requiring approval:**
- Billing changes
- Vendor rate changes
- Role escalation
- Company creation
- Site creation
- Process changes
- Major transport-policy changes
- Financial adjustments

### 0.7 Fix TripState DB Enum

**Bug:** 7 states missing from Prisma `TripStatus` enum

**Fix:** Add to schema:
```prisma
enum TripStatus {
  SCHEDULED
  DISPATCHED
  DRIVER_ACCEPTED
  EN_ROUTE_TO_PICKUP
  ARRIVED_AT_PICKUP
  BOARDING
  IN_TRANSIT
  ARRIVED_AT_DROP
  COMPLETED
  CANCELLED
  DELAYED
  BREAKDOWN_REPORTED      // <-- NEW
  REPLACEMENT_SEARCH      // <-- NEW
  REPLACEMENT_ASSIGNED    // <-- NEW
  REPLACEMENT_EN_ROUTE    // <-- NEW
  PASSENGER_TRANSFER_IN_PROGRESS  // <-- NEW
  TRIP_RESUMED            // <-- NEW
  NO_SHOW                 // <-- NEW
}
```

**Migration required.**

---

## 3. PHASE 1: COMPANY ONBOARDING & LIFECYCLE (P0)

**Goal:** Super Admin can onboard a real company from zero.

**Effort:** ~2500 lines | 1 session

### 1.1 Company Setup Wizard

**Steps:** Create Company → Add Sites → Add Processes → Create Admin → Activate

**Company fields:**
- Company Name, Code, Legal Entity Name
- GSTIN, PAN
- Billing Model (COMPANY / SITE / PROCESS)
- Billing Cycle (MONTHLY / QUARTERLY)
- Timezone, Currency
- Primary Contact Name, Email, Phone
- Status (DRAFT → ACTIVE → SUSPENDED → ARCHIVED)

**Site fields:**
- Site Name, Code
- Address, City, State
- Latitude, Longitude
- Geofence Radius (meters)
- Timezone

**Process fields:**
- Process Name, Code
- Linked Site
- Shift groups
- Transport policies
- Billing allocation

**API Endpoints:**
```
POST   /platform-admin/companies              — Create company
GET    /platform-admin/companies              — List companies
GET    /platform-admin/companies/:id          — Get company details
PATCH  /platform-admin/companies/:id          — Update company
POST   /platform-admin/companies/:id/activate — Activate company
POST   /platform-admin/companies/:id/suspend  — Suspend company

POST   /platform-admin/companies/:id/sites    — Add site
GET    /platform-admin/companies/:id/sites    — List sites
PATCH  /platform-admin/sites/:id              — Update site
DELETE /platform-admin/sites/:id              — Delete site

POST   /platform-admin/companies/:id/processes — Add process
GET    /platform-admin/companies/:id/processes — List processes
PATCH  /platform-admin/processes/:id           — Update process
DELETE /platform-admin/processes/:id           — Delete process

POST   /platform-admin/companies/:id/admin    — Create company admin
```

**Frontend:** Wizard-style multi-step form with progress indicator

### 1.2 Employee Lifecycle

**Onboarding flow:**
1. Create user record
2. Assign role (UserRoleAssignment)
3. Assign scope (AccessScope)
4. Set transport eligibility
5. Set home location (lat/lng/address)
6. Send invitation email

**Offboarding flow:**
1. Deactivate user (status → INACTIVE)
2. Revoke all access scopes
3. Archive active trips
4. Release assigned vehicles
5. Log audit event

**Bulk import:**
- CSV/Excel upload
- Row-by-row validation
- Error report with line numbers
- Partial import (valid rows imported, invalid flagged)

**API Endpoints:**
```
POST   /platform-admin/employees              — Onboard employee
POST   /platform-admin/employees/bulk         — Bulk import
GET    /platform-admin/employees              — List employees
GET    /platform-admin/employees/:id          — Get employee details
PATCH  /platform-admin/employees/:id          — Update employee
POST   /platform-admin/employees/:id/offboard — Offboard employee
```

### 1.3 Location Change Request Workflow

**New model:**
```prisma
model LocationChangeRequest {
  id               String                 @id @default(uuid())
  companyId        String
  employeeId       String
  requestedBy      String
  oldLatitude      Float
  oldLongitude     Float
  oldAddress       String
  newLatitude      Float
  newLongitude     Float
  newAddress       String
  reason           String
  status           LocationChangeStatus   @default(PENDING)
  approvedBy       String?
  approvedAt       DateTime?
  rejectionReason  String?
  effectiveDate    DateTime?
  impactAnalysis   Json?
  distanceChange   Float?
  routeImpact      String?               // LOW | MODERATE | HIGH
  costImpact       Float?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  Employee         User?                 @relation(fields: [employeeId], references: [id])
  Company          Company               @relation(fields: [companyId], references: [id])

  @@index([companyId, status])
  @@index([employeeId])
}

model LocationHistory {
  id            String   @id @default(uuid())
  companyId     String
  employeeId    String
  latitude      Float
  longitude     Float
  address       String
  source        String   // INITIAL | APPROVED | MANUAL_OVERRIDE
  approvedBy    String?
  validFrom     DateTime
  validTo       DateTime?
  createdAt     DateTime @default(now())

  @@index([employeeId])
}

enum LocationChangeStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
  CANCELLED
}
```

**Approval screen shows:**
- Employee info, company, site, process
- Old location on map
- New location on map
- Distance between old/new
- Address for both
- GPS accuracy
- Request reason
- Impact analysis (distance change, route impact, cost impact, serviceability)
- Previous location history

**Buttons:** [Approve Change] [Reject] [Edit Pin] [Open Map]

**On approval:**
- Update employee pickup location
- Record in LocationHistory
- Set effective date (immediate / tomorrow / custom)
- Existing dispatched trips NOT auto-recalculated
- Future trips use new location

**Impact analysis before approval:**
- Distance from existing pickup
- Distance from employee's registered address
- Distance from site
- GPS accuracy
- Whether location falls inside restricted zone
- Whether location is serviceable
- Whether location is on existing route
- Whether change increases route cost

**Permissions:**
```
LOCATION_VIEW              — View employee locations
LOCATION_REQUEST          — Submit location change request
LOCATION_APPROVE          — Approve location changes
LOCATION_REJECT           — Reject location changes
LOCATION_MANUAL_UPDATE    — Manually update coordinates
LOCATION_OVERRIDE         — Override approved locations
LOCATION_HISTORY_VIEW     — View location change history
LOCATION_EXPORT           — Export location data
```

**Role mapping:**
| Role | View | Request | Approve | Manual Edit | Override |
|------|------|---------|---------|-------------|----------|
| Employee | Yes | Yes | No | No | No |
| Team Leader | Scoped | No | No | No | No |
| Manager | Scoped | No | No | No | No |
| Transport Coordinator | Yes | No | Yes | Yes | No |
| Transport Sub Admin | Yes | No | Yes | Yes | No |
| Transport Admin | Yes | No | Yes | Yes | Yes |
| Super Admin | Platform | No | Platform | Platform | Platform |

**Location tickets on Transport Dashboard:**
```
Location Requests
Request     Employee   Site    Process   Distance   Impact   Status
LCR-001     EMP001     BLR01   P1        1.2 km     Low      Pending
LCR-002     EMP044     BLR02   P3        8.7 km     High     Pending
```

**Filters:** Company, Site, Process, Status, Date, Impact, Approver, Employee ID

**Bulk actions:** Approve, Reject, Assign reviewer, Export Excel/PDF

**Integration with optimization engine:**
```
Employee changes pickup
        ↓
Approval
        ↓
New coordinates
        ↓
Route recalculation
        ↓
Existing route matching
        ↓
Possible clubbing
        ↓
Vehicle capacity check
        ↓
Female transport rules
        ↓
Driver assignment
        ↓
Cost impact
        ↓
Future trip optimization
```

---

## 4. PHASE 2: REAL AUTHORIZATION ENGINE (P0)

**Goal:** Every API call is properly authorized with role + permission + scope.

**Effort:** ~2000 lines | 1 session

### 2.1 Permission Composer Service

**New service:** `PermissionComposerService`

**Resolution chain:**
```
Role defaults
    ↓
Company scope (company-level overrides)
    ↓
Site scope (site-level overrides)
    ↓
Process scope (process-level overrides)
    ↓
Individual override (UserAccessOverride)
    ↓
EFFECTIVE PERMISSIONS
```

**Output structure:**
```json
{
  "userId": "usr_123",
  "email": "manager@acme.com",
  "companyId": "comp_456",
  "roles": ["MANAGER"],
  "scope": {
    "company": "ACME",
    "sites": ["BLR01", "BLR02"],
    "processes": ["P001", "P002"]
  },
  "permissions": [
    {
      "key": "booking.self",
      "enabled": true,
      "source": "ROLE",
      "sourceName": "MANAGER",
      "hierarchy": 4,
      "overridden": false
    },
    {
      "key": "booking.team",
      "enabled": true,
      "source": "ROLE",
      "sourceName": "MANAGER",
      "hierarchy": 4,
      "overridden": false
    },
    {
      "key": "booking.process",
      "enabled": false,
      "source": "ROLE",
      "sourceName": "MANAGER",
      "hierarchy": 4,
      "overridden": false
    },
    {
      "key": "dispatch.manage",
      "enabled": false,
      "source": "ROLE",
      "sourceName": "MANAGER",
      "hierarchy": 4,
      "overridden": false
    }
  ]
}
```

**API Endpoints:**
```
GET /permissions/compose/:userId     — Full permission tree with inheritance
GET /permissions/simulate/:userId    — Admin simulation with scope params
GET /permissions/deny-reason         — Explain why action was denied
```

### 2.2 Permission Simulator

**Existing:** `platform-admin.service.ts simulateAccess()` (partial)

**Enhance:**
- Show inheritance chain for each permission
- Show scope restrictions
- Show override sources
- Allow admin to select different site/process scope

**Frontend:** Admin selects user → sees effective permissions with "why" for each

### 2.3 "Why Was This Denied?" Engine

**New middleware:** `DenialExplanationMiddleware`

**On 403 response:**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "denial": {
    "required": "dispatch.manage",
    "yourRoles": ["MANAGER"],
    "yourScope": {
      "sites": ["BLR01"],
      "processes": ["P001"]
    },
    "reason": "Permission 'dispatch.manage' is not granted to role MANAGER",
    "suggestion": "Contact your administrator to request this permission"
  }
}
```

**Frontend:** Toast/modal showing structured denial explanation

### 2.4 Scope-Aware Query Interceptor

**Already created:** `scope-query.interceptor.ts` with helpers

**Wire into:** All list/query endpoints to auto-filter by user's scope

**Audit:** Log scope restrictions applied

---

## 5. PHASE 3: TRIP & PASSENGER LIFECYCLE (P0)

**Goal:** Complete trip lifecycle with passenger-level states.

**Effort:** ~2000 lines | 1 session

### 3.1 Fix Booking-Trip Sync

**Bug:** Booking status never updates after dispatch

**Fix:** On trip state transition, update linked booking status:
```typescript
// In transitionTripState():
if (trip.bookingId) {
  const bookingStatusMap: Record<string, string> = {
    'IN_TRANSIT': 'IN_PROGRESS',
    'COMPLETED': 'COMPLETED',
    'CANCELLED': 'CANCELLED',
    'NO_SHOW': 'NO_SHOW',
  };
  const newBookingStatus = bookingStatusMap[newState];
  if (newBookingStatus) {
    await this.prisma.booking.update({
      where: { id: trip.bookingId },
      data: { status: newBookingStatus },
    });
  }
}
```

### 3.2 Passenger State Machine

**New enum:**
```prisma
enum PassengerStatus {
  SCHEDULED
  EN_ROUTE_TO_PICKUP
  PICKED_UP
  IN_TRANSIT
  ALIGHTING
  DROPPED
  NO_SHOW
  CANCELLED
}
```

**Enhance TripPassenger:**
```prisma
model TripPassenger {
  id             String          @id @default(uuid())
  tripId         String
  userId         String
  boardingStatus PassengerStatus @default(SCHEDULED)
  seatNumber     Int?
  boardTime      DateTime?
  alightTime     DateTime?
  boardedImage   String?
  boardedImageAt DateTime?
  pickupLatitude  Float?
  pickupLongitude Float?
  dropLatitude   Float?
  dropLongitude  Float?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  Trip           Trip            @relation(fields: [tripId], references: [id])
  User           User            @relation(fields: [userId], references: [id])

  @@unique([tripId, userId])
}
```

**Passenger transitions:**
```
SCHEDULED → EN_ROUTE_TO_PICKUP (when driver en route)
EN_ROUTE_TO_PICKUP → PICKED_UP (when passenger boards)
PICKED_UP → IN_TRANSIT (when trip starts)
IN_TRANSIT → ALIGHTING (when approaching drop)
ALIGHTING → DROPPED (when passenger alights)
SCHEDULED → NO_SHOW (when driver marks no-show)
SCHEDULED → CANCELLED (when passenger cancels)
```

**API:**
```
POST /trips/:id/passengers/:userId/transition — Transition passenger state
GET  /trips/:id/passengers — List passengers with status
```

### 3.3 Boarding/Alighting Records

**Fix:** Wire `Boarding` model into trip service

**Add:** `ALIGHTED` boarding action
```prisma
enum BoardingAction {
  BOARD
  NO_SHOW
  ALIGHTED  // <-- NEW
}
```

**Flow:**
1. Driver arrives → `START_BOARDING`
2. Passenger boards → `BOARD` action with OTP/QR verification
3. Trip completes → `ALIGHTED` action for each boarded passenger

### 3.4 Vehicle Occupancy Tracking

**Wire:** `VehicleOccupancyLog` writes during boarding/trip

```typescript
// After each boarding/no-show:
await this.prisma.vehicleOccupancyLog.create({
  data: {
    tripId: trip.id,
    vehicleId: trip.vehicleId,
    companyId: trip.companyId,
    recordedAt: new Date(),
    maxCapacity: vehicle.maxCapacity,
    occupiedSeats: boardedCount,
    occupancyPercent: (boardedCount / vehicle.maxCapacity) * 100,
    isUnderutilized: (boardedCount / vehicle.maxCapacity) < 0.4,
    isOptimal: (boardedCount / vehicle.maxCapacity) >= 0.6 && (boardedCount / vehicle.maxCapacity) <= 0.85,
    isOverloaded: (boardedCount / vehicle.maxCapacity) > 1.0,
  },
});
```

### 3.5 Return Trip Auto-Creation

**Existing field:** `Booking.returnTrip`, `Booking.returnTime`

**Fix:** On trip completion:
```typescript
if (booking.returnTrip && booking.returnTime) {
  await this.prisma.booking.create({
    data: {
      // Swap pickup/drop
      pickupLatitude: booking.dropLatitude,
      pickupLongitude: booking.dropLongitude,
      pickupAddress: booking.dropAddress,
      dropLatitude: booking.pickupLatitude,
      dropLongitude: booking.pickupLongitude,
      dropAddress: booking.pickupAddress,
      date: booking.date,
      pickupTime: booking.returnTime,
      // Copy other fields
      requesterId: booking.requesterId,
      companyId: booking.companyId,
      serviceType: booking.serviceType,
      passengerCount: booking.passengerCount,
      type: booking.type,
      status: 'REQUESTED',
    },
  });
}
```

---

## 6. PHASE 4: DISPATCH & DRIVER ENGINE (P0)

**Goal:** Working dispatch with intelligent driver assignment.

**Effort:** ~2000 lines | 1 session

### 4.1 Fix Auto-Dispatch

**Bugs:**
- Writes to non-existent `bookingId` field on Trip
- Doesn't create `DispatchAssignment` or `DriverTrip` records
- Doesn't update vehicle/driver status

**Fix:**
```typescript
async autoDispatch(companyId: string, bookingId: string) {
  // ... find best driver ...

  // Create trip properly
  const trip = await this.prisma.trip.create({
    data: {
      tripCode: `TRIP-${Date.now()}`,
      status: 'DISPATCHED',
      type: booking.type,
      date: booking.date,
      scheduledPickupTime: booking.pickupTime,
      pickupLatitude: booking.pickupLatitude,
      pickupLongitude: booking.pickupLongitude,
      pickupAddress: booking.pickupAddress,
      dropLatitude: booking.dropLatitude,
      dropLongitude: booking.dropLongitude,
      dropAddress: booking.dropAddress,
      passengerCount: booking.passengerCount,
      companyId,
      vehicleId: best.vehicleId,
      driverId: best.driver.userId,
    },
  });

  // Create dispatch assignment
  await this.prisma.dispatchAssignment.create({
    data: {
      companyId,
      tripId: trip.id,
      driverId: best.driverId,
      vehicleId: best.vehicleId,
      assignedBy: 'system',
      type: 'ORIGINAL',
      status: 'ACTIVE',
    },
  });

  // Create driver-trip link
  await this.prisma.driverTrip.create({
    data: { tripId: trip.id, driverId: best.driverId },
  });

  // Update statuses
  await this.prisma.vehicle.update({
    where: { id: best.vehicleId },
    data: { status: 'ASSIGNED' },
  });
  await this.prisma.driverProfile.update({
    where: { id: best.driverId },
    data: { status: 'ON_TRIP' },
  });

  // Link booking to trip
  await this.prisma.booking.update({
    where: { id: bookingId },
    data: { tripId: trip.id, status: 'DISPATCHING' },
  });

  return trip;
}
```

### 4.2 Driver Assignment Rules Engine

**New service:** `DriverAssignmentService`

**Factors:**
| Factor | Weight | Description |
|--------|--------|-------------|
| Distance to pickup | 0.25 | Haversine distance |
| Route compatibility | 0.20 | Overlap with trip route |
| Shift match | 0.15 | Within driver's shift |
| Vehicle match | 0.15 | Correct vehicle type |
| Capacity | 0.10 | Available seats |
| Female safety | 0.10 | If passenger is female and policy requires |
| Favourite area | 0.05 | Driver preference (not restriction) |

**Scoring:**
```typescript
score = (distanceScore * 0.25) +
        (routeScore * 0.20) +
        (shiftScore * 0.15) +
        (vehicleScore * 0.15) +
        (capacityScore * 0.10) +
        (safetyScore * 0.10) +
        (favouriteScore * 0.05);
```

**Output:** Ranked list of candidate drivers with scores and reasons

**API:**
```
GET /dispatch/candidates/:bookingId — Get ranked driver candidates
POST /dispatch/auto/:bookingId — Auto-dispatch to best candidate
```

### 4.3 Driver State Machine

**States:**
```prisma
enum DriverStatus {
  ACTIVE      — Registered, can receive trips
  AVAILABLE   — Ready for dispatch
  ON_TRIP     — Currently on a trip
  BREAK       — On break
  SLEEPY      — Rest period
  OFFLINE     — Not available
  SUSPENDED   — Suspended by admin
}
```

**Transitions:**
```
ACTIVE → AVAILABLE (shift start)
AVAILABLE → ON_TRIP (trip assigned)
ON_TRIP → AVAILABLE (trip completed)
AVAILABLE → BREAK (manual/automatic)
BREAK → AVAILABLE (break end)
AVAILABLE → OFFLINE (shift end)
OFFLINE → AVAILABLE (shift start)
Any → SUSPENDED (admin action)
SUSPENDED → ACTIVE (admin action)
```

**API:**
```
POST /drivers/:id/state — Transition driver state
GET  /drivers/:id/state — Get current state with history
```

### 4.4 Driver Shift Management

**Existing:** `Shift` model in schema

**Add:**
- Shift templates (reusable configurations)
- Recurring shifts (weekly pattern)
- One-time shifts (specific date)
- Break scheduling (auto-break after X hours)
- Overtime tracking (hours beyond shift)

**API:**
```
POST   /shifts              — Create shift
GET    /shifts              — List shifts
PATCH  /shifts/:id          — Update shift
POST   /shifts/:id/assign   — Assign shift to driver
GET    /drivers/:id/shifts  — Get driver's shift schedule
```

---

## 7. PHASE 5: BILLING ENGINE (P0)

**Goal:** Real billing with vendor settlement.

**Effort:** ~2500 lines | 1 session

### 5.1 Unify Billing Services

**Problem:** Two parallel billing engines:
- `BillingService` (408 lines) — basic per-km only
- `BillingEngineService` (521 lines) — rich multi-model but not wired

**Fix:** Merge into single `BillingEngineService`:
- PER_KM, PER_TRIP, PER_PASSENGER, MONTHLY_FIXED, TIERED, DYNAMIC
- Night charges, emergency surcharge, guard charges
- Toll/parking, GST (CGST/SGST/IGST)
- Rate card versioning
- Budget vs actual
- Maker-checker approval
- Anomaly detection

**Wire:** Expose via controller endpoints

### 5.2 Contract/Rate Engine

**New model:**
```prisma
model VendorContract {
  id              String   @id @default(uuid())
  companyId       String
  vendorId        String
  contractNumber  String
  version         Int      @default(1)
  status          ContractStatus @default(DRAFT)
  contractStart   DateTime
  contractEnd     DateTime
  billingModel    String   // COMPANY | SITE | PROCESS
  paymentTerms    String   // NET_30 | NET_45 | NET_60
  currency        String   @default("INR")
  createdBy       String
  approvedBy      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  Vendor          Vendor   @relation(fields: [vendorId], references: [id])
  Company         Company  @relation(fields: [companyId], references: [id])
  RateCard        RateCard[]

  @@unique([companyId, vendorId, contractNumber])
  @@index([companyId, vendorId])
}

enum ContractStatus {
  DRAFT
  PENDING_APPROVAL
  ACTIVE
  EXPIRED
  TERMINATED
}
```

**Rate components:**
- Per trip, per km, per hour, per vehicle, per seat
- Minimum guaranteed trips
- Waiting charges (free minutes + per minute)
- Extra km charges
- Night charges (configurable hours)
- Airport charges
- Cancellation charges
- No-show rules
- Tax rules
- Vendor penalties
- SLA deductions

**Effective dates:**
```
Rate Card A: 01-Apr → 30-Jun
Rate Card B: 01-Jul → onwards
```

**API:**
```
POST   /billing/contracts           — Create contract
GET    /billing/contracts           — List contracts
PATCH  /billing/contracts/:id       — Update contract
POST   /billing/contracts/:id/approve — Approve contract

POST   /billing/rate-cards          — Create rate card
GET    /billing/rate-cards          — List rate cards
PATCH  /billing/rate-cards/:id      — Update rate card
GET    /billing/rate-cards/active   — Get active rate card for vehicle type
```

### 5.3 Vendor Invoice Lifecycle

**Flow:**
```
Trips completed
    ↓
Trip validation (GPS verify, duration check)
    ↓
Rate calculation (per contract rate card)
    ↓
Exceptions (night charges, tolls, waiting)
    ↓
Invoice generation
    ↓
Reconciliation (invoice vs trips vs rate card)
    ↓
Approval (four-eyes for large amounts)
    ↓
Payment status tracking
```

**API:**
```
POST   /billing/invoices/generate   — Generate invoice from trips
GET    /billing/invoices             — List invoices
GET    /billing/invoices/:id         — Get invoice details
POST   /billing/invoices/:id/approve — Approve invoice
POST   /billing/invoices/:id/pay     — Mark as paid
GET    /billing/invoices/:id/reconciliation — Get reconciliation details
```

### 5.4 Vendor Settlement

**Reconciliation:**
- GPS-verified KM vs invoiced KM
- Actual trip duration vs claimed
- Rate card verification
- Duplicate invoice detection

**Anomaly detection:**
- Invoice amount > 50% of previous period
- KM discrepancy > 20%
- Duplicate trip records
- Unusual driver hours

**API:**
```
GET  /billing/reconciliation/:vendorId — Get reconciliation report
POST /billing/reconciliation/:id/resolve — Resolve discrepancy
GET  /billing/anomalies/:vendorId — Get anomaly report
```

---

## 8. PHASE 6: NOTIFICATIONS (P1)

**Goal:** Real multi-channel notifications.

**Effort:** ~1500 lines | 1 session

### 6.1 Notification Service

**Channels:**
- In-app (existing `Notification` model)
- Push (Firebase Cloud Messaging)
- SMS (Twilio / AWS SNS / MSG91)
- Email (SendGrid / AWS SES)

**Event types:**
| Category | Events |
|----------|--------|
| Booking | Confirmed, Approved, Rejected, Cancelled |
| Dispatch | Cab Assigned, Driver Details, ETA |
| Trip | Started, Arrived, Completed, Delayed |
| Safety | SOS, Emergency, Breakdown |
| Driver | Trip Assigned, Route Changed, Shift Reminder |
| Admin | Driver Unavailable, Vehicle Breakdown, No-Show Spike, SLA Breach |
| Billing | Invoice Generated, Payment Due, Payment Received |

**Templates:** Configurable per company with variable interpolation

### 6.2 Notification Preferences

**Per user:**
```json
{
  "booking.confirmed": { "push": true, "sms": true, "email": false },
  "trip.started": { "push": true, "sms": false, "email": false },
  "safety.sos": { "push": true, "sms": true, "email": true }
}
```

**Per company:** Default notification config

**Quiet hours:** No notifications during configured hours (except SOS)

---

## 9. PHASE 7: POLICY ENGINE (P1)

**Goal:** Centralized policy management with scope.

**Effort:** ~1500 lines | 1 session

### 7.1 Policy Service

**Policies:**
| Policy | Scope | Default |
|--------|-------|---------|
| Booking cutoff (minutes before pickup) | Company/Site/Process | 120 |
| Cancellation cutoff | Company/Site/Process | 60 |
| No-show grace period | Company/Site/Process | 10 |
| Female safety required | Company/Site/Process | true |
| Max travel time (minutes) | Company/Site/Process | 75 |
| Max route deviation (km) | Company/Site/Process | 5 |
| Vehicle capacity | Company/Site | 6 |
| Advance booking (days) | Company/Site/Process | 30 |
| Recurring booking allowed | Company/Site/Process | true |
| Clubbing allowed | Company/Site/Process | true |
| Emergency booking allowed | Company/Site/Process | true |

**Scope cascade:** Company → Site → Process → Shift (more specific overrides less specific)

**API:**
```
POST   /policies              — Create policy
GET    /policies              — List policies
PATCH  /policies/:id          — Update policy
GET    /policies/resolve      — Get effective policy for scope
```

### 7.2 Policy Enforcement

**Booking creation:** Check advance booking, cutoff, eligibility
**Dispatch:** Check vehicle capacity, driver rules, female safety
**Trip:** Check max travel time, route deviation
**Cancellation:** Check cutoff, calculate penalty

---

## 10. PHASE 8: SAFETY & EMERGENCY (P1)

**Goal:** Real safety system.

**Effort:** ~1500 lines | 1 session

### 10.1 SOS System

**Flow:**
```
Driver/Employee/Guard triggers SOS
    ↓
Control Room alert (push + SMS + sound)
    ↓
Live GPS tracking activated
    ↓
Trip details displayed
    ↓
Passenger list shown
    ↓
Driver details shown
    ↓
Escalation chain (Level 1 → Level 2 → Level 3)
    ↓
Incident record created
```

**API:**
```
POST /sos/trigger — Trigger SOS
GET  /sos/active — Get active SOS alerts
POST /sos/respond — Respond to SOS
POST /sos/escalate — Escalate SOS
```

### 10.2 Safe Reach

**Flow:**
```
Trip completed
    ↓
Employee dropped at destination
    ↓
Geofence check at home location
    ↓
"I'm safely home" confirmation prompt
    ↓
If confirmed → Safe reach logged
    ↓
If not confirmed within X minutes → Alert emergency contact
```

### 10.3 Incident Case File

**Auto-assemble:**
- Employee details
- Driver details
- Vehicle details
- Trip details
- Route details
- GPS timeline
- Boarding records
- SOS events
- Operator actions
- Time sequence
- Policy version
- Approvals

**API:**
```
GET /incidents/:id/case-file — Get assembled case file
POST /incidents/:id/case-file/export — Export as PDF
```

---

## 11. PHASE 9: VENDOR COMPLIANCE (P1)

**Goal:** Automated compliance monitoring.

**Effort:** ~1000 lines | 1 session

### 11.1 Document Expiry Monitor

**Documents:**
- Driving licence
- Vehicle registration
- Insurance
- Permit
- Fitness certificate
- Pollution certificate (PUC)
- Background verification

**Alerts:**
- 30 days before expiry → Warning
- 15 days before expiry → Urgent
- 7 days before expiry → Critical
- Expired → Blocked

**Enforcement:**
- Block assignment of non-compliant driver
- Block assignment of non-compliant vehicle
- Alert transport admin

**API:**
```
GET  /compliance/expiring — Get expiring documents
POST /compliance/renew — Record renewal
GET  /compliance/status — Get compliance status by vendor
```

---

## 12. PHASE 10: INTELLIGENCE LAYER (P2)

**Goal:** Decision engine, not just booking system.

**Effort:** ~2000 lines | 1 session

### 12.1 Transport Digital Twin

**What-if simulator:**
```
Change: Move Process P001 from 02:00 to 02:30

Current:
  Vehicles: 18
  Trips: 84
  Occupancy: 61%
  Cost: ₹X

Scenario:
  Vehicles: 15
  Trips: 78
  Occupancy: 73%
  Cost: ₹Y

Expected saving: ₹Z
Female safety impact: NONE
Average employee ride time: +4 min
```

**API:**
```
POST /simulations/create — Create simulation scenario
GET  /simulations/:id/results — Get simulation results
POST /simulations/:id/apply — Apply scenario (requires approval)
```

### 12.2 Cost Leak Detector

**Detects:**
- Idle vehicles (assigned but not moving)
- Empty seats (low occupancy trips)
- Duplicate trips (same route, same time)
- Repeated cancellations
- High dead KM (empty return trips)
- Long detours (actual vs planned route)
- Excess vendor charges
- Incorrect rates
- Billing mismatches
- Unusual driver hours
- Repeated no-shows
- Underused shuttles

**Output:** Evidence + estimated monthly leakage

**API:**
```
GET /analytics/cost-leaks — Get cost leak report
GET /analytics/cost-leaks/:id/evidence — Get evidence for specific leak
```

### 12.3 Vendor Truth Engine

**Compare:**
- Contracted rate vs actual rate
- GPS-verified KM vs invoiced KM
- Actual trip duration vs claimed
- Vehicle utilization vs reported
- Driver availability vs SLA
- Invoice variance

**Output:**
```
Vendor invoice claims: 1,480 KM
GPS-verifiable KM: 1,211 KM
Potential discrepancy: 269 KM
Amount at risk: ₹X
```

**API:**
```
GET /analytics/vendor-truth/:vendorId — Get vendor truth report
GET /analytics/vendor-truth/:vendorId/discrepancies — Get discrepancies
```

### 12.4 Predictive Analytics

**No-show prediction:**
- Last 8 scheduled trips: 5 no-shows, 2 late cancellations
- Historical attendance pattern
- Probability: 72%
- Recommendation: "Confirm employee before dispatch"

**Breakdown risk:**
- Vehicle age, maintenance history, trip patterns
- Risk score: LOW / MEDIUM / HIGH

**SLA risk:**
- Current trip state, driver, route, traffic
- Risk score with factors

**API:**
```
GET /analytics/predictions/no-show/:employeeId — No-show probability
GET /analytics/predictions/breakdown/:vehicleId — Breakdown risk
GET /analytics/predictions/sla/:tripId — SLA risk
```

### 12.5 Unused Capacity Exchange

**Detect:** Cab has empty seats + compatible booking nearby

**Recommend:**
```
3 seats available in Cab 103

Compatible demand:
  EMP1021 — Route match 94%, +3 min deviation, ₹740 saving
  EMP1034 — Route match 87%, +5 min deviation, ₹620 saving
  EMP1092 — Route match 91%, +2 min deviation, ₹580 saving
```

**API:**
```
GET /optimization/capacity-opportunities — Get capacity opportunities
POST /optimization/accept/:opportunityId — Accept recommendation
```

### 12.6 Explainable Optimization

**Every recommendation shows WHY:**
```
Recommendation: Vehicle V210

Why:
  + Driver 3.2 km from pickup
  + Same process (P001)
  + Same shift (02:00-10:00)
  + Available (5 seats)
  + Female safety compliant
  + Route overlap 87%

Rejected alternatives:
  V102 — Capacity exceeded (0 seats)
  V108 — Driver rest violation
  V121 — 14 km away (too far)
```

**API:**
```
GET /optimization/recommendations/:tripId — Get recommendations with explanations
```

### 12.7 Location Change Intelligence

**On approval:**
```
Distance change: +2.7 km
Current route impact: +4 min
Extra monthly cost: ₹1,870
Existing route match: YES
Nearest nodal point: 410 m
Safety risk: LOW
Recommendation: Approve
```

### 12.8 Employee Location Confidence Score

**Factors:**
- GPS precision
- Repeated employee GPS confirmations
- Historical pickup success
- Address consistency
- Geocoding confidence
- Driver feedback
- Route feasibility
- Frequency of manual corrections

**Score:** 0-100
- 92-100: Trusted
- 75-91: Good
- 50-74: Review
- <50: Needs verification

### 12.9 Route Memory

**Store per route:**
- Historical travel times
- Typical traffic patterns
- Best pickup sequence
- Frequent delay locations
- Employees frequently absent
- Driver feedback
- Route deviation history

**Use:** Improve future routing based on actual data

### 12.10 Trip Reliability Score

**Factors:**
- Driver availability history
- Vehicle condition
- Route reliability
- Historical punctuality
- GPS freshness
- Pickup density
- Weather/traffic (if integrated)
- Driver work/rest state
- Route deviation history
- Passenger count

**Output:** 0-100 score with risk level (HIGH/WATCH/HEALTHY)

---

## 13. PHASE 11: CXO & ANALYTICS (P2)

**Goal:** Real management intelligence.

**Effort:** ~1500 lines | 1 session

### 13.1 CXO Drill-Down

**Flow:**
```
₹2.4 Cr transport spend
    ↓
Company (ACME: ₹1.2 Cr, XYZ: ₹80L, ABC: ₹40L)
    ↓
Site (BLR01: ₹60L, BLR02: ₹40L, BLR03: ₹20L)
    ↓
Process (P001: ₹30L, P002: ₹20L, P003: ₹10L)
    ↓
Vendor (Vendor A: ₹50L, Vendor B: ₹30L)
    ↓
Trip (individual trip costs)
```

**API:**
```
GET /analytics/cxo/drill-down?level=company&id=comp_123
GET /analytics/cxo/drill-down?level=site&id=site_456
GET /analytics/cxo/drill-down?level=process&id=proc_789
```

### 13.2 Transport Health Score

**Per company/site/process:**
```
Transport Health: 91/100

Breakdown:
  Safety:          96
  Reliability:     89
  Utilization:     78
  Cost efficiency: 93
  Vendor quality:  94
  GPS health:      97
  Employee exp.:   88
```

**API:**
```
GET /analytics/health-score/:entityType/:entityId
```

### 13.3 Operational Blast Radius

**Before any change:**
```
Change: Move Process P001 from Shift A to Shift B

Impact Preview:
  Employees affected:     842
  Trips affected:         216
  Vehicles affected:       38
  Drivers affected:        41
  Vendors affected:         4
  Estimated cost change: +₹72K
  Bookings requiring action: 119
  Safety rules impacted:     3
```

**API:**
```
POST /analytics/blast-radius — Get impact preview
```

### 13.4 Carbon Intelligence

**Metrics:**
- CO2 per employee
- CO2 per trip
- CO2 per km
- EV utilization
- ICE utilization
- Shared-trip percentage
- Empty-seat emissions

**Optimization:**
```
Clubbing these 83 trips could reduce emissions by 12.4 tonnes CO2/month
```

**API:**
```
GET /analytics/carbon — Get carbon metrics
GET /analytics/carbon/optimization — Get optimization opportunities
```

### 13.5 SLA Contract Management

**Define per company/site/process:**
- Pickup punctuality: ≥95%
- No-show response: <5 min
- Emergency acknowledgement: <30 sec
- GPS freshness: <15 sec
- Maximum ride time: 75 min

**Track:** Actual vs target

**Alert:** SLA breach

**API:**
```
GET /analytics/sla-compliance — Get SLA compliance
GET /analytics/sla-compliance/breaches — Get breaches
```

---

## 14. PHASE 12: TESTING (P0 - PRODUCTION GATE)

**Goal:** Automated test suite covering critical paths.

**Effort:** ~1500 lines | 1 session

### 14.1 Integration Tests

**Auth flow:**
```typescript
describe('Authorization', () => {
  it('should enforce scope isolation', async () => {
    // User A (BLR01 scope) cannot access BLR02 data
  });
  it('should enforce permission checks', async () => {
    // MANAGER cannot access dispatch.manage
  });
  it('should enforce temporary access expiry', async () => {
    // Expired access is rejected
  });
  it('should enforce four-eyes approval', async () => {
    // Rate card change requires approval
  });
});
```

**Booking flow:**
```typescript
describe('Booking Lifecycle', () => {
  it('should create booking → approve → dispatch → trip → complete', async () => {
    // Full happy path
  });
  it('should reject booking outside scope', async () => {
    // Scope enforcement
  });
  it('should enforce policy rules', async () => {
    // Booking cutoff, cancellation cutoff
  });
});
```

**Billing flow:**
```typescript
describe('Billing', () => {
  it('should calculate trip cost from rate card', async () => {
    // Rate card application
  });
  it('should generate vendor invoice', async () => {
    // Invoice generation from trips
  });
  it('should detect billing anomalies', async () => {
    // Duplicate invoice, rate discrepancy
  });
});
```

### 14.2 E2E Tests

**Full chain:**
```
SUPER_ADMIN
 → Create company
 → Create site
 → Create process
 → Create Transport Admin
 → Assign scope

Transport Admin
 → Add employee
 → Create shift
 → Create booking
 → Assign vehicle
 → Assign driver
 → Dispatch

Driver
 → Go active
 → Receive trip
 → Navigate
 → OTP boarding
 → Complete trip

Finance
 → Generate billing
 → Reconcile
 → Export report
```

**Framework:** Playwright or Cypress

### 14.3 Security Tests

- RBAC bypass attempts (manipulate JWT)
- Tenant isolation (cross-company data access)
- Rate limiting (brute force)
- Input validation (SQL injection, XSS)

---

## 15. PHASE 13: INFRASTRUCTURE (P0 - PRODUCTION GATE)

### 15.1 Docker

**Dockerfile (API):**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY packages/database/package.json ./packages/database/
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/moveflow
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [db, redis]

  web:
    build: ./apps/web
    ports: ["3001:3000"]
    environment:
      API_URL: http://api:3000

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: moveflow
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes: ["pgdata:/var/lib/postgresql/data"]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

### 15.2 Environment Config

**Production .env:**
```
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# JWT
JWT_SECRET=...
SUPABASE_JWT_SECRET=...

# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Maps
GOOGLE_MAPS_API_KEY=...
MAPBOX_ACCESS_TOKEN=...

# Notifications
FCM_SERVER_KEY=...
TWILIO_SID=...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=...

# App
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://app.navira.com
```

### 15.3 CI/CD

**GitHub Actions:**
```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: # deployment script
```

### 15.4 Database

- All Prisma migrations applied
- Daily automated backups (pg_dump)
- Tested restore procedure
- Point-in-time recovery

### 15.5 Observability

**Logging:** Winston/Pino structured logging
**Metrics:** API latency, error rate, DB health, Redis health
**Health checks:** `GET /health` with dependency checks
**Alerting:** PagerDuty/Slack integration

---

## 16. PRODUCTION READINESS GATE

| Area | Gate | Status |
|------|------|--------|
| RBAC | 100% | Authorization engine fully functional |
| Tenant isolation | 100% | Cross-company access blocked |
| Company onboarding | 100% | Full wizard working |
| Employee lifecycle | 100% | Onboard → Work → Offboard |
| Booking | 100% | Create → Approve → Dispatch → Complete |
| Dispatch | 100% | Auto + Manual with rules engine |
| Driver app | 100% | State machine + shift management |
| GPS | 100% | Real-time ingestion + WebSocket |
| Routes | 100% | CRUD + optimization |
| Optimization | 100% | Seat + route + capacity |
| Billing | 100% | Full engine + vendor settlement |
| Vendor management | 100% | Unified model + contracts |
| Notifications | 100% | Multi-channel + preferences |
| Security | 100% | MFA + rate limiting + CSRF |
| Audit | 100% | Every sensitive action logged |
| Reports | 100% | All 28 types implemented |
| Testing | 100% | Integration + E2E + Security |
| Monitoring | 100% | Logs + metrics + alerting |
| Backup/restore | Tested | Daily backup + tested restore |
| Production deployment | Tested | Docker + CI/CD + rolling deploy |

**Rule:** Every button must perform a real operation. No "Page Under Development." No fake metrics. No simulated data unless explicitly labeled Demo.

---

## 17. UNIQUE DIFFERENTIATORS

What makes this difficult for competitors to copy:

1. **Permission Composer** — Role + ON/OFF + Scope + Override chain with inheritance visualization
2. **"Why?" Engine** — Every denial explains exactly what's missing
3. **Transport Digital Twin** — What-if simulation before operational changes
4. **Cost Leak Detector** — Automated evidence-based waste identification
5. **Vendor Truth Engine** — GPS-verified vs invoiced discrepancy detection
6. **Location → Route → Cost → Safety closed loop** — System learns from outcomes
7. **Operational Blast Radius** — Impact preview before any administrative change
8. **Explainable Optimization** — Every recommendation shows WHY with rejected alternatives
9. **Employee Location Confidence Score** — Reduces bad pickup points
10. **Route Memory** — Routing improves based on actual operational data

---

## 18. SESSION-BY-SESSION EXECUTION PLAN

| Session | Command | Phase | Lines | Focus |
|---------|---------|-------|-------|-------|
| 1 | Fix authorization engine | 0 | ~2000 | accessScopes, UserAccessOverride, guards, PermissionComposer |
| 2 | Build company onboarding wizard | 1 | ~2500 | Company/Site/Process CRUD, employee lifecycle, location changes |
| 3 | Fix trip & passenger lifecycle | 3 | ~2000 | Booking sync, passenger states, boarding, occupancy |
| 4 | Fix dispatch & driver engine | 4 | ~2000 | Auto-dispatch fix, assignment rules, driver states, shifts |
| 5 | Unify billing engine | 5 | ~2500 | Merge billing services, contracts, vendor invoices |
| 6 | Build policy engine & notifications | 6+7 | ~1500 | Policy CRUD, enforcement, multi-channel notifications |
| 7 | Build safety & compliance | 8+9 | ~1500 | SOS, safe reach, incident case, document expiry |
| 8 | Build intelligence layer | 10 | ~2000 | Digital twin, cost leaks, vendor truth, predictions |
| 9 | Build CXO analytics | 11 | ~1500 | Drill-down, health score, blast radius, carbon |
| 10 | Write tests & infrastructure | 12+13 | ~1500 | Integration tests, Docker, CI/CD |

**Total: ~20,000 lines across 10 sessions**

---

*This plan should be executed sequentially. Each phase builds on the previous. Do not skip Phase 0 — everything depends on a working authorization engine.*
