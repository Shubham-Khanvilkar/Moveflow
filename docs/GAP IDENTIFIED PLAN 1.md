# GAP IDENTIFIED PLAN 1 — Complete Execution Roadmap

**Created:** Sep 9, 2026
**Status:** Master gap analysis — every sub-task from Plans 5–16 audited against codebase
**Total Estimated Effort:** 555–762 hours remaining

---

## Executive Summary

Plans 5–16 were scaffolded: services were created, files were written, some tests pass. But a deep audit reveals **critical wiring gaps** — services exist but are NOT registered in NestJS modules, tests cover only 14/45+ modules, frontend has 34 partial pages, infrastructure is untested, and security guards are not applied everywhere. This document lists EVERY remaining gap with exact file paths and acceptance criteria.

---

# PART 1: MODULE REGISTRATION GAPS (CRITICAL — Runtime Will Fail)

**These services exist as files but are NOT injected into any NestJS module. They cannot be used at runtime.**

## 1.1 SubscriptionService — Not Registered

- **File:** `apps/api-gateway/src/modules/billing/subscription.service.ts`
- **Missing from:** `apps/api-gateway/src/modules/billing/billing.module.ts` `providers` array
- **Fix:** Add `SubscriptionService` to `billing.module.ts` providers AND exports
- **Impact:** SaaS subscription management completely non-functional

## 1.2 WebhookDispatcherService — Not Registered

- **File:** `apps/api-gateway/src/modules/notifications/webhook-dispatcher.service.ts`
- **Missing from:** `apps/api-gateway/src/modules/notifications/notification.module.ts` `providers` array
- **Fix:** Add `WebhookDispatcherService` to notification module providers AND exports
- **Impact:** Webhook delivery completely non-functional

## 1.3 BulkNotificationService — Not Registered

- **File:** `apps/api-gateway/src/modules/notifications/bulk-notification.service.ts`
- **Missing from:** `apps/api-gateway/src/modules/notifications/notification.module.ts` `providers` array
- **Fix:** Add `BulkNotificationService` to notification module providers AND exports
- **Impact:** Bulk notifications non-functional

## 1.4 SSOService — Not Registered

- **File:** `apps/api-gateway/src/modules/security/sso.service.ts`
- **Missing from:** `apps/api-gateway/src/modules/security/security.module.ts` `providers` array
- **Fix:** Add `SSOService` to security module providers AND exports
- **Impact:** SSO authentication non-functional

## 1.5 EnhancedTrackingService — No Module Exists

- **File:** `apps/api-gateway/src/modules/tracking/enhanced-tracking.service.ts`
- **Missing:** `apps/api-gateway/src/modules/tracking/tracking.module.ts` (entire file missing)
- **Fix:** Create `tracking.module.ts` with providers: `[EnhancedTrackingService]`, imports: `[DatabaseModule, NotificationsModule]`; add to `app.module.ts` imports
- **Impact:** Geofence detection and route deviation during GPS tracking non-functional

## 1.6 ReportEngine + ScheduledReportExecutor — No Module Exists

- **Files:**
  - `apps/api-gateway/src/modules/reports/report-engine.service.ts`
  - `apps/api-gateway/src/modules/reports/scheduled-report-executor.service.ts`
- **Missing:** `apps/api-gateway/src/modules/reports/reports.module.ts` (entire file missing)
- **Fix:** Create `reports.module.ts` with providers: `[ReportEngine, ScheduledReportExecutor]`, imports: `[DatabaseModule, NotificationsModule]`; add to `app.module.ts` imports
- **Impact:** All report generation and scheduled reports non-functional

## 1.7 KPIAggregationService — Not Registered

- **File:** `apps/api-gateway/src/modules/dashboard/kpi-aggregation.service.ts`
- **Missing from:** `apps/api-gateway/src/modules/dashboard/dashboard.module.ts` `providers` array
- **Fix:** Add `KPIAggregationService` to dashboard module providers AND exports
- **Impact:** Dashboard KPI aggregation returns empty data

## 1.8 Common Utilities — Not Registered in Any Module

| Service | File | Missing From |
|---------|------|-------------|
| `HealthCheckService` | `common/health-check.service.ts` | `health.module.ts` (may need to add) |
| `AlertingService` | `common/alerting.service.ts` | No module registration found |
| `PIIMaskingService` | `common/pii-masking.ts` | Singleton only, not in NestJS DI |
| `RateLimiterService` | `common/rate-limiter.ts` | Singleton only, not in NestJS DI |
| `AuditLoggingService` | `common/audit-logging.ts` | No module registration found |
| `TemplateEngine` | `common/template-engine.ts` | No module registration found |
| `TwilioSmsProvider` | `common/sms-provider.ts` | No module registration found |
| `GoogleMapsProvider` | `common/maps/google-maps.provider.ts` | No module registration found |
| `GeofenceEngine` | `common/maps/geofence-engine.ts` | No module registration found |
| `RouteDeviationDetector` | `common/maps/route-deviation.ts` | No module registration found |
| `StructuredLogger` | `common/structured-logger.ts` | Singleton only |

**Fix:** Create `common/common-utilities.module.ts` as a `Global` module exporting all common services; import in `app.module.ts`

## 1.9 ValidationPipe — Not Applied Globally

- **File:** `apps/api-gateway/src/main.ts`
- **Gap:** `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` may not be configured globally
- **Fix:** Add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` to `main.ts`
- **Impact:** No input validation on any endpoint

---

# PART 2: PLAN 5 — MVP OPERATIONAL CORE GAPS

## 2.1 B1: Database Foundation

| Sub-task | Status | Gap |
|----------|--------|-----|
| B1.1 Generate migration | DONE | ✅ Migrations baselined |
| B1.2 Fix seed enum mismatches | DONE | ✅ Seed runs clean |
| B1.3 Run clean seed | DONE | ✅ 28 users, 36 roles, 15 bookings, 9 trips |

## 2.2 B2: Operational Seed Data

| Sub-task | Status | Gap |
|----------|--------|-----|
| B2.1 Rate Cards (4 cards) | DONE | ✅ 4 rate cards seeded |
| B2.2 Bookings (15) | DONE | ✅ 15 bookings seeded |
| B2.3 Trips (9) | DONE | ✅ 9 trips seeded |
| B2.4 TripPassenger records | MISSING | **0 records** — need 15+ boarding status lifecycle records |
| B2.5 VendorContracts | MISSING | **0 records** — need 2 contracts (Acme Transport, Pune Mobility) |
| B2.6 EmployeeAddresses | PARTIAL | Only some employees have addresses — need 2-3 per employee |
| B2.7 ComplianceDocuments | MISSING | **0 records** — need per-driver compliance docs |
| B2.8 GPS history (100+ points) | MISSING | **0 records** — need 20-30 points per completed trip |
| B2.9 AuditEvents for seeded data | MISSING | **0 records** — need booking.created, trip.dispatched events |

**Effort:** 3-4 hours

## 2.3 B3: Core Backend Wiring

| Sub-task | Status | Gap |
|----------|--------|-----|
| B3.1 Dashboard KPIs — Real DB queries | PARTIAL | KPIAggregationService exists but NOT registered in module; returns basic counts only |
| B3.2 Dispatch engine — Real driver assignment | EXISTS | `dispatch-engine.service.ts` exists (pre-existing) — verify end-to-end flow works |
| B3.3 Trip state machine enforcement | EXISTS | `trip.service.ts` exists — verify all 18 states and 20 transitions enforced |
| B3.4 Full booking→trip lifecycle | NEEDS TESTING | No integration test proving the full chain works end-to-end |
| B3.5 Billing — Rate card + cost calculation | EXISTS | `billing.service.ts` exists — verify night multiplier and minimum fare logic |
| B3.6 Access scope enforcement | DONE | ✅ AccessScopeGuard applied to 15 controllers |

**Remaining work:**
- Wire KPIAggregationService into dashboard module
- Write integration test for full booking→dispatch→trip→complete→cost flow
- Verify billing cost calculation includes night multiplier

**Effort:** 4-6 hours

## 2.4 B4: Frontend Booking Flow

| Page | Status | Gap |
|------|--------|-----|
| BookTransportPage.tsx | PARTIAL | Needs real API wiring, loading/error states |
| BookingsPage.tsx | PARTIAL | Status filter tabs may use mock data |
| TripsPage.tsx | PARTIAL | Trip progress indicator may be placeholder |
| DispatchPage.tsx | PARTIAL | Dispatch button may not call real API |
| ApprovalsPage.tsx | PARTIAL | Approve/reject buttons may not work |
| DriversPage.tsx | PARTIAL | Availability toggle may not call API |
| VehiclesPage.tsx | PARTIAL | Status badges may be hardcoded |
| RoutesPage.tsx | PARTIAL | "New Route" form may not submit |
| EmployeeTransportMasterPage.tsx | PARTIAL | CRUD may not be wired |
| ImportExportPage.tsx | PARTIAL | CSV export may not work |

**34 of 74 frontend pages are partial** — need real API wiring, loading states, error handling, empty states.

**Effort:** 30-40 hours

## 2.5 B5: Frontend Fleet & Driver

| Page | Status | Gap |
|------|--------|-----|
| DriverHomePage.tsx | PARTIAL | Availability toggle not wired |
| BoardingPage.tsx | PARTIAL | Boarding/alighting not wired |
| NoShowPage.tsx | PARTIAL | Evidence API not wired |
| VehicleCheckPage.tsx | PARTIAL | Inspection checklist not wired |
| VehicleQRPage.tsx | PARTIAL | QR generation not wired |
| NodalPointsPage.tsx | PARTIAL | CRUD + map not wired |
| EmployeeAddressesPage.tsx | PARTIAL | Address CRUD not wired |
| EmployeeSchedulingPage.tsx | PARTIAL | Shift assignment not wired |
| TeamsPage.tsx | PARTIAL | Team CRUD not wired |
| LocationChangeRequestsPage.tsx | PARTIAL | Workflow not wired |

**Effort:** 15-20 hours

## 2.6 B6: Frontend Dashboards

| Dashboard | Status | Gap |
|-----------|--------|-----|
| OwnerManagementPage.tsx | PARTIAL | Stats may be hardcoded |
| SuperAdminPage.tsx | PARTIAL | Stats may be hardcoded |
| DirectorDashboard.tsx | PARTIAL | KPI may be hardcoded |
| CoordinatorDashboard.tsx | PARTIAL | Summary may be hardcoded |
| ManagerDashboard.tsx | PARTIAL | KPI may be hardcoded |
| SupportDashboard.tsx | PARTIAL | KPI may be hardcoded |
| VendorDashboard.tsx | PARTIAL | Dashboard may be hardcoded |
| GuardDashboard.tsx | PARTIAL | KPI may be hardcoded |
| AuditLogPage.tsx | PARTIAL | Audit data may not load |
| SettingsPage.tsx | PARTIAL | Settings may not save |
| PoliciesPage.tsx | PARTIAL | Policies may not load |
| CompliancePage.tsx | PARTIAL | Compliance may not load |
| InvoicesPage.tsx | PARTIAL | Invoices may not load |
| ReportsPage.tsx | PARTIAL | Reports may not generate |
| AnalyticsPage.tsx | PARTIAL | Analytics may be mock |
| CXOIntelligencePage.tsx | PARTIAL | Intelligence may be mock |
| PredictiveAnalyticsPage.tsx | PARTIAL | Predictions may be mock |

**Effort:** 15-20 hours

## 2.7 B7: GPS Live Tracking

| Sub-task | Status | Gap |
|----------|--------|-----|
| B7.1 GPS ingestion endpoint | EXISTS | ✅ `gps-tracking.controller.ts` exists |
| B7.2 WebSocket broadcast | EXISTS | ✅ `events.gateway.ts` exists |
| B7.3 Web MapboxTracker | EXISTS | ✅ `MapboxTracker.tsx` exists |
| B7.4 Control room real data | PARTIAL | `ControlRoomPageV2.tsx` may still use fabricated data |
| B7.5 Mobile GPS | EXISTS | ✅ Mobile GPS service exists |
| **NEW: Geofence detection** | MISSING | `EnhancedTrackingService` exists but NOT registered in module |
| **NEW: Route deviation** | MISSING | `RouteDeviationDetector` exists but NOT registered |

**Effort:** 4-6 hours

## 2.8 B8: Notification Delivery

| Sub-task | Status | Gap |
|----------|--------|-----|
| B8.1 In-app notifications | EXISTS | ✅ Notification records in DB |
| B8.2 Email (SendGrid) | EXISTS | ✅ SendGrid integration in `notification-channels.service.ts` |
| B8.3 Graceful degradation | EXISTS | ✅ Logs warning when not configured |
| **NEW: Push notifications** | MISSING | No FCM/APNs integration |
| **NEW: WhatsApp** | MISSING | No WhatsApp Business API integration |
| **NEW: Notification preferences** | MISSING | No per-user preference model |
| **NEW: Quiet hours** | MISSING | No quiet hours logic |

**Effort:** 8-12 hours

## 2.9 B9: Mobile App Alignment

| Sub-task | Status | Gap |
|----------|--------|-----|
| B9.1 API path verification | NEEDS AUDIT | Need to verify all mobile API calls match backend |
| B9.2 Fix TypeScript errors | DONE | ✅ Fixed in previous session |
| B9.3 Auth flow verification | NEEDS TESTING | No test proving login→token→API works |
| **NEW: Offline integration** | MISSING | `offline-manager.ts` exists but NOT integrated into API service layer |
| **NEW: Biometric integration** | PLACEHOLDER | `biometric-auth.ts` exists but is a stub |
| **NEW: Crash reporting endpoint** | MISSING | `crash-reporter.ts` exists but no real endpoint configured |

**Effort:** 6-8 hours

## 2.10 B10: E2E Verification

| Sub-task | Status | Gap |
|----------|--------|-----|
| B10.1 Playwright test | EXISTS | ✅ `apps/web/e2e/booking-flow.spec.ts` exists |
| B10.2 API integration test | EXISTS | ✅ `test/trip-lifecycle.integration.spec.ts` exists |
| B10.3 Mobile smoke test | DONE | ✅ TypeScript compiles |
| **Gap: Only 1 E2E spec** | MISSING | Need 10+ E2E scenarios covering all roles |
| **Gap: Playwright not run** | MISSING | Never executed against running app |

**Effort:** 10-12 hours

## 2.11 B11: CI/CD & Docker

| Sub-task | Status | Gap |
|----------|--------|-----|
| B11.1 Fix docker-compose ports | DONE | ✅ Ports correct (3001:3001, 3000:3000) |
| B11.2 Add ML service | DONE | ✅ ML service in docker-compose |
| B11.3 Delete duplicate CI | NEEDS CHECK | Verify only one workflow file |
| B11.4 Remove mobile from CI | NEEDS CHECK | Verify CI doesn't run mobile tests |
| B11.5 Add .dockerignore | DONE | ✅ `.dockerignore` exists |
| B11.6 Clean root artifacts | DONE | ✅ Root artifacts removed |

**Remaining:** Verify CI pipeline configuration is correct.

**Effort:** 1-2 hours

---

# PART 3: PLAN 6 — SECURITY GAPS

## 3.1 C1: AccessScopeGuard Wiring

| Sub-task | Status | Gap |
|----------|--------|-----|
| C1.1 Wire to all tenant controllers | DONE | ✅ 15 controllers guarded |
| C1.2 Fix bypass | NEEDS CHECK | Verify non-production bypass removed from `access-scope.guard.ts` line 76 |
| C1.3 Add deny-by-default | MISSING | No deny-by-default when no scopes assigned |
| **Missing controllers** | PARTIAL | Not all controllers in the list from the plan may be guarded (need to verify 73 controllers) |

**Effort:** 2-3 hours

## 3.2 C2: Owner-Only Enforcement

| Sub-task | Status | Gap |
|----------|--------|-----|
| C2.1 Define Owner-only actions | EXISTS | ✅ `owner-only.guard.ts` exists |
| C2.2 Create decorator | EXISTS | ✅ `owner-only.decorator.ts` exists |
| C2.3 Create guard | EXISTS | ✅ Guard exists |
| C2.4 Apply to platform-admin | EXISTS | ✅ Applied |
| C2.5 Permission delta endpoint | EXISTS | ✅ `GET /api/platform/roles/:roleId/permissions-delta` and `POST /api/platform/users/:userId/change-role` exist |

**Status:** COMPLETE ✅

## 3.3 C3: Input Validation DTOs

| Sub-task | Status | Gap |
|----------|--------|-----|
| C3.1 Auth DTOs | PARTIAL | Some DTOs exist but may not be applied to all auth endpoints |
| C3.2 Booking DTOs | EXISTS | ✅ `CreateBookingDto` exists |
| C3.3 Trip DTOs | EXISTS | ✅ `TransitionTripDto`, `GpsLocationDto` exist |
| C3.4 Fleet DTOs | EXISTS | ✅ `CreateVehicleDto`, `CreateDriverDto` exist |
| C3.5 Apply ValidationPipe | MISSING | **`ValidationPipe` not configured globally in `main.ts`** |
| **Gap: DTOs created but not applied** | PARTIAL | Controllers may not use `@Body()` with DTO types |

**Effort:** 4-6 hours

## 3.4 C4: Security Fixes

| Sub-task | Status | Gap |
|----------|--------|-----|
| C4.1 Remove hardcoded credentials | NEEDS CHECK | Verify `DEMO_ACCOUNTS` removed from `apps/web/src/app/page.tsx` |
| C4.2 TypeScript strict mode | NOT DONE | `tsconfig.json` still has `"strict": false` |
| C4.3 CSRF protection | NOT DONE | No `csurf` middleware in `main.ts` |
| C4.4 Request body size limits | NOT DONE | No `json({ limit: '1mb' })` in `main.ts` |
| C4.5 Fix CSP headers | NOT DONE | `unsafe-eval` may still be in Helmet config |
| C4.6 Fix WebSocket auth | NOT DONE | May still have `jsonwebtoken` fallback |

**Effort:** 6-8 hours

## 3.5 C5: MFA Enforcement

| Sub-task | Status | Gap |
|----------|--------|-----|
| C5.1 MFA enrollment flow | EXISTS | ✅ `mfa.service.ts` exists with TOTP |
| C5.2 MFA verification on login | EXISTS | ✅ MFA verification in auth flow |
| C5.3 MFA admin policy | EXISTS | ✅ MFA controller exists |
| **Gap: MFA not enforced per company** | PARTIAL | No company-level MFA enforcement flag |

**Effort:** 2-3 hours

---

# PART 4: PLAN 7 — PLATFORM SAAS GAPS

## 4.1 D1: Subscription & Plans

| Sub-task | Status | Gap |
|----------|--------|-----|
| D1.1 Schema models | DONE | ✅ 8 new models created and migrated |
| D1.2 Subscription service | DONE | ✅ `subscription.service.ts` with full CRUD |
| D1.3 Usage metering | PARTIAL | `recordUsage` method exists but no background job to track usage |
| D1.4 Trial management | EXISTS | ✅ `startTrial` method exists |
| D1.5 Subscription management UI | MISSING | No `SubscriptionPage.tsx` in web app |
| **Gap: Not registered in module** | CRITICAL | `SubscriptionService` NOT in `billing.module.ts` |

**Effort:** 4-6 hours

## 4.2 D2: Company Provisioning

| Sub-task | Status | Gap |
|----------|--------|-----|
| D2.1 Company activation gate | NOT DONE | No contact verification before activation |
| D2.2 Provisioning workflow | NOT DONE | No `CONTACTS_PENDING → ACTIVE` state machine |
| D2.3 Onboarding wizard backend | NOT DONE | No `onboarding.service.ts` |
| D2.4 Onboarding wizard frontend | NOT DONE | No multi-step wizard UI |

**Effort:** 12-16 hours

## 4.3 D3: White Label

| Sub-task | Status | Gap |
|----------|--------|-----|
| D3.1 Company branding fields | EXISTS | ✅ Fields exist on Company model |
| D3.2 Branding service | NOT DONE | No `branding.service.ts` |
| D3.3 Frontend theme application | NOT DONE | No `BrandingProvider.tsx` |
| D3.4 Custom domain support | NOT DONE | No domain resolution logic |

**Effort:** 6-8 hours

## 4.4 D4: SSO/OIDC/SAML

| Sub-task | Status | Gap |
|----------|--------|-----|
| D4.1 SSO configuration model | DONE | ✅ `SSOConfiguration` model exists |
| D4.2 Passport SSO strategies | NOT DONE | No `oidc.strategy.ts`, `saml.strategy.ts`, `azure-ad.strategy.ts` |
| D4.3 SSO login flow | NOT DONE | No OAuth redirect/callback logic |
| D4.4 SSO enforcement | NOT DONE | No password-login-disable logic |
| **Gap: Not registered in module** | CRITICAL | `SSOService` NOT in `security.module.ts` |

**Effort:** 10-14 hours

## 4.5 D5: Webhook Management

| Sub-task | Status | Gap |
|----------|--------|-----|
| D5.1 Schema | DONE | ✅ `WebhookConfig` and `WebhookLog` models exist |
| D5.2 Webhook dispatcher | DONE | ✅ `webhook-dispatcher.service.ts` with HMAC signing |
| D5.3 Webhook management UI | MISSING | No `WebhooksPage.tsx` in web app |
| **Gap: Not registered in module** | CRITICAL | `WebhookDispatcherService` NOT in `notification.module.ts` |
| **Gap: No event triggers** | CRITICAL | No code calls `webhooks.dispatch()` on booking/trip events |
| **Gap: Not wired to business events** | CRITICAL | Webhook dispatch only happens if explicitly called — no automatic triggers |

**Effort:** 6-8 hours

---

# PART 5: PLAN 8 — GPS, MAPS & REAL-TIME GAPS

## 5.1 E1: Google Maps Provider

| Sub-task | Status | Gap |
|----------|--------|-----|
| E1.1 MapProvider interface | DONE | ✅ Interface exists |
| E1.2 Google Maps implementation | DONE | ✅ `google-maps.provider.ts` with geocode, route, matrix |
| E1.3 Provider abstraction/factory | NOT DONE | No `map-provider.factory.ts` |
| E1.4 Server-side key protection | NEEDS CHECK | Verify no server keys exposed to browser |
| **Gap: Not registered in module** | CRITICAL | `GoogleMapsProvider` NOT in any NestJS module |
| **Gap: No Mapbox fallback** | MISSING | No Mapbox provider implementation |
| **Gap: No address validation wired** | MISSING | Address validation not used in booking creation |

**Effort:** 4-6 hours

## 5.2 E2: Geofence Detection

| Sub-task | Status | Gap |
|----------|--------|-----|
| E2.1 Enhanced Geofence model | EXISTS | ✅ `Geofence` model exists |
| E2.2 Geofence detection engine | DONE | ✅ `geofence-engine.ts` with circle + polygon detection |
| E2.3 Geofence event types | PARTIAL | Only ENTER/EXIT implemented, no DWELL/LATE_ARRIVAL/WRONG_SITE |
| E2.4 Geofence management UI | MISSING | No `GeofencePage.tsx` with map drawing |
| **Gap: Not registered in module** | CRITICAL | `GeofenceEngine` NOT in any NestJS module |
| **Gap: Not connected to GPS pipeline** | CRITICAL | `EnhancedTrackingService` calls geofence engine but is not registered |
| **Gap: No last-known-position tracking** | MISSING | No `wasLastKnownInside` check for state tracking |

**Effort:** 8-10 hours

## 5.3 E3: Route Deviation Detection

| Sub-task | Status | Gap |
|----------|--------|-----|
| E3.1 Deviation detection service | DONE | ✅ `route-deviation.ts` with polyline decode + distance calc |
| E3.2 Deviation resolution | NOT DONE | No `resolveDeviation` or `falseAlarm` methods |
| **Gap: Not registered in module** | CRITICAL | `RouteDeviationDetector` NOT in any NestJS module |
| **Gap: Not called during tracking** | CRITICAL | No code calls `checkDeviation` during GPS point processing |
| **Gap: No WebSocket notification** | MISSING | No `route:deviation` event emitted |
| **Gap: No RouteDeviation UI** | MISSING | No deviation list/resolution UI |

**Effort:** 4-6 hours

## 5.4 E4: Dispatch Board

| Sub-task | Status | Gap |
|----------|--------|-----|
| E4.1 Dispatch board data endpoint | NOT DONE | No `GET /api/dispatch/board` endpoint |
| E4.2 Real-time dispatch updates | NOT DONE | No `dispatch:trip-updated` WebSocket events |
| E4.3 Dispatch board UI | NOT DONE | No `DispatchBoardPage.tsx` with drag-drop |
| E4.4 Pre-commit validation | PARTIAL | Some validation in dispatch engine but not comprehensive |

**Effort:** 12-16 hours

---

# PART 6: PLAN 9 — NOTIFICATIONS GAPS

## 6.1 F1: Email Delivery

| Sub-task | Status | Gap |
|----------|--------|-----|
| F1.1 Email service | EXISTS | ✅ SendGrid in `notification-channels.service.ts` |
| F1.2 Email templates | NOT DONE | No HTML templates in `templates/` directory |
| F1.3 Email triggers | PARTIAL | `send()` method exists but not called on booking/trip events |
| **Gap: Templates are hardcoded strings** | MISSING | Need Handlebars/HTML templates for each notification type |

**Effort:** 6-8 hours

## 6.2 F2: SMS Delivery

| Sub-task | Status | Gap |
|----------|--------|-----|
| F2.1 SMS service | DONE | ✅ `sms-provider.ts` with Twilio |
| F2.2 SMS triggers | NOT DONE | SMS not triggered on any business event |
| **Gap: Not registered in module** | CRITICAL | `TwilioSmsProvider` NOT in any NestJS module |

**Effort:** 4-6 hours

## 6.3 F3: Push Notifications

| Sub-task | Status | Gap |
|----------|--------|-----|
| F3.1 Push token model | NOT DONE | No `PushToken` model in schema |
| F3.2 Push service (FCM) | NOT DONE | No Firebase integration |
| F3.3 Push triggers | NOT DONE | No push sent on any event |
| F3.4 Mobile push registration | NOT DONE | No token registration in mobile app |

**Effort:** 8-10 hours

## 6.4 F4: WhatsApp Integration

| Sub-task | Status | Gap |
|----------|--------|-----|
| F4.1 WhatsApp Business API | NOT DONE | No `whatsapp.service.ts` |
| F4.2 WhatsApp templates | NOT DONE | No templates |

**Effort:** 6-8 hours

## 6.5 F5: Notification Preferences & Quiet Hours

| Sub-task | Status | Gap |
|----------|--------|-----|
| F5.1 User notification preferences | NOT DONE | No preference model or service |
| F5.2 Quiet hours | NOT DONE | No quiet hours logic |

**Effort:** 4-6 hours

---

# PART 7: PLAN 10 — REPORTS GAPS

## 7.1 G1: Report Builder

| Sub-task | Status | Gap |
|----------|--------|-----|
| G1.1 Report catalogue (30+ reports) | PARTIAL | Only 5 built-in reports — need 25+ more |
| G1.2 Report service | EXISTS | ✅ `report-engine.service.ts` with query implementations |
| G1.3 Report builder UI | MISSING | No `ReportBuilderPage.tsx` |
| **Gap: Not registered in module** | CRITICAL | `ReportEngine` NOT in any NestJS module |
| **Gap: Queries return mock data** | PARTIAL | Some queries return empty arrays when no data matches |
| **Gap: No real SQL aggregation** | MISSING | Reports use Prisma findMany, not raw SQL with GROUP BY |

**Effort:** 20-24 hours

## 7.2 G2: Export Engine

| Sub-task | Status | Gap |
|----------|--------|-----|
| G2.1 Excel export | EXISTS | ✅ `export.service.ts` exists in reporting-engine |
| G2.2 PDF export | NOT DONE | No PDF generation (puppeteer/pdfkit) |
| G2.3 CSV export | NOT DONE | No CSV generation |
| G2.4 Background export for large datasets | NOT DONE | No background job queue for exports |
| G2.5 Export audit | NOT DONE | No audit trail for exports |

**Effort:** 8-10 hours

## 7.3 G3: Scheduled Reports

| Sub-task | Status | Gap |
|----------|--------|-----|
| G3.1 ScheduledReport model | EXISTS | ✅ Model exists in schema |
| G3.2 Scheduled report executor | EXISTS | ✅ `scheduled-report-executor.service.ts` |
| G3.3 Cron/scheduler integration | NOT DONE | No `@Cron()` decorator or scheduler calling the executor |
| G3.4 Scheduled report UI | MISSING | No UI to configure scheduled reports |

**Effort:** 4-6 hours

## 7.4 G4: AI Analytics

| Sub-task | Status | Gap |
|----------|--------|-----|
| G4.1 Predictive analytics service | EXISTS | ✅ `predictive-analytics.service.ts` (pre-existing) |
| G4.2 Cost leak detection | EXISTS | ✅ `cost-leak-detector.service.ts` (pre-existing) |
| G4.3 Carbon intelligence | EXISTS | ✅ `carbon-intelligence.service.ts` (pre-existing) |
| **Gap: Services may return mock data** | NEEDS AUDIT | Verify services return real analytics |

**Effort:** 4-6 hours

---

# PART 8: PLAN 11 — MOBILE GAPS

## 8.1 H1: TypeScript & Build

| Sub-task | Status | Gap |
|----------|--------|-----|
| H1.1 Fix TypeScript errors | DONE | ✅ 30+ errors fixed |
| H1.2 Add to CI | NOT DONE | Mobile typecheck not in CI workflow |

**Effort:** 1 hour

## 8.2 H2: API Contract Verification

| Sub-task | Status | Gap |
|----------|--------|-----|
| H2.1 Map every mobile API call | NOT DONE | No audit of mobile→backend API contract |
| H2.2 Fix mismatches | NOT DONE | Depends on H2.1 |
| H2.3 Type-safe API client | NOT DONE | Mobile uses loose fetch calls |

**Effort:** 6-8 hours

## 8.3 H3: Offline Support

| Sub-task | Status | Gap |
|----------|--------|-----|
| H3.1 Offline event queue | EXISTS | ✅ `offline-manager.ts` with queue + sync |
| H3.2 Queueable actions | PARTIAL | GPS location queued but not trip transitions |
| H3.3 Connectivity indicator | NOT DONE | No online/offline indicator in UI |

**Effort:** 4-6 hours

## 8.4 H4: Production Hardening

| Sub-task | Status | Gap |
|----------|--------|-----|
| H4.1 App icon and splash | PARTIAL | `app.json` exists but may use default Expo icons |
| H4.2 Crash reporting | EXISTS | ✅ `crash-reporter.ts` but no real endpoint |
| H4.3 Push notification setup | NOT DONE | No FCM/APNs configuration |
| H4.4 App store metadata | NOT DONE | No screenshots, descriptions, privacy policy |

**Effort:** 6-8 hours

---

# PART 9: PLAN 12 — TESTING GAPS

## 9.1 I1: Backend Unit Tests

| Sub-task | Status | Gap |
|----------|--------|-----|
| I1.1 Add tests for untested modules | PARTIAL | Only 16 spec files covering 14/45+ modules |
| I1.2 Target 550+ test cases | PARTIAL | Only 229 tests (need 321+ more) |

**Modules with ZERO tests:**
safety (6), security (5), notifications (6), finance (4), intelligence (8), reporting-engine (2), reports (2), tracking (1), health (4), platform-admin (2), policy (1), release-management (1), passenger-operations (1), schedule-import-export (1), storage (1), vehicle-type (1), vehicle-qr (1), dual-billing (1), driver-preferences (1), document-management (1), company-admin (1), company-contacts (1), communications (1), employee-history (1), analytics (1), employee-teams (1), enterprise-ops (6), no-show-evidence (4), phase4a (4), nodal-points (1), live-status (1), impersonation (1), vehicle-management (1), driver-management (1), ban-management (1), approval-workflow (1), no-show-policy (1), super-compliance (1), company-compliance (1), emergency-buzzer (1), employee-import (1), dashboard-registry (1), enterprise-dashboard (1), advanced-features (1), access-control (1)

**Effort:** 40-60 hours

## 9.2 I2: Authorization Tests

| Sub-task | Status | Gap |
|----------|--------|-----|
| I2.1 Permission enforcement tests | NOT DONE | No tests verifying 403 on unauthorized access |
| I2.2 Tenant isolation tests | NOT DONE | No tests verifying cross-tenant 403 |
| I2.3 IDOR tests | NOT DONE | No tests verifying IDOR protection |

**Effort:** 8-10 hours

## 9.3 I3: E2E Browser Tests

| Sub-task | Status | Gap |
|----------|--------|-----|
| I3.1 Playwright setup | DONE | ✅ `playwright.config.ts` exists |
| I3.2 Critical path tests | PARTIAL | Only 1 spec file — need 10+ scenarios |
| I3.3 Visual regression | NOT DONE | No screenshot comparison |

**Effort:** 10-12 hours

## 9.4 I4: Load Testing

| Sub-task | Status | Gap |
|----------|--------|-----|
| I4.1 k6 load tests | EXISTS | ✅ `tests/load-test.ts` with 7 scenarios |
| I4.2 Test scenarios | PARTIAL | Only API endpoint tests — no GPS ingestion, no booking creation tests |
| I4.3 Performance targets | NOT TESTED | Never executed against running app |

**Effort:** 4-6 hours

## 9.5 I5: Security Testing

| Sub-task | Status | Gap |
|----------|--------|-----|
| I5.1 OWASP Top 10 checks | NOT DONE | No security scan performed |
| I5.2 Automated security scanning | NOT DONE | No `npm audit` or `semgrep` in CI |

**Effort:** 4-6 hours

---

# PART 10: PLAN 13 — INFRASTRUCTURE GAPS

## 10.1 J1: Fix Current Infrastructure

| Sub-task | Status | Gap |
|----------|--------|-----|
| J1.1 Fix docker-compose ports | DONE | ✅ Ports correct |
| J1.2 Fix Dockerfile CMD path | NEEDS CHECK | Verify `dist/src/main.js` path in all Dockerfiles |
| J1.3 Add .dockerignore | DONE | ✅ `.dockerignore` exists |
| J1.4 Consolidate K8s manifests | NOT DONE | May have duplicate directories |
| J1.5 Delete duplicate CI | NEEDS CHECK | Verify single workflow file |
| J1.6 Add ML service | DONE | ✅ ML service in docker-compose |

**Effort:** 2-3 hours

## 10.2 J2: Terraform IaC

| Sub-task | Status | Gap |
|----------|--------|-----|
| J2.1 Provider configuration | DONE | ✅ `main.tf` with AWS provider |
| J2.2 VPC | DONE | ✅ VPC module with 2 AZs |
| J2.3 RDS | DONE | ✅ PostgreSQL 15 with encryption |
| J2.4 ElastiCache | DONE | ✅ Redis 7 |
| J2.5 EKS (Kubernetes) | NOT DONE | Uses ECS Fargate instead — no EKS |
| J2.6 S3 (Documents) | NOT DONE | No S3 bucket for documents |
| J2.7 Secrets Manager | PARTIAL | SSM Parameters used instead of Secrets Manager |
| **Gap: No variables.tf** | MISSING | No separate variables file |
| **Gap: No outputs.tf** | MISSING | No separate outputs file |
| **Gap: No ECS service defined** | CRITICAL | Task definition exists but no `aws_ecs_service` to run it |
| **Gap: No ALB** | CRITICAL | No load balancer defined |
| **Gap: Placeholder JWT secret** | CRITICAL | `CHANGE_ME_${var.environment}` is not a real secret |
| **Gap: Never initialized/tested** | CRITICAL | `terraform init` and `terraform plan` never run |

**Effort:** 12-16 hours

## 10.3 J3: Kubernetes Production

| Sub-task | Status | Gap |
|----------|--------|-----|
| J3.1 Helm charts | NOT DONE | No Helm chart directory |
| J3.2 Environment separation | NOT DONE | No staging/production values files |
| J3.3 Pod Disruption Budgets | NOT DONE | No PDB manifests |
| J3.4 Network Policies | NOT DONE | No NetworkPolicy manifests |
| J3.5 HPA | NOT DONE | No HorizontalPodAutoscaler |

**Effort:** 12-16 hours

## 10.4 J4: Backup & Disaster Recovery

| Sub-task | Status | Gap |
|----------|--------|-----|
| J4.1 Database backup | NOT DONE | No automated backup configuration |
| J4.2 S3 backup | NOT DONE | No backup bucket |
| J4.3 Backup cron job | NOT DONE | No K8s CronJob for backups |
| J4.4 DR runbook | NOT DONE | No `DISASTER_RECOVERY.md` |

**Effort:** 6-8 hours

## 10.5 J5: Secret Management

| Sub-task | Status | Gap |
|----------|--------|-----|
| J5.1 Remove .env from source | NOT DONE | `.env` files may still be in repo |
| J5.2 External Secrets Operator | NOT DONE | No ExternalSecret manifests |
| J5.3 CI/CD secret injection | NOT DONE | GitHub Secrets not configured |

**Effort:** 4-6 hours

---

# PART 11: PLAN 14 — OBSERVABILITY GAPS

## 11.1 K1: Structured Logging

| Sub-task | Status | Gap |
|----------|--------|-----|
| K1.1 Structured logger | EXISTS | ✅ `structured-logger.ts` with JSON output |
| K1.2 Request context logging | NOT DONE | No requestId/userId propagation in logs |
| K1.3 Log levels | PARTIAL | Logger exists but not wired to NestJS logger |
| **Gap: Not registered in module** | CRITICAL | `StructuredLogger` NOT in any NestJS module |
| **Gap: Not used by controllers** | CRITICAL | Controllers use NestJS default `Logger`, not `StructuredLogger` |

**Effort:** 4-6 hours

## 11.2 K2: Metrics

| Sub-task | Status | Gap |
|----------|--------|-----|
| K2.1 Prometheus metrics | NOT DONE | No `prom-client` integration |
| K2.2 Metrics endpoint | NOT DONE | No `GET /metrics` endpoint |
| K2.3 Business metrics | NOT DONE | No counters/gauges for business KPIs |

**Effort:** 8-10 hours

## 11.3 K3: Distributed Tracing

| Sub-task | Status | Gap |
|----------|--------|-----|
| K3.1 OpenTelemetry setup | NOT DONE | No `@opentelemetry` packages |
| K3.2 Trace context propagation | NOT DONE | No W3C Trace Context headers |
| K3.3 Trace visualization | NOT DONE | No Jaeger integration |

**Effort:** 6-8 hours

## 11.4 K4: Alerting

| Sub-task | Status | Gap |
|----------|--------|-----|
| K4.1 Alerting rules | EXISTS | ✅ `alerting.service.ts` with rules |
| K4.2 Alertmanager configuration | NOT DONE | No `prometheus-rules.yml` |
| K4.3 PagerDuty integration | NOT DONE | No PagerDuty service |
| **Gap: Rules defined but not connected** | CRITICAL | `AlertingService` NOT in any NestJS module |

**Effort:** 4-6 hours

## 11.5 K5: Grafana Dashboards

| Sub-task | Status | Gap |
|----------|--------|-----|
| K5.1 Infrastructure dashboard | NOT DONE | No Grafana dashboard JSON |
| K5.2 Application dashboard | NOT DONE | No Grafana dashboard JSON |
| K5.3 Business dashboard | NOT DONE | No Grafana dashboard JSON |

**Effort:** 4-6 hours

---

# PART 12: PLAN 15 — SECURITY & PRIVACY GAPS

## 12.1 L1: Field-Level Encryption

| Sub-task | Status | Gap |
|----------|--------|-----|
| L1.1 Encrypt PII fields | NOT DONE | No `@encrypted` annotation on schema fields |
| L1.2 Encryption service | NOT DONE | No `encryption.service.ts` with AES-256-GCM |
| L1.3 Searchable encryption | NOT DONE | No hash index for encrypted fields |

**Effort:** 8-10 hours

## 12.2 L2: Data Retention

| Sub-task | Status | Gap |
|----------|--------|-----|
| L2.1 Retention policy model | EXISTS | ✅ `DataRetentionPolicy` model exists |
| L2.2 Cleanup cron job | NOT DONE | No `@Cron()` job calling retention cleanup |
| L2.3 Default retention periods | NOT DONE | No default policies for new companies |
| **Gap: Model exists but no logic** | CRITICAL | No service implements retention enforcement |

**Effort:** 4-6 hours

## 12.3 L3: DSAR (Data Subject Access Requests)

| Sub-task | Status | Gap |
|----------|--------|-----|
| L3.1 DSAR model | EXISTS | ✅ `DSARRequest` model exists |
| L3.2 DSAR service | NOT DONE | No `dsar.service.ts` |
| L3.3 Frontend DSAR page | NOT DONE | No `DSARPage.tsx` |
| **Gap: Model exists but no logic** | CRITICAL | No service implements DSAR processing |

**Effort:** 6-8 hours

## 12.4 L4: Audit Integrity

| Sub-task | Status | Gap |
|----------|--------|-----|
| L4.1 Hash chain for audit logs | NOT DONE | No `previousHash`/`currentHash` fields on audit model |
| L4.2 Audit verification | NOT DONE | No `verifyAuditChain` method |
| **Gap: Basic audit logging exists** | PARTIAL | `AuditService` exists but without hash chain integrity |

**Effort:** 4-6 hours

---

# PART 13: PLAN 16 — DOCUMENTATION GAPS

## 13.1 M1: API Documentation

| Sub-task | Status | Gap |
|----------|--------|-----|
| M1.1 Swagger/OpenAPI | EXISTS | ✅ Swagger configured at `/docs` |
| M1.2 Per-module Swagger decorators | PARTIAL | Some controllers have `@ApiOperation` but many don't |
| **Gap: Not all endpoints documented** | PARTIAL | Many endpoints missing `@ApiResponse` decorators |

**Effort:** 4-6 hours

## 13.2 M2: Developer Onboarding

| Sub-task | Status | Gap |
|----------|--------|-----|
| M2.1 Enhanced README | EXISTS | ✅ `docs/api-reference.md` exists |
| M2.2 Development setup script | NOT DONE | No `setup.sh` |
| M2.3 Architecture Decision Records | NOT DONE | No `docs/adr/` directory |

**Effort:** 4-6 hours

## 13.3 M3: Runbooks

| Sub-task | Status | Gap |
|----------|--------|-----|
| M3.1 Deployment runbook | EXISTS | ✅ `docs/runbook.md` exists |
| M3.2 Incident response runbook | NOT DONE | No `INCIDENT_RESPONSE.md` |
| M3.3 Database runbook | NOT DONE | No `DATABASE.md` |
| M3.4 Secrets rotation runbook | NOT DONE | No `SECRETS_ROTATION.md` |

**Effort:** 4-6 hours

---

# PART 14: FRONTEND COMPLETENESS GAPS

## 14.1 Pages Needing Real API Wiring (34 pages)

| # | Page | Gap |
|---|------|-----|
| 1 | BookTransportPage.tsx | Form may not submit to real API |
| 2 | BookingsPage.tsx | Status tabs may use mock data |
| 3 | TripsPage.tsx | Trip data may be hardcoded |
| 4 | DispatchPage.tsx | Dispatch may not call API |
| 5 | ApprovalsPage.tsx | Approve/reject may not work |
| 6 | DriversPage.tsx | Availability toggle not wired |
| 7 | VehiclesPage.tsx | Status may be hardcoded |
| 8 | RoutesPage.tsx | Route form may not submit |
| 9 | EmployeeTransportMasterPage.tsx | CRUD may not be wired |
| 10 | ImportExportPage.tsx | Import may not work |
| 11 | DriverHomePage.tsx | Not wired |
| 12 | BoardingPage.tsx | Not wired |
| 13 | NoShowPage.tsx | Not wired |
| 14 | VehicleCheckPage.tsx | Not wired |
| 15 | VehicleQRPage.tsx | Not wired |
| 16 | NodalPointsPage.tsx | Not wired |
| 17 | EmployeeAddressesPage.tsx | Not wired |
| 18 | EmployeeSchedulingPage.tsx | Not wired |
| 19 | TeamsPage.tsx | Not wired |
| 20 | LocationChangeRequestsPage.tsx | Not wired |
| 21 | OwnerManagementPage.tsx | Stats hardcoded |
| 22 | SuperAdminPage.tsx | Stats hardcoded |
| 23 | DirectorDashboard.tsx | KPI hardcoded |
| 24 | CoordinatorDashboard.tsx | Summary hardcoded |
| 25 | ManagerDashboard.tsx | KPI hardcoded |
| 26 | SupportDashboard.tsx | KPI hardcoded |
| 27 | VendorDashboard.tsx | Dashboard hardcoded |
| 28 | GuardDashboard.tsx | KPI hardcoded |
| 29 | ReportsPage.tsx | Reports may not generate |
| 30 | AnalyticsPage.tsx | Analytics may be mock |
| 31 | CXOIntelligencePage.tsx | Intelligence may be mock |
| 32 | PredictiveAnalyticsPage.tsx | Predictions may be mock |
| 33 | AuditLogPage.tsx | Audit data may not load |
| 34 | InvoicesPage.tsx | Invoices may not load |

**Effort:** 60-80 hours

## 14.2 Frontend Quality Gaps

| Gap | Count | Description |
|-----|-------|-------------|
| `any` types | 54/74 pages | TypeScript `any` used instead of proper types |
| Silent error catches | 49/74 pages | Errors caught but not displayed to user |
| No 401/403 handling | All pages | No redirect to login on auth failure |
| Triple API client pattern | Multiple files | Inconsistent API call patterns |
| No loading skeletons | Most pages | Only basic spinners, no skeleton screens |

**Effort:** 20-30 hours

---

# PART 15: TESTING EXPANSION GAPS

## 15.1 Unit Tests Needed (321+ new tests)

| Module | Services | Tests Needed |
|--------|----------|-------------|
| safety | 6 services | 30+ |
| security | 5 services | 25+ |
| notifications | 6 services | 30+ |
| finance | 4 services | 20+ |
| intelligence | 8 services | 40+ |
| reporting-engine | 2 services | 10+ |
| reports | 2 services | 10+ |
| tracking | 1 service | 5+ |
| health | 4 services | 20+ |
| platform-admin | 2 services | 10+ |
| policy | 1 service | 5+ |
| enterprise-ops | 6 services | 30+ |
| no-show-evidence | 4 services | 20+ |
| phase4a | 4 services | 20+ |
| Other modules (20+) | 20+ services | 46+ |

**Effort:** 40-60 hours

## 15.2 Integration Tests Needed

| Test | Status |
|------|--------|
| Full booking→dispatch→trip→complete flow | EXISTS |
| Auth login→token→refresh flow | EXISTS |
| Billing flow | EXISTS |
| Cross-tenant access blocked | EXISTS |
| **GPS ingestion under load** | NOT DONE |
| **Webhook delivery** | NOT DONE |
| **Report generation** | NOT DONE |
| **Subscription lifecycle** | NOT DONE |

**Effort:** 8-10 hours

## 15.3 E2E Tests Needed (9+ new scenarios)

| Scenario | Status |
|----------|--------|
| Login → Dashboard (all 19 roles) | NOT DONE |
| Employee: Book transport → See in list | NOT DONE |
| Manager: Approve booking → Status changes | NOT DONE |
| Coordinator: Dispatch trip → Driver assigned | NOT DONE |
| Driver: Start → Complete → Cost calculated | NOT DONE |
| Admin: Create vehicle → Appears in list | NOT DONE |
| Admin: Import employees → Appear | NOT DONE |
| Finance: View invoices → Export Excel | NOT DONE |
| Security: MFA setup → Verify on login | NOT DONE |
| SOS: Trigger → Alert in control room | NOT DONE |

**Effort:** 10-12 hours

---

# PART 16: CONSOLIDATED EFFORT ESTIMATE

| Category | Hours | Priority |
|----------|-------|----------|
| **Module Registration (1.1–1.9)** | 8-12 | CRITICAL |
| **Plan 5 Remaining (2.2–2.11)** | 80-110 | HIGH |
| **Plan 6 Remaining (3.1–3.5)** | 18-26 | HIGH |
| **Plan 7 Remaining (4.1–4.5)** | 38-50 | HIGH |
| **Plan 8 Remaining (5.1–5.4)** | 28-38 | HIGH |
| **Plan 9 Remaining (6.1–6.5)** | 28-38 | HIGH |
| **Plan 10 Remaining (7.1–7.4)** | 36-46 | HIGH |
| **Plan 11 Remaining (8.1–8.4)** | 17-23 | MEDIUM |
| **Plan 12 Remaining (9.1–9.5)** | 66-94 | MEDIUM |
| **Plan 13 Remaining (10.1–10.5)** | 38-49 | MEDIUM |
| **Plan 14 Remaining (11.1–11.5)** | 26-36 | MEDIUM |
| **Plan 15 Remaining (12.1–12.4)** | 22-30 | MEDIUM |
| **Plan 16 Remaining (13.1–13.3)** | 12-18 | LOW |
| **Frontend Completion (14.1–14.2)** | 80-110 | HIGH |
| **Testing Expansion (15.1–15.3)** | 58-82 | MEDIUM |
| **TOTAL** | **555-762** | |

---

# PART 17: RECOMMENDED EXECUTION ORDER

## Phase 1: Critical Wiring (Week 1) — 30-40 hours

1. Register all orphaned services in NestJS modules (1.1–1.8)
2. Create missing modules (tracking.module.ts, reports.module.ts, common-utilities.module.ts)
3. Add global ValidationPipe (1.9)
4. Fix AccessScopeGuard bypass (3.1)
5. Verify CI pipeline (2.11)

## Phase 2: Security & Validation (Week 2) — 40-50 hours

1. Apply ValidationPipe globally + wire DTOs (3.3)
2. Remove hardcoded credentials (3.4)
3. Add CSRF protection (3.4)
4. Add request body size limits (3.4)
5. Fix CSP headers (3.4)
6. Write authorization tests (9.2)
7. Write tenant isolation tests (9.2)

## Phase 3: Core Features (Weeks 3-4) — 80-100 hours

1. Wire geofence + route deviation to GPS pipeline (5.2, 5.3)
2. Wire webhook triggers to business events (4.5)
3. Wire email triggers to booking/trip events (6.1)
4. Add remaining 25 report types (7.1)
5. Wire report generation to real SQL aggregation (7.1)
6. Complete dispatch board endpoint + UI (5.4)
7. Add push notification model + FCM integration (6.3)

## Phase 4: Frontend Completion (Weeks 5-7) — 100-130 hours

1. Wire 34 partial pages to real APIs (14.1)
2. Add loading/error/empty states (14.2)
3. Fix TypeScript `any` types (14.2)
4. Add 401/403 handling (14.2)
5. Build Subscription management UI (4.1)
6. Build Webhooks management UI (4.5)
7. Build Geofence management UI (5.2)
8. Build DSAR UI (12.3)
9. Build Report builder UI (7.1)

## Phase 5: Testing (Weeks 8-10) — 80-110 hours

1. Write unit tests for all 45+ modules (9.1)
2. Write 10+ E2E scenarios (9.3)
3. Run and validate k6 load tests (9.4)
4. Run OWASP security scan (9.5)
5. Verify full booking lifecycle in browser (9.3)

## Phase 6: Infrastructure (Weeks 11-13) — 60-80 hours

1. Test Terraform: init + plan + validate (10.2)
2. Add ECS service + ALB to Terraform (10.2)
3. Add S3 bucket for documents (10.2)
4. Move secrets to AWS Secrets Manager (10.5)
5. Create Helm charts (10.3)
6. Configure backup CronJob (10.4)
7. Write DR runbook (10.4)

## Phase 7: Observability (Weeks 14-15) — 30-40 hours

1. Wire StructuredLogger to NestJS (11.1)
2. Add Prometheus metrics endpoint (11.2)
3. Add OpenTelemetry tracing (11.3)
4. Create Grafana dashboards (11.5)
5. Configure Alertmanager (11.4)

## Phase 8: Privacy & Compliance (Week 16) — 22-30 hours

1. Implement field-level encryption (12.1)
2. Wire data retention cleanup cron (12.2)
3. Implement DSAR processing (12.3)
4. Add hash chain to audit logs (12.4)

## Phase 9: Documentation & Launch Prep (Weeks 17-18) — 20-30 hours

1. Complete Swagger decorators (13.1)
2. Create setup.sh (13.2)
3. Create ADRs (13.2)
4. Write incident response runbook (13.3)
5. Write database runbook (13.3)
6. Write secrets rotation runbook (13.3)
7. Security audit (external)
8. Load testing validation (external)
9. DR testing (external)

---

# PART 18: ACCEPTANCE CRITERIA CHECKLIST

## Must-Have for Production

- [ ] All orphaned services registered in NestJS modules
- [ ] ValidationPipe applied globally
- [ ] All 73 controllers have AccessScopeGuard where needed
- [ ] No hardcoded credentials in source
- [ ] CSRF protection enabled
- [ ] Request body limits enforced
- [ ] No `unsafe-eval` in CSP
- [ ] All 46+ modules have unit tests
- [ ] 550+ test cases passing
- [ ] 10+ E2E scenarios passing
- [ ] k6 load test passes (500+ concurrent users)
- [ ] `docker compose up` starts all services
- [ ] `terraform plan` succeeds
- [ ] All 34 frontend pages wired to real APIs
- [ ] Email/SMS/push notifications working
- [ ] Webhook delivery working
- [ ] Report generation working (30+ types)
- [ ] Geofence detection working
- [ ] Route deviation detection working
- [ ] Dispatch board functional
- [ ] MFA working
- [ ] SSO working (OIDC)
- [ ] Subscription management functional
- [ ] Data retention automation working
- [ ] DSAR processing working
- [ ] Audit hash chain integrity
- [ ] Structured logging with request context
- [ ] Prometheus metrics endpoint
- [ ] Distributed tracing operational
- [ ] Grafana dashboards showing real data
- [ ] Alertmanager configured
- [ ] Backup automation running
- [ ] DR runbook documented and tested
- [ ] All secrets in Secrets Manager
- [ ] Security audit passed
- [ ] Penetration test passed
