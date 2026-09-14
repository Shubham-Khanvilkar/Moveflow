# PLAN-4: PRODUCTION CONVERSION - FROM DEMO TO REAL

> **Date:** September 7, 2026
> **Status:** Execution Plan
> **Scope:** Convert all demo/mock/placeholder components to production-ready real implementations

---

## 1. AUDIT SUMMARY

### Backend Status
- **264 routes** across 29 controllers - ALL have real DB implementations
- Pattern: every service returns mock data when Prisma is disconnected (dev mode fallback)
- **5 broken/incomplete implementations:**
  1. `enterprise-ops.service.ts:418` - `autoSearchReplacement()` hardcoded stub
  2. `no-show-evidence.service.ts:296` - GPS checks hardcoded to true
  3. `release-management.service.ts` - deploy/verify don't actually deploy
  4. `driver-preferences.service.ts` - dispatch scoring sub-scores hardcoded
  5. `notification-channels.service.ts` - 4 TODOs for external delivery (FCM, SMS, Email, WhatsApp)

### Frontend Status
- **25 REAL** components with full API integration
- **15 PARTIAL** components (some APIs, some hardcoded)
- **3 MOCK** components (SettingsPage, AuditorDashboard, ComplianceDashboard)
- **1 EMPTY** component (ControlRoomPageV2 - just counter demo)
- **Missing forms:** Vendor creation, Guard creation, Driver document upload

---

## 2. EXECUTION PHASES

### Phase 1: Fix Broken Backend Services (5 files)
### Phase 2: Fix MOCK Frontend Components (4 components)
### Phase 3: Add Missing Forms (3 forms)
### Phase 4: Fix PARTIAL Frontend Components (15 components)
### Phase 5: TypeScript compilation + smoke test

---

## 3. DETAILED CHANGES

### Phase 1: Backend Fixes
1. `enterprise-ops.service.ts` - Replace hardcoded autoSearchReplacement with real DB query
2. `no-show-evidence.service.ts` - Add GPS distance check using trip location data
3. `driver-preferences.service.ts` - Calculate real compliance/capacity/workload scores
4. `notification-channels.service.ts` - Log external delivery attempts (IN_APP works, others graceful degradation)
5. `release-management.service.ts` - Add deployment status validation

### Phase 2: Mock Components → Real
1. `GuardDashboard.tsx` - Fetch real data from `/api/dashboard/kpi` and `/enterprise/boarding`
2. `SettingsPage.tsx` - Load company data from API, save on submit
3. `CompaniesPage.tsx` - Full CRUD with create/edit/delete modals
4. `EmployeeHomePage.tsx` - Fetch real KPIs from `/api/dashboard/kpi`

### Phase 3: Missing Forms
1. `VendorCreateModal.tsx` - Vendor creation form (name, contact, fleet size, contract)
2. `GuardCreateModal.tsx` - Guard creation form (name, phone, site assignment, shift)
3. `DriverDocumentUpload.tsx` - License image, RC, insurance upload flow

### Phase 4: Partial Components → Full
- All 15 partial components need real API wiring
