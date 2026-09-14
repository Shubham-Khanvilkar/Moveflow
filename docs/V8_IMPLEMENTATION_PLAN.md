# MOVE-IN-SYNC V8 IMPLEMENTATION PLAN
# Complete Frontend + Missing APIs + Mobile App

---

## CURRENT API STATUS (Verified 2026-09-04)

### ✅ Working (200) — 20 endpoints
| Endpoint | Used By |
|---|---|
| GET /api/auth/me | All roles — portal resolution |
| GET /api/org/sites | Transport Admin — org structure |
| GET /api/org/lobs | Transport Admin — org structure |
| GET /api/org/processes | Transport Admin — org structure |
| GET /api/employees | Transport Admin — employee list |
| GET /api/dashboard/drivers | Transport Admin — driver management |
| GET /api/dashboard/vehicles | Transport Admin — vehicle management |
| GET /api/dashboard/vendors | Transport Admin — vendor management |
| GET /api/dashboard/analytics/summary | All roles — dashboard KPIs |
| GET /api/admin/departments | Transport Admin — departments |
| GET /api/admin/vendors | Transport Admin — vendor CRUD |
| GET /api/admin/shifts | Transport Admin — shift management |
| GET /api/admin/audit-logs | Auditor — audit trail |
| GET /api/dashboard/access/roles | Transport Admin — role management |
| GET /api/dashboard/access/my-permissions | All roles — permission check |
| GET /api/notifications | All roles — notifications |
| GET /api/dashboard/bans | Transport Admin — ban management |
| GET /api/dashboard/routes | Transport Admin — route management |
| GET /api/policies | Transport Admin — transport policies |
| GET /api/dashboard/emergency | Safety — emergency management |

### ❌ Missing Routes (404) — 8 endpoints needed
| Endpoint | Priority | Used By |
|---|---|---|
| GET /api/trips | P0 | Transport Admin, Manager, Employee, Driver |
| GET /api/dashboard/no-show | P0 | Transport Admin, Coordinator |
| GET /api/dashboard/approvals | P0 | Manager, Director, Transport Admin |
| GET /api/dashboard/compliance | P1 | Compliance, Transport Admin |
| GET /api/dashboard/import | P1 | Transport Admin — bulk import |
| GET /api/safety | P1 | Safety Officer |
| GET /api/sla | P2 | Transport Admin — SLA tracking |
| GET /api/dashboard/super-compliance | P2 | Platform Compliance |

### ❌ Server Errors (500) — 2 endpoints to fix
| Endpoint | Issue |
|---|---|
| GET /api/billing/rate-cards | Service error |
| GET /api/storage | File upload error |

---

## FRONTEND PAGES TO BUILD

### Transport Admin Portal (16 pages)
1. ✅ Dashboard — DONE (KPIs from real API)
2. Employees — List, create, edit, bulk import, assign scope
3. Bookings — List, approve/reject, bulk approve
4. Dispatch — Unassigned trips, assign driver/vehicle, manual override
5. Control Room — Live map, active trips, alerts, no-show queue
6. Trips — List, trip detail, GPS tracking, completion
7. Drivers — List, create, edit, compliance, availability
8. Vehicles — List, create, edit, inspection, compliance
9. Routes — List, create, edit, stop management
10. Compliance — Driver docs, vehicle docs, expiry alerts
11. No-Show — Queue, evidence, call tracking, appeals
12. Vendors — List, create, edit, performance, invoices
13. Reports — Trip reports, cost reports, utilization, export
14. Policies — Transport policy config, no-show rules, approval chains
15. Organization — Sites, LOBs, processes, shifts, departments
16. Settings — Company settings, user management, audit

### Manager Portal (5 pages)
1. ✅ Dashboard — DONE
2. Team — Direct reports, their bookings, their trips
3. Transport — Team transport status, live tracking
4. Approvals — Pending booking approvals, approve/reject
5. Reports — Team reports, cost summary

### Employee Portal (8 pages)
1. ✅ Dashboard — DONE
2. My Transport — Current transport status, upcoming trips
3. My Bookings — List, create new, cancel
4. Book Transport — Booking form (date, pickup, drop, type)
5. My Trips — Trip history, live tracking
6. Notifications — Notification list, mark read
7. Expenses — Submit, list, status
8. Profile — Edit profile, pickup/drop locations, preferences

### Driver Portal (11 pages)
1. ✅ Dashboard — DONE
2. Availability — Toggle available/unavailable
3. Today's Trips — Assigned trips list
4. Navigation — Map, route, ETA
5. Passengers — Passenger list, contact
6. Boarding — OTP/QR verification, mark boarded
7. No-Show — Report no-show, call evidence
8. Breakdown — Report breakdown, evidence
9. SOS — Emergency alert
10. Vehicle Check — Pre-trip inspection
11. Profile — Documents, shift, earnings

### Director Portal (3 pages)
1. ✅ Dashboard — DONE
2. Approvals — Multi-level approvals, delegation
3. Reports — Executive reports, cost analytics

### Vendor Portal (5 pages)
1. ✅ Dashboard — DONE
2. Drivers — Vendor's drivers, onboarding
3. Vehicles — Vendor's vehicles, maintenance
4. Trips — Vendor's trip records
5. Invoices — Invoice submission, reconciliation

---

## MOBILE APP ARCHITECTURE

### Single App — Role-Based Access
- **Framework**: React Native (TypeScript)
- **Navigation**: React Navigation with role-based routing
- **State**: Zustand (lightweight, fast)
- **API**: Axios with interceptors
- **Offline**: SQLite for offline sync
- **Maps**: react-native-maps
- **Auth**: Biometric + JWT
- **Push**: Firebase FCM
- **i18n**: i18next

### Role-Based Screens
```
App
├── Auth Stack (Login, Biometric, Forgot Password)
├── Employee Stack
│   ├── Home (upcoming trips, quick book)
│   ├── Book Transport (form)
│   ├── My Trips (list + live tracking)
│   ├── Notifications
│   ├── Expenses (submit + list)
│   └── Profile
├── Driver Stack
│   ├── Home (today's trips, availability toggle)
│   ├── Trip Detail (navigation, passengers, boarding)
│   ├── No-Show (call, evidence, report)
│   ├── Breakdown (report, photos)
│   ├── SOS (emergency)
│   ├── Vehicle Check (inspection form)
│   └── Profile
├── Manager Stack
│   ├── Home (pending approvals, team status)
│   ├── Approvals (list, approve/reject)
│   ├── Team (list, trips, bookings)
│   └── Reports
├── Transport Admin Stack
│   ├── Dashboard (KPIs)
│   ├── Dispatch (assign, reassign)
│   ├── Control Room (live map)
│   ├── Drivers (list, manage)
│   ├── Vehicles (list, manage)
│   └── Reports
└── Common
    ├── Notifications
    ├── Settings
    └── Profile
```

---

## IMPLEMENTATION ORDER

### Phase 1: Frontend Core (P0) — 5 sessions
1. Transport Admin: Employees page (list + create + edit)
2. Transport Admin: Bookings page (list + approve)
3. Transport Admin: Drivers page (list + create + edit)
4. Transport Admin: Vehicles page (list + create + edit)
5. Transport Admin: Organization page (sites, LOBs, processes, shifts)

### Phase 2: Frontend Operations (P0) — 5 sessions
6. Transport Admin: Dispatch page (assign driver/vehicle)
7. Transport Admin: Trips page (list + detail + GPS)
8. Transport Admin: Control Room (live map + alerts)
9. Transport Admin: No-Show queue + evidence
10. Transport Admin: Reports + export

### Phase 3: Role Portals (P1) — 5 sessions
11. Manager: Team + Approvals + Reports
12. Employee: Book Transport + My Trips + Expenses
13. Driver: Today's Trips + Navigation + Boarding
14. Director: Approvals + Reports
15. Vendor: Drivers + Vehicles + Invoices

### Phase 4: Missing APIs (P0) — 3 sessions
16. Trip CRUD + lifecycle endpoints
17. Booking create + approval endpoints
18. No-Show + call tracking endpoints

### Phase 5: Mobile App (P1) — 8 sessions
19. React Native setup + auth + navigation
20. Employee mobile screens
21. Driver mobile screens (GPS, boarding, no-show)
22. Manager mobile screens (approvals)
23. Transport Admin mobile screens

### Phase 6: Advanced (P2) — 5 sessions
24. Billing + rate cards
25. Compliance + document management
26. Analytics + AI copilot
27. Notifications (push, SMS, email)
28. Security hardening + tests
