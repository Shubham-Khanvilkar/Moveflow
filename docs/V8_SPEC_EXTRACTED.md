MOVE IN SYNCMASTER PRODUCTION SPECIFICATION — V8
RBAC + Scope + Company/Site/Process + Transport Operations + GPS + Dispatch + Billing + Audit
1. Purpose and Non-Negotiable Definition of Done
This specification replaces placeholder dashboards and superficial role labels with a real authorization and operating model. A module is complete only when UI, API, database persistence, authorization, validation, audit and error/success states work together. A page that only renders, returns demo counts, or says Under Development is not implemented.
No common dashboard for all roles. Dashboard, navigation and actions are derived from effective access.
No frontend-only security. Every permission and company/site/process scope is enforced server-side.
Super Admin MUST have a working Companies module and MUST be able to create companies.
Only TRANSPORT_ADMIN may create/onboard or offboard customer employees. HRMS is optional and cannot silently cancel/suspend/alter transport.
Every relevant record carries Company Code, Site Code and Process Code as normalized relationships, not a free-text comma list.
Users may have multiple sites and multiple processes where authorized.
Internal platform, customer internal, vendor external, driver external and guard external domains never inherit permissions from one another.
Every responsibility has an ON/OFF permission toggle mapped to a stable permission key.
Role changes recalculate effective access and must invalidate/revalidate sessions so old permissions do not remain usable.
Exports must contain real scoped data and obey the same authorization as the UI.
2. Organization and Security Domains
PLATFORM_INTERNAL  MoveInSync platform employeesCUSTOMER_INTERNAL  Customer company employees/adminsVENDOR_EXTERNAL  Transport vendor organization usersDRIVER_EXTERNAL  Freelancer or vendor-employed driversGUARD_EXTERNAL  Site security users
Authorization identity is not just a role. Minimum effective identity: security_domain + organization_id + role assignment + permission set + company scope + site scope + process scope + team scope where applicable.
3. Complete Role Catalogue
Domain
Role
Scope / responsibility
PLATFORM_INTERNAL
SUPER_ADMIN
Entire platform; create/manage companies; platform governance
PLATFORM_INTERNAL
PLATFORM_ADMIN
Platform administration and tenant support
PLATFORM_INTERNAL
PLATFORM_OPERATIONS
Cross-tenant operational monitoring
PLATFORM_INTERNAL
PLATFORM_SUPPORT
Assigned customer support/diagnostics
PLATFORM_INTERNAL
PLATFORM_SECURITY_ADMIN
IAM, security, sessions, audit
PLATFORM_INTERNAL
PLATFORM_AUDITOR
Cross-platform read-only audit
PLATFORM_INTERNAL
PLATFORM_FINANCE_ADMIN
Platform billing/revenue
PLATFORM_INTERNAL
PLATFORM_INTEGRATION_ADMIN
APIs, integrations, webhooks
CUSTOMER_INTERNAL
COMPANY_ADMIN
One customer company; all authorized sites/processes
CUSTOMER_INTERNAL
COMPANY_SUB_ADMIN
Delegated company administration
CUSTOMER_INTERNAL
DIRECTOR
Multi-site/process executive visibility
CUSTOMER_INTERNAL
TRANSPORT_HEAD
Transport governance
CUSTOMER_INTERNAL
TRANSPORT_ADMIN
Full transport operations in assigned scope
CUSTOMER_INTERNAL
TRANSPORT_SUB_ADMIN
Delegated transport operations
CUSTOMER_INTERNAL
TRANSPORT_COORDINATOR
Scheduling, dispatch, day-to-day operations
CUSTOMER_INTERNAL
CONTROL_ROOM_OPERATOR
Live control-room operations
CUSTOMER_INTERNAL
ROSTER_ADMIN
Shifts/rosters
CUSTOMER_INTERNAL
ROUTE_ADMIN
Routes, stops, geofences
CUSTOMER_INTERNAL
SAFETY_ADMIN
Safety/female transport/incidents
CUSTOMER_INTERNAL
VENDOR_MANAGER
Vendor administration
CUSTOMER_INTERNAL
FINANCE_ADMIN
Invoices, reconciliation, cost
CUSTOMER_INTERNAL
FINANCE_VIEWER
Finance read-only
CUSTOMER_INTERNAL
REPORTING_ADMIN
Reports and exports
CUSTOMER_INTERNAL
SECURITY_ADMIN
Company access/security
CUSTOMER_INTERNAL
AUDITOR
Company read-only audit
CUSTOMER_INTERNAL
PROCESS_HEAD
Assigned process oversight
CUSTOMER_INTERNAL
PROCESS_ADMIN
Assigned process administration
CUSTOMER_INTERNAL
SITE_ADMIN
Assigned site administration
CUSTOMER_INTERNAL
SITE_TRANSPORT_ADMIN
Assigned site transport
CUSTOMER_INTERNAL
PROCESS_TRANSPORT_ADMIN
Assigned process transport
CUSTOMER_INTERNAL
MANAGER
Assigned team/process approvals
CUSTOMER_INTERNAL
TEAM_LEADER
Assigned team transport
CUSTOMER_INTERNAL
EMPLOYEE
Own transport
VENDOR_EXTERNAL
VENDOR_ADMIN
Vendor organization and assigned customer scope
VENDOR_EXTERNAL
VENDOR_SUB_ADMIN
Delegated vendor scope
VENDOR_EXTERNAL
VENDOR_DISPATCHER
Vendor dispatch
VENDOR_EXTERNAL
VENDOR_FLEET_MANAGER
Vendor vehicles/fleet
VENDOR_EXTERNAL
VENDOR_DRIVER_MANAGER
Vendor drivers
VENDOR_EXTERNAL
VENDOR_FINANCE
Vendor billing
VENDOR_EXTERNAL
VENDOR_VIEWER
Vendor read-only
VENDOR_EXTERNAL
VENDOR_COORDINATOR
Vendor trip coordination
DRIVER_EXTERNAL
DRIVER
Own driver account, vehicle and assigned trips
GUARD_EXTERNAL
GUARD
Assigned site security/verification
4. SUPER ADMIN — Fully Functional Platform
The current blank Platform page must be replaced by real modules. Super Admin is the platform tenant administrator and must have an actual Create Company workflow.
Platform Control Center
Companies: Create/List/Search/View/Edit/Activate/Suspend/Archive
Company onboarding wizard
Sites and Processes
Global roles and permission catalogue
User access management
Access Simulator
Security/MFA/session controls
Audit log
Platform billing
Global reports/export
Integrations/API clients/webhooks
System health/background jobs
Feature/configuration management
4.1 Create Company — Required Fields
Field
Required
Rule
Legal Name
YES
Unique company record
Display Name
YES
UI display
Company Code
YES
Unique tracking identifier; immutable after activation unless controlled migration
Billing Model
YES
COMPANY / SITE / PROCESS
Primary Contact
YES
Customer owner
Office Email
YES
Verified
Mobile
YES
Verified
Alternate Mobile
NO
Validated if supplied
Address
YES
Primary/registered address
Country/Timezone
YES
Operational context
Status
YES
ACTIVE / SUSPENDED / ARCHIVED
Contract dates
NO
Commercial metadata
Default transport policy
YES
Initial policy
Default safety policy
YES
Initial safety baseline
Create Company must be transactional: validate uniqueness → create company → create default configuration → optionally invite first admin → write audit event. A failure must not leave a half-created tenant.
5. Permission Engine — ON/OFF Toggles
The UI must present responsibilities as explicit toggles. The backend uses the same stable key. Toggle state is never cosmetic.
Effective permission = authenticated AND active account AND active role AND permission ON AND allowed scope AND resource in scope AND no system deny
Permission key
Responsibility
Default authority
company.view
View companies
Platform authorized
company.create
Create company
SUPER_ADMIN
company.edit
Edit company
Platform authorized
company.activate
Activate company
SUPER_ADMIN
company.suspend
Suspend company
SUPER_ADMIN
company.archive
Archive company
SUPER_ADMIN
site.view
View sites
Scoped admin
site.create
Create site
Company admin
site.edit
Edit site
Scoped admin
process.view
View processes
Scoped admin
process.create
Create process
Company admin
process.edit
Edit process
Scoped admin
user.view
View users
Authorized admin
user.create
Create user
Authorized admin within authority
user.edit
Edit user
Authorized admin
user.disable
Disable user
Security/admin
user.change_role
Change role
Authorized role administrator
user.assign_scope
Assign company/site/process/team scope
Authorized scope administrator
role.view
View roles
Security/admin
role.create
Create custom role
Authorized role administrator
role.edit
Edit role
Authorized role administrator
role.assign
Assign role
Authorized role administrator
permission.view
View permissions
Security/admin
permission.grant
Grant permissions
Only within grantable authority
permission.revoke
Revoke permissions
Authorized administrator
employee.create
Create employee
TRANSPORT_ADMIN only
employee.onboard
Onboard employee
TRANSPORT_ADMIN only
employee.edit
Edit transport employee master
TRANSPORT_ADMIN
employee.offboard
Offboard employee
TRANSPORT_ADMIN only
employee.view
View employee
Scoped roles
employee.location.view
View employee location
Authorized operational scope
employee.location.edit
Edit pickup/drop location
TRANSPORT_ADMIN
booking.self
Book own transport
Employee and authorized roles
booking.team
Book team transport
Team-authorized roles
booking.process
Book process transport
Process-authorized roles
booking.company
Book company-wide transport
Transport-authorized roles
booking.edit
Edit booking
Authorized scope
booking.cancel
Cancel booking
Authorized scope
trip.view
View trips
Scoped roles
trip.assign
Assign trip
Dispatch roles
trip.unassign
Unassign trip
Transport Admin/dispatch
trip.reassign
Reassign complete trip
Transport Admin/dispatch
trip.employee_reassign
Move one/multiple passengers
Transport Admin/dispatch
trip.cancel
Cancel trip
Authorized dispatch
driver.view
View drivers
Scoped
driver.create
Create driver record
Authorized vendor/transport
driver.assign
Assign driver
Dispatch
driver.activate
Manage driver availability
Authorized operations
vehicle.view
View vehicles
Scoped
vehicle.create
Create vehicle
Fleet/vendor admin
vehicle.assign
Assign vehicle
Fleet/dispatch
route.view
View routes
Scoped
route.create
Create route
Route/transport admin
route.edit
Edit route
Route/transport admin
schedule.view
View schedules
Scoped
schedule.create
Create schedule
Transport operations
schedule.edit
Edit schedule
Transport operations
noshow.view
View no-shows
Scoped
noshow.mark
Mark employee no-show
DRIVER + authorized operations
noshow.approve
Approve no-show
Authorized transport
noshow.override
Override no-show
Senior transport authority
policy.view
View policies
Scoped
policy.edit
Edit policies
Authorized policy admin
vendor.view
View vendors
Vendor manager/transport
vendor.create
Create vendor
Vendor manager/transport
vendor.edit
Edit vendor
Vendor manager/transport
report.view
View reports
Scoped
report.export_excel
Export Excel
Authorized reporting
report.export_pdf
Export PDF
Authorized reporting
report.export_csv
Export CSV
Authorized reporting
audit.view
View audit
Security/auditor
audit.export
Export audit
Security/auditor
gps.view_live
View live GPS
Control room/authorized transport
gps.view_driver
View driver GPS
Authorized scope
emergency.manage
Manage emergency incidents
Safety/control room
6. User Profile — Access & Responsibilities Screen
Every admin must be able to open an authorized user profile and see identity, organization, role, scope and exact access. The access section is the source of truth for what the user can do.
IDENTITYName | User ID/Employee ID | Office Email | Mobile | Alternate Mobile | StatusORGANIZATIONSecurity Domain | Company Code(s) | Site Code(s) | Process Code(s) | Team(s)ROLEPrimary Role | Secondary Role(s) if policy permits | Effective From | Effective ToRESPONSIBILITIES[ON] Create Company[OFF] Suspend Company[ON] View Employees[ON] Book Own Transport[ON] Book Team Transport[OFF] Book Entire Process[OFF] Book Company-wide...EFFECTIVE ACCESSAllowed / Denied with reasonAUDITWho changed | When | Before | After | Reason
A delegated administrator may not switch ON a permission that exceeds the grantor's own authority. System-denied permissions cannot be overridden by a normal user toggle.
7. Customer Employee Master — Transport Admin Only
The employee transport master is deliberately independent of HRMS. Only TRANSPORT_ADMIN can create/onboard and offboard the employee transport record. Other roles may receive view/edit access only if a separate explicit permission exists, but the actual onboard/offboard authority remains Transport Admin.
Field
Required
Full Name
YES
Employee ID
YES
Company Code
YES
Site Code
YES
Process Code
YES
Office Email
YES
Mobile Number
YES
Alternate Mobile Number
NO
Gender
YES where safety policy requires
Designation
NO
Department
NO
Manager ID
NO
Team ID
NO
Shift/Shift Group
NO
Pickup Latitude
YES for transport
Pickup Longitude
YES for transport
Pickup Address
YES
Office/Site Latitude
YES
Office/Site Longitude
YES
Office/Site Address
YES
Transport Eligible
YES
Transport Status
YES
Effective From
YES
Effective To
NO
Emergency Contact
Policy dependent
7.1 Onboard Employee
Transport Admin opens Employees → Add Employee.
System limits selectable Company/Site/Process to the administrator's scope.
Enter identity, company/site/process, contact, shift, safety and location data.
Validate Employee ID uniqueness within company, email/mobile formats and coordinates.
Preview record and scope.
Confirm ONBOARD.
Persist employee and audit event.
Do not silently cancel unrelated future bookings.
7.2 Offboard Employee
Transport Admin opens employee → Offboard.
Require effective date/time and reason.
Show future bookings/trips that may be affected.
Apply an explicit documented disposition to future bookings; never silently destroy operational history.
Set transport status OFFBOARD.
Block new transport bookings after effective time.
Preserve historical trips, invoices, no-shows and audit records.
Write immutable audit event.
8. Company/Site/Process Scope
User → Company Scope(s) → Site Scope(s) → Process Scope(s) → Team Scope(s) → Resource authorization
Normalize scope in assignment tables; never rely on comma-separated strings.
Every request is checked against resource company/site/process.
Changing a URL/query parameter cannot expand scope.
Multiple sites/processes are supported for directors, transport admins and other authorized roles.
Vendor scope is additionally constrained by vendor identity.
9. Booking Authority
Capability
Employee
Team Leader
Process Admin
Transport Admin
Book own
ON
ON
ON
ON
Book team
OFF
ON
ON
ON
Book entire process
OFF
OFF
ON
ON
Book company-wide
OFF
OFF
OFF
ON if granted
Enter process code
OFF
OFF
ON
ON
Bulk select employees
OFF
Team scope
Process scope
Authorized company/site/process scope
Set coordinates
Own authorized data
Team scope if granted
Process scope
Authorized scope
The exact ON/OFF state is configurable only by authorized administrators and remains bounded by role/domain/system policy.
10. Scheduling, Routes, Policies and Clubbing
Authorized Transport Admin, Transport Sub Admin and Coordinator can create exact service times such as 01:00, 01:30, etc.
Schedules support one-time and recurring services.
Configure shuttle/cab availability, pickup/drop windows, booking cutoff and dispatch cutoff.
Configure routes, stops, geofences and capacities.
Configure clubbing eligibility and optimization rules.
Configure no-show waiting window and escalation.
Configure female passenger safety rules.
Configure driver shift windows, breaks and sleepy/unavailable state.
Preview demand/capacity before publishing changes.
11. Driver and Vendor Operations
Drivers may be freelancers or vendor-employed. A driver must explicitly mark Active in the MoveInSync mobile application before dispatch eligibility.
OFFLINE → ACTIVE/AVAILABLE → ON_TRIP → ACTIVE/AVAILABLEACTIVE/AVAILABLE → BREAK → ACTIVE/AVAILABLEACTIVE/AVAILABLE → SLEEPY → unavailableACTIVE/AVAILABLE → EMERGENCY → unavailable + incident
Vendor, Company Code, Site Code and Process Code are explicit on driver/vehicle assignment.
Driver dashboard shows available/on trip/break/sleepy/emergency/offline.
Driver can mark break and feeling sleepy when no trip is active.
Driver can maintain preferred operating areas on a map.
Preferred areas rank dispatch; they are not an absolute refusal rule when demand increases.
No preferred area means driver can receive any authorized assignment.
12. Dispatch, Reassignment and Capacity Optimization
Transport Admin can assign/unassign/reassign a complete trip to another driver.
Transport Admin can move one employee or multiple selected employees to another cab/trip.
Before moving passengers, show capacity, route/time impact and female safety impact.
When a driver is completing a drop and a compatible pickup exists on the same/nearby route, optimizer may reuse the same driver subject to all safety/capacity/scope constraints.
No-show can release capacity for immediate compatible assignment.
Driver preferred area is a ranking signal, not a hard safety override.
12.1 Control Room Statuses
Drivers available
Drivers on trip
Cab assignment done
Waiting for dispatch
Dispatched
Driver arrived
Trip started
Trip completed
Exceptions
GPS stale/offline
Emergency
13. Trip Start/End and OTP
Driver GPS records arrival at configured site geofence.
Employee one-time code/OTP is verified when configured.
Trip start follows the configured start rule, such as OTP completion or authorized override.
Trip completion follows configured site/drop geofence and completion rules.
All transitions are timestamped.
Driver can mark employee no-show during the configured waiting window.
Valid no-show can release capacity for optimization without deleting history.
14. GPS and Mobile Internet
Driver mobile app is the primary GPS source.
GPS event includes driver/device/trip IDs, timestamp, latitude, longitude, accuracy and optional speed/heading/connectivity.
Use authenticated ingestion and server-side validation.
Mobile app queues location events during intermittent internet and retries safely.
Dashboard distinguishes LIVE, STALE and OFFLINE.
Continuous driver location is visible only to authorized roles and scopes.
Employee pickup coordinates are disclosed only when operationally necessary.
15. Billing
Billing aggregation is independent of authorization and may be COMPANY, SITE or PROCESS level.
COMPANY → one consolidated billing streamSITE → separate billing per sitePROCESS → separate billing per process
Billing configuration has effective dates.
Operational access does not change when billing level changes.
Invoices trace to underlying trips/charges.
Reconciliation compares operational and financial records.
Finance permissions remain separate from transport permissions.
16. Reports and Exports
Employee Master
Driver Availability
Vehicle Utilization
Trip/Dispatch
No-Show
Route Utilization
Cost
Invoice/Reconciliation
Safety/Incident
Audit
Every report has company/site/process/date/status filters, pagination, refresh and export. Excel must be real .xlsx; PDF must be readable; CSV may be offered for bulk data. Export jobs and downloads enforce the same authorization scope as the source data.
17. Role-Specific Dashboards
Role
Landing dashboard
Key functions
SUPER_ADMIN
Platform Control Center
Companies, sites, processes, users, roles, permissions, security, audit, billing, integrations
COMPANY_ADMIN
Company Overview
Company users, sites, processes, policies, transport overview
DIRECTOR
Executive Transport Overview
Multi-site/process KPIs, utilization, cost, exceptions
TRANSPORT_HEAD
Transport Executive
Utilization, cost, vendors, safety, service performance
TRANSPORT_ADMIN
Transport Operations Control Room
Employees, bookings, dispatch, trips, drivers, vehicles, routes, schedules, policies, no-show, reports
TRANSPORT_COORDINATOR
Dispatch & Scheduling
Schedules, dispatch, live trips, driver availability, route execution
PROCESS_ADMIN
Process Transport
Process employees, bookings, trips, utilization, process reports
SITE_ADMIN
Site Operations
Site employees, routes, schedules, trips, exceptions
TEAM_LEADER
Team Transport
Team employees, team bookings, team trips, no-shows
EMPLOYEE
My Transport
Book own, upcoming/past trips, pickup, cancellation, safety
VENDOR_ADMIN
Vendor Operations
Drivers, vehicles, assigned trips, compliance, dispatch
VENDOR_DISPATCHER
Vendor Dispatch
Assigned trips, driver/vehicle assignment
DRIVER
Driver App
Active, trip, navigation, OTP, no-show, break, sleepy, emergency, history
GUARD
Site Security
Vehicle/driver/trip verification, site entry/exit, incidents
FINANCE_ADMIN
Finance & Reconciliation
Invoices, reconciliation, costs, exports
SECURITY_ADMIN
Security Operations
Access, sessions, security events, audit
AUDITOR
Audit & Compliance
Read-only audit and reports
18. Access Simulator — Mandatory
Super Admin/Security Admin needs a test tool to answer exactly why a user can or cannot do something.
Select User → Role → Company → Site(s) → Process(es) → Team(s) → Preview Effective AccessALLOWED  booking.team  trip.view  report.export_excelDENIED  company.create (ROLE_NOT_ALLOWED)  booking.process (OUT_OF_SCOPE)  finance.approve (PERMISSION_OFF)
19. Role Change Workflow
Authorized administrator opens user profile.
Select new role.
System displays old vs new permissions and scopes.
Require reason and effective time if policy requires.
Persist role/scope change transactionally and write audit.
Invalidate/revalidate active sessions/tokens.
Recalculate effective permissions.
Dashboard/navigation changes.
Old role-only APIs return 403.
20. Minimum Database Model
usersuser_credentialsrolespermissionsrole_permissionsuser_rolesuser_permission_overridesorganizationscompaniescompany_sitesprocessesuser_company_scopesuser_site_scopesuser_process_scopesteamsteam_membersemployeesemployee_transport_profilesemployee_locationsvendorsvendor_company_scopesvendor_site_scopesvendor_process_scopesdriversdriver_assignmentsdriver_status_eventsdriver_preferred_areasvehiclesvehicle_assignmentsroutesroute_stopsschedulesbookingsbooking_passengerstripstrip_passengerstrip_assignmentstrip_eventsgps_eventsno_show_eventstransport_policiessafety_policiesincidentsinvoicesinvoice_linesreconciliationsaudit_logsnotificationsapi_clientswebhooksexport_jobs
21. Critical API Surface
Endpoint
Purpose
Authority
POST /api/v1/platform/companies
Create company
SUPER_ADMIN
GET /api/v1/platform/companies
List companies
Platform authorized
PATCH /api/v1/platform/companies/:id
Edit
Authorized platform
POST /api/v1/platform/companies/:id/activate
Activate
SUPER_ADMIN
POST /api/v1/platform/companies/:id/suspend
Suspend
SUPER_ADMIN
GET /api/v1/users/:id/access
Effective access
Security/admin
PATCH /api/v1/users/:id/role
Change role
Role admin
PATCH /api/v1/users/:id/permissions
Change ON/OFF toggles
Permission admin
PATCH /api/v1/users/:id/scope
Change scope
Scope admin
POST /api/v1/transport/employees
Onboard/create
TRANSPORT_ADMIN
PATCH /api/v1/transport/employees/:id
Edit
TRANSPORT_ADMIN
POST /api/v1/transport/employees/:id/offboard
Offboard
TRANSPORT_ADMIN
POST /api/v1/bookings
Create booking
Booking permission + scope
POST /api/v1/trips/:id/assign
Assign
trip.assign
POST /api/v1/trips/:id/unassign
Unassign
trip.unassign
POST /api/v1/trips/:id/reassign
Reassign whole trip
trip.reassign
POST /api/v1/trips/:id/passengers/reassign
Move passenger(s)
trip.employee_reassign
POST /api/v1/trips/:id/noshow
Mark no-show
noshow.mark
POST /api/v1/gps/events
GPS ingestion
Authenticated driver device
GET /api/v1/control-room/live
Live control room
Scoped transport
POST /api/v1/reports/:type/export
Create export
report.export_*
GET /api/v1/audit
Audit
audit.view
22. Authorization Must Be Server-Side
authorize(request, permission, resource):  authenticate  load active security domain  load roles + ON/OFF overrides  calculate effective permission  calculate company/site/process/team scope  verify resource is inside scope  apply system deny  allow transaction + audit OR return 403
Never trust role_id, company_code, site_code, process_code or user_id sent by the browser as proof of authority. The server resolves the authenticated identity and scope from trusted records.
23. Audit and Traceability
Role changes
Permission toggle changes
Scope changes
Company create/edit/activate/suspend
Employee onboard/offboard/edit
Booking create/edit/cancel
Trip assign/unassign/reassign
Passenger movement
No-show
Policy changes
Vendor/driver/vehicle changes
Exports
Security events
Audit field
Requirement
Actor
User/service identity
Action
Stable action key
Object
Entity and ID
Timestamp
Server timestamp
Before
Previous state where relevant
After
New state where relevant
Reason
Required for configured sensitive changes
Company/Site/Process
Resolved scope
Request/Correlation ID
Traceability
IP/device
Security metadata where appropriate
24. UI Rules — No Fake Functionality
No placeholder pages in production.
No hard-coded demo counts.
Empty state, loading state, API error, validation error and 403 state are distinct.
Every button performs a real operation or is disabled with an explanation.
Tables load from real services.
Destructive actions require confirmation and reason where configured.
Bulk operations show selection count and impact preview.
Direct URLs to forbidden modules must not reveal data.
Permission changes are reflected without requiring manual code changes.
25. Production Test / Acceptance Matrix
Test
Expected
Super Admin creates company
Company persists; appears in list; audit written; optional first admin invitation works
Non-Super Admin creates company
403; no mutation
Transport Admin onboards employee
All required fields persist; employee appears in correct scope
Coordinator onboards employee
403; no mutation
Transport Admin offboards
Status changes; future impact preview; history preserved
Team Leader books own
Allowed
Team Leader books unrelated process
403
Process Admin books assigned process
Allowed
Role changed
Effective access/dashboard changes; old APIs denied
Permission toggled OFF
Corresponding API denied
Vendor accesses another vendor
403
Driver Active
Eligible for dispatch
Driver Sleepy
Removed from eligible dispatch
Driver no-show
Event stored; capacity recalculated
Trip reassigned
Assignments updated atomically
Passenger moved
Only selected passenger changes
GPS received
Persisted; live state updates
GPS stale
Dashboard shows stale/offline
Excel export
Valid scoped XLSX
PDF export
Valid scoped PDF
Audit
Sensitive mutations traceable
26. Production Hardening Checklist
Versioned database migrations
Backups and tested restore
Environment-managed secrets
Secure authentication and privileged-role MFA policy
Rate limiting
Input/schema validation
Tenant isolation tests
Authorization tests for every critical permission
Structured logs and correlation IDs
Health/readiness endpoints
Queue retry/dead-letter strategy
GPS retry/offline handling
Export job isolation
Monitoring/alerts for API/database/queue/GPS/dispatch/auth failures
No production demo accounts unless explicitly enabled
CI unit/integration/API/authorization/critical UI tests
Deployment migration/rollback procedure
27. Implementation Order — Fix Functionality Before Cosmetics
Implement company/site/process data model.
Implement Super Admin company CRUD first and verify end-to-end.
Implement permission catalogue and role matrix.
Implement user role/scope assignment and effective-access engine.
Implement profile Access & Responsibilities ON/OFF toggles.
Implement Transport Admin employee onboarding/offboarding.
Implement permission-derived dashboards/navigation.
Implement self/team/process/company booking authority.
Implement schedules/routes/policies/clubbing.
Implement vendor/driver/vehicle and driver state.
Implement dispatch/reassignment/no-show/capacity optimization.
Implement GPS ingestion/live control room.
Implement reports/Excel/PDF.
Implement billing/reconciliation.
Implement security/audit.
Remove all placeholders and run acceptance matrix.
28. Final Master Rules
SUPER_ADMIN must have a real Companies → Create Company action; the Platform landing page cannot be blank.
TRANSPORT_ADMIN controls employee transport onboarding/offboarding.
HRMS is optional and cannot silently control transport state.
Company Code, Site Code and Process Code are first-class tracking dimensions.
Directors and Transport Admins can have multiple authorized sites/processes.
Billing can aggregate by company, site or process independently of operational scope.
Every responsibility is represented by ON/OFF permission toggles and enforced by APIs.
Internal and external roles are isolated security domains.
Role changes alter actual permissions, not merely labels.
Dashboard differences are functional, not cosmetic.
Drivers must mark Active in the mobile application before dispatch.
Driver break/sleepy/emergency states remove dispatch eligibility as appropriate.
No-show can release capacity for optimization without deleting history.
Safety and female transport rules always outrank optimization.
Every sensitive mutation is auditable.
A placeholder screen or fake metric is a failed implementation, not a completed feature.
Appendix A — Example Transport Admin Access Screen
USER: Transport AdminDOMAIN: CUSTOMER_INTERNALCOMPANY SCOPE[ON] ABCSITE SCOPE[ON] BLR01  [ON] BLR02  [OFF] PUNE01PROCESS SCOPE[ON] P01  [ON] P02  [OFF] P03EMPLOYEES[ON] View  [ON] Create/Onboard  [ON] Edit  [ON] OffboardBOOKING[ON] Own  [ON] Team  [ON] Process  [ON] CompanyTRIPS[ON] View  [ON] Assign  [ON] Unassign  [ON] Reassign  [ON] Move PassengerDRIVERS / VEHICLES[ON] View  [ON] Assign  [ON] UnassignNO-SHOW[ON] View  [ON] Mark  [ON] Approve  [ON] OverrideROUTES / SCHEDULES[ON] View  [ON] Create  [ON] EditREPORTS[ON] View  [ON] Excel  [ON] PDFPLATFORM[OFF] Create Company  [OFF] Manage Platform Roles  [OFF] Cross-Tenant Audit
Appendix B — Employee Add Form
EMPLOYEE TRANSPORT MASTERFull Name *Employee ID *Company Code *Site Code *Process Code *Office Email *Mobile Number *Alternate MobileGenderDesignationDepartmentManager IDTeam IDShiftPICKUPLatitude *Longitude *Address *Map PickerOFFICE/DROPSite Latitude *Site Longitude *Site Address *Transport Eligible *Status: ONBOARD/OFFBOARDEffective From *Effective To[Cancel] [Save Draft] [ONBOARD EMPLOYEE]
Appendix C — Company Create Form
CREATE COMPANY — SUPER ADMIN ONLYLegal Name *Display Name *Company Code *Billing Model *  COMPANY / SITE / PROCESSPrimary Contact *Office Email *Mobile *Alternate MobileAddress *Country *Timezone *Contract Start / EndDefault Transport PolicyDefault Safety PolicyStatus[Cancel] [Create Company]
Appendix D — Required Error/Empty States
No companies: show Create Company to Super Admin; never show a blank white page.
No permission: show a clear 403/access-denied state without data.
API unavailable: show service error + retry, not fake zeros.
No employees in scope: show Add Employee only to Transport Admin; explain scope.
No drivers available: show actual availability and reason; never fabricate a driver count.
Export running: show job status and secure download when complete.
Appendix E — Release Gate
The release cannot be called production-ready until a tester can, from a clean environment, create a company as Super Admin; create its sites/processes; create/assign users; toggle responsibilities ON/OFF; verify each role gets the correct dashboard; onboard/offboard an employee as Transport Admin with Company/Site/Process/contact/location fields; create self/team/process/company bookings according to permission; schedule service times; dispatch and reassign trips; process OTP/no-show; receive GPS; generate scoped Excel/PDF reports; and inspect the audit trail. Any missing or fake step blocks release.