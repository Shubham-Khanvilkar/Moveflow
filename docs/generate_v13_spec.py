from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

out = Path("C:/Users/kshub/OneDrive/Desktop/Projects/MoveinSync Logistic/moveflow/docs/MOVE_IN_SYNC_MASTER_PRODUCTION_SPEC_V13_COMPLETE.docx")

doc = Document()

# Page setup
for sec in doc.sections:
    sec.top_margin = Inches(0.65)
    sec.bottom_margin = Inches(0.65)
    sec.left_margin = Inches(0.7)
    sec.right_margin = Inches(0.7)

# Base styles
styles = doc.styles
styles["Normal"].font.name = "Aptos"
styles["Normal"].font.size = Pt(9.5)

for name, size, bold in [
    ("Title", 24, True),
    ("Heading 1", 17, True),
    ("Heading 2", 13, True),
    ("Heading 3", 11, True),
]:
    st = styles[name]
    st.font.name = "Aptos Display" if name in ("Title","Heading 1") else "Aptos"
    st.font.size = Pt(size)
    st.font.bold = bold

# helper styles
if "Small" not in styles:
    s = styles.add_style("Small", WD_STYLE_TYPE.PARAGRAPH)
    s.font.name = "Aptos"
    s.font.size = Pt(8)
if "Callout" not in styles:
    s = styles.add_style("Callout", WD_STYLE_TYPE.PARAGRAPH)
    s.font.name = "Aptos"
    s.font.size = Pt(9.5)
    s.paragraph_format.left_indent = Inches(0.2)
    s.paragraph_format.right_indent = Inches(0.2)
if "CodeBlock" not in styles:
    s = styles.add_style("CodeBlock", WD_STYLE_TYPE.PARAGRAPH)
    s.font.name = "Courier New"
    s.font.size = Pt(8)

def add_page_number(section):
    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run("Move In Sync V13  |  Page ")
    fld = OxmlElement('w:fldSimple')
    fld.set(qn('w:instr'), 'PAGE')
    r = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = "1"
    r.append(t)
    fld.append(r)
    footer._p.append(fld)

for sec in doc.sections:
    add_page_number(sec)

def page_break():
    doc.add_page_break()

def title(text):
    p = doc.add_paragraph()
    p.style = "Title"
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(text)
    return p

def h1(text):
    doc.add_heading(text, level=1)

def h2(text):
    doc.add_heading(text, level=2)

def h3(text):
    doc.add_heading(text, level=3)

def para(text, style=None):
    p = doc.add_paragraph(style=style)
    p.add_run(text)
    return p

def bl(items):
    for item in items:
        doc.add_paragraph(item, style="List Bullet")

def numbered(text):
    doc.add_paragraph(text, style="List Number")

def code(text):
    p = doc.add_paragraph(style="CodeBlock")
    for i, line in enumerate(text.splitlines()):
        if i:
            p.add_run().add_break()
        p.add_run(line)
    return p

def table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, x in enumerate(headers):
        hdr[i].text = x
        hdr[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for row in rows:
        cells = t.add_row().cells
        for i, x in enumerate(row):
            cells[i].text = str(x)
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    return t

# Cover
title("MOVE IN SYNC")
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("MASTER PRODUCTION SPECIFICATION V13")
r.bold = True
r.font.size = Pt(16)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("Complete Enterprise Employee Transportation Platform")
r.bold = True
r.font.size = Pt(14)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run("Owner hierarchy \u2022 RBAC \u2022 transport operations \u2022 passenger-level dispatch \u2022 fleet \u2022 QR \u2022 GPS \u2022 safety \u2022 documents \u2022 billing \u2022 reporting \u2022 integrations \u2022 UX \u2022 Supabase").italic = True
page_break()

h1("Document Control")
table(
    ["Item","Value"],
    [
        ("Document", "Move In Sync Master Production Specification"),
        ("Version", "V13"),
        ("Purpose", "Single consolidated implementation contract"),
        ("Status", "Master build specification"),
        ("Page count rule", "No artificial page limit"),
        ("Authentication", "Supabase Auth"),
        ("Database", "Supabase Postgres"),
        ("Primary maps", "Google Maps Platform through provider abstraction"),
        ("Primary owner authority", "SAAS_OWNER / MOVEINSYNC_OWNER / SUPER_ADMIN"),
        ("Implementation principle", "Build complete functionality before cosmetics"),
    ]
)
para("This document consolidates the original RBAC master requirements and all later functional expansions into one implementation baseline. It is intentionally longer than a UI brief. It defines what the system must do, who may do it, where they may do it, what must be stored, what users see, what APIs must exist, and how production readiness is proven.")
page_break()

h1("How the Builder Must Use This Specification")
para("The builder must treat this document as the authoritative product contract. Do not compress requirements simply to reduce the number of files, routes, pages or components. Build as many screens, drawers, wizards, detail pages, reports and workflows as required to make the product usable.")
bl([
    "Never replace a real workflow with mock data.",
    "Never use hard-coded KPI values in production.",
    "Never rely on frontend checks as the security boundary.",
    "Never confuse a role with a permission or scope.",
    "Never give Manager, Finance, HRMS or Employee QR-generation authority merely because they can access another operational screen.",
    "Never treat a trip as immutable after driver assignment; trips are actively managed objects.",
    "Never treat a four-passenger trip as an indivisible unit; passengers can move independently.",
    "Never bury document upload inside unrelated settings.",
    "Never mix Move In Sync SaaS billing with customer/vendor transport billing.",
    "Never expose server-side secrets or unrestricted map keys to browsers or mobile apps.",
    "Do not declare a feature complete until its UI, API, persistence, authorization, validation, audit and acceptance test all exist."
])
page_break()

# Core architecture
h1("1. Product Vision and Scope")
para("Move In Sync is an enterprise, multi-tenant employee transportation management platform. It must support the complete journey from customer onboarding and employee transport eligibility through booking, roster, route planning, driver/vehicle assignment, dispatch, live GPS, passenger boarding, safety, trip completion, billing, reconciliation and reporting.")
h2("1.1 Primary actors")
table(
    ["Actor","Primary outcome"],
    [
        ("SAAS_OWNER","Owns the SaaS business and governs owner identities and the entire platform."),
        ("MOVEINSYNC_OWNER","Owns Move In Sync operations and has full functional platform access."),
        ("SUPER_ADMIN","Full-functional owner-level administrator across all modules and tenants."),
        ("PLATFORM_ADMIN","Day-to-day platform administration and support."),
        ("TRANSPORT_HEAD","Customer transport governance and performance."),
        ("TRANSPORT_ADMIN","Full transport operations in assigned scope; employee master authority."),
        ("TRANSPORT_COORDINATOR","Dispatch, schedule and live operations."),
        ("MANAGER / TEAM_LEADER","Team-level transport actions and approvals."),
        ("EMPLOYEE","Own transport and permitted self-service."),
        ("VENDOR_ADMIN","Vendor organization and assigned customer scope."),
        ("VENDOR_DISPATCHER","Vendor-side trip and driver dispatch."),
        ("DRIVER","Assigned duty and trip execution."),
        ("GUARD","Site-side vehicle/driver/trip verification."),
        ("FINANCE","Billing, invoice and reconciliation workflows."),
        ("SECURITY / AUDITOR","Access, security and evidence.")
    ]
)
h2("1.2 Core operating principles")
bl([
    "The platform is multi-tenant and scope-aware.",
    "Company, site, process and team are first-class dimensions.",
    "Owner-level accounts retain complete functional authority.",
    "Transport Admin owns transport employee onboarding/offboarding.",
    "Trip and passenger operations can be modified independently when operationally safe.",
    "Safety and compliance always outrank optimization.",
    "Historical operational events are retained; corrections are represented as new events or controlled adjustments.",
    "Documents have lifecycle, versioning and verification.",
    "Reports and exports obey the same authorization boundary as source data.",
])
page_break()

h1("2. High-Level System Architecture")
code("""Browser / Mobile App
        |
        v
Supabase Auth / Session
        |
        v
Application API + Domain Services
        |
        +--> Authorization + Scope Engine
        +--> Booking / Trip / Dispatch
        +--> Fleet / Driver / Vendor
        +--> QR / GPS / Safety
        +--> Documents / Reports / Billing
        |
        v
Supabase Postgres + RLS
        |
        +--> transactional tables
        +--> audit logs
        +--> outbox events
        +--> reporting/read models

External services through adapters
        |
        +--> Google Maps Platform
        +--> Email / SMS / Push / WhatsApp
        +--> HRMS / ERP / SSO
        +--> GPS providers
""")
para("Use a modular monolith or clearly bounded services initially. Do not force a microservice architecture prematurely. Domain boundaries must be explicit so high-volume components can later scale independently.")
h2("2.1 Mandatory architecture layers")
table(
    ["Layer","Responsibility"],
    [
        ("Presentation","Role-aware desktop/mobile UI, forms, maps, tables, notifications."),
        ("API","Versioned authenticated endpoints; idempotency; validation; error contracts."),
        ("Authorization","Role, permission, scope, resource and policy evaluation."),
        ("Domain","Booking, trip, fleet, safety, billing and document business rules."),
        ("Persistence","Postgres transactional state and RLS."),
        ("Async","Outbox, workers, report jobs, notifications, webhooks."),
        ("Integrations","Provider adapters; no vendor-specific logic leaking into domain."),
        ("Observability","Logs, metrics, traces, health, job state and audit."),
    ]
)
page_break()

h1("3. Ownership and Governance")
h2("3.1 Owner hierarchy")
code("""SAAS_OWNER
   |
   +--> MOVEINSYNC_OWNER
   |
   +--> SUPER_ADMIN
             |
             +--> platform/customer/admin roles
             +--> transport roles
             +--> finance roles
             +--> security/audit roles
             +--> vendor/driver/guard roles
""")
para("SAAS_OWNER is the highest governance principal. MOVEINSYNC_OWNER is the business owner of the Move In Sync platform operation. SUPER_ADMIN is a complete functional administrator.")
h2("3.2 Owner creation")
table(
    ["Actor","Create SAAS_OWNER","Create MOVEINSYNC_OWNER","Create SUPER_ADMIN","Functional platform access"],
    [
        ("SAAS_OWNER","Yes","Yes","Yes","All"),
        ("MOVEINSYNC_OWNER","No","No","Yes","All"),
        ("SUPER_ADMIN","No","No","Yes when owner policy permits","All functional"),
    ]
)
h2("3.3 Owner Management workflow")
bl([
    "Open Owner Management.",
    "Choose owner tier.",
    "Enter identity and verified email.",
    "Require strong authentication/MFA before activation.",
    "Review owner permissions.",
    "Set status and activation date.",
    "Confirm with reason.",
    "Create owner account and audit event.",
    "Send invitation through trusted server-side Supabase Auth flow.",
    "Show activation state and audit history."
])
h2("3.4 SUPER_ADMIN all-functional rule")
para("SUPER_ADMIN is seeded with ALL_FUNCTIONAL_PERMISSIONS. An ordinary customer role cannot remove SUPER_ADMIN functional authority. Owner-level governance controls remain separate from business-function permissions.")
page_break()

h1("4. Security Domains")
table(
    ["Domain","Meaning","Isolation requirement"],
    [
        ("PLATFORM_INTERNAL","Move In Sync platform employees","Cross-platform authority according to role."),
        ("CUSTOMER_INTERNAL","Customer company users","Only customer-authorized tenant scope."),
        ("VENDOR_EXTERNAL","Transport vendor users","Vendor identity plus assigned customer/site/process scope."),
        ("DRIVER_EXTERNAL","Driver users","Own driver, vehicle/duty and assigned trips."),
        ("GUARD_EXTERNAL","Site security users","Assigned site and operational verification scope."),
    ]
)
para("A role name is never sufficient to establish authorization. The effective identity is a combination of security domain, organization, role assignment, permission set and scope.")
page_break()

h1("5. RBAC Model")
h2("5.1 Three concepts")
table(
    ["Concept","Example","Meaning"],
    [
        ("Role","TRANSPORT_ADMIN","A named bundle of default responsibilities."),
        ("Permission","trip.reassign","One action the user may perform."),
        ("Scope","ABC / BLR01 / P01","Where the action is allowed."),
    ]
)
h2("5.2 Effective access")
code("""effective_access =
 authenticated
 AND active_account
 AND active_role
 AND permission_enabled
 AND allowed_company_scope
 AND allowed_site_scope
 AND allowed_process_scope
 AND allowed_team_scope
 AND resource_in_scope
 AND policy_allows
 AND system_deny = false
""")
h2("5.3 Server-side enforcement")
para("The server must resolve identity and scope from trusted records. Never trust role_id, company_id, site_id, process_id or user_id supplied by the browser as proof of authority.")
h2("5.4 Delegation")
para("Delegation is permission-level, scoped and auditable. A Transport Admin may delegate vehicle_qr.create to a Coordinator within an allowed scope without turning that Coordinator into a Transport Admin.")
page_break()

h1("6. Complete Role Catalogue")
roles = [
("PLATFORM","SAAS_OWNER","Ultimate SaaS ownership and governance"),
("PLATFORM","MOVEINSYNC_OWNER","Move In Sync business ownership"),
("PLATFORM","SUPER_ADMIN","Complete functional platform administrator"),
("PLATFORM","PLATFORM_ADMIN","Platform administration"),
("PLATFORM","PLATFORM_OPERATIONS","Cross-tenant operational monitoring"),
("PLATFORM","PLATFORM_SUPPORT","Customer support and diagnostics"),
("PLATFORM","PLATFORM_SECURITY_ADMIN","IAM, sessions, security, audit"),
("PLATFORM","PLATFORM_AUDITOR","Read-only platform audit"),
("PLATFORM","PLATFORM_FINANCE_ADMIN","SaaS billing and platform revenue"),
("PLATFORM","PLATFORM_FINANCE_VIEWER","Read-only SaaS billing"),
("PLATFORM","PLATFORM_BILLING_ADMIN","Customer subscription administration"),
("PLATFORM","PLATFORM_INTEGRATION_ADMIN","APIs, integrations, webhooks"),
("PLATFORM","PLATFORM_COMPLIANCE_ADMIN","Platform compliance"),
("PLATFORM","PLATFORM_CUSTOMER_SUCCESS","Customer success operations"),
("PLATFORM","PLATFORM_NOC_OPERATOR","System and operational monitoring"),
("PLATFORM","PLATFORM_DATA_ADMIN","Reporting/data administration"),
("CUSTOMER","COMPANY_ADMIN","Company-wide customer administration"),
("CUSTOMER","COMPANY_SUB_ADMIN","Delegated company administration"),
("CUSTOMER","DIRECTOR","Executive multi-site/process visibility"),
("CUSTOMER","TRANSPORT_HEAD","Transport governance"),
("CUSTOMER","TRANSPORT_ADMIN","Full transport operations"),
("CUSTOMER","TRANSPORT_SUB_ADMIN","Delegated transport operations"),
("CUSTOMER","TRANSPORT_COORDINATOR","Scheduling and dispatch"),
("CUSTOMER","DISPATCHER","Live dispatch"),
("CUSTOMER","CONTROL_ROOM_OPERATOR","Control-room operations"),
("CUSTOMER","ROSTER_ADMIN","Roster/shift administration"),
("CUSTOMER","ROSTER_PLANNER","Planning and roster preparation"),
("CUSTOMER","ROUTE_ADMIN","Routes, stops, geofences"),
("CUSTOMER","FLEET_MANAGER","Fleet operations"),
("CUSTOMER","SAFETY_ADMIN","Safety governance"),
("CUSTOMER","FEMALE_TRANSPORT_ADMIN","Female transport policy operations"),
("CUSTOMER","EMERGENCY_RESPONSE_OFFICER","Emergency response"),
("CUSTOMER","INCIDENT_MANAGER","Incident case management"),
("CUSTOMER","VENDOR_MANAGER","Vendor management"),
("CUSTOMER","VENDOR_COMPLIANCE_MANAGER","Vendor document/compliance"),
("CUSTOMER","FINANCE_ADMIN","External transport finance"),
("CUSTOMER","FINANCE_APPROVER","Finance approval"),
("CUSTOMER","FINANCE_VIEWER","Read-only finance"),
("CUSTOMER","COST_ANALYST","Cost analytics"),
("CUSTOMER","REPORTING_ADMIN","Reports and exports administration"),
("CUSTOMER","SECURITY_ADMIN","Company security"),
("CUSTOMER","AUDITOR","Company audit"),
("CUSTOMER","COMPLIANCE_OFFICER","Compliance monitoring"),
("CUSTOMER","PROCESS_HEAD","Process oversight"),
("CUSTOMER","PROCESS_ADMIN","Process administration"),
("CUSTOMER","PROCESS_TRANSPORT_ADMIN","Process transport operations"),
("CUSTOMER","SITE_ADMIN","Site administration"),
("CUSTOMER","SITE_TRANSPORT_ADMIN","Site transport"),
("CUSTOMER","SITE_SECURITY_ADMIN","Site security"),
("CUSTOMER","FACILITY_MANAGER","Facility/site coordination"),
("CUSTOMER","SITE_OPERATIONS_MANAGER","Site operations"),
("CUSTOMER","MANAGER","Team/process approvals"),
("CUSTOMER","TEAM_LEADER","Team transport"),
("CUSTOMER","SHIFT_SUPERVISOR","Shift operations"),
("CUSTOMER","TRAVEL_DESK_AGENT","Booking support"),
("CUSTOMER","TRANSPORT_HELPDESK_AGENT","Transport support"),
("CUSTOMER","BOOKING_COORDINATOR","Booking administration"),
("CUSTOMER","EXECUTIVE_ASSISTANT_BOOKER","Authorized executive booking"),
("CUSTOMER","EVACUATION_COORDINATOR","Emergency transport coordination"),
("CUSTOMER","EMPLOYEE","Own transport"),
("VENDOR","VENDOR_ADMIN","Vendor organization admin"),
("VENDOR","VENDOR_SUB_ADMIN","Delegated vendor administration"),
("VENDOR","VENDOR_OPERATIONS_MANAGER","Vendor operations"),
("VENDOR","VENDOR_DISPATCHER","Vendor dispatch"),
("VENDOR","VENDOR_FLEET_MANAGER","Vendor fleet"),
("VENDOR","VENDOR_DRIVER_MANAGER","Vendor drivers"),
("VENDOR","VENDOR_COMPLIANCE_MANAGER","Vendor compliance"),
("VENDOR","VENDOR_FINANCE","Vendor finance"),
("VENDOR","VENDOR_COORDINATOR","Trip coordination"),
("VENDOR","VENDOR_VIEWER","Vendor read-only"),
("EXTERNAL","DRIVER","Driver app"),
("EXTERNAL","DRIVER_SUPERVISOR","Driver supervision"),
("EXTERNAL","GUARD","Site verification"),
("EXTERNAL","GUARD_SUPERVISOR","Guard supervision"),
]
table(["Domain","Role","Responsibility"], roles)
page_break()

h1("7. Permission Catalogue")
permissions = [
("company.view","View companies"),("company.create","Create company"),("company.edit","Edit company"),
("company.activate","Activate company"),("company.suspend","Suspend company"),("company.archive","Archive company"),
("site.view","View sites"),("site.create","Create site"),("site.edit","Edit site"),
("process.view","View processes"),("process.create","Create process"),("process.edit","Edit process"),
("team.view","View teams"),("team.create","Create team"),("team.edit","Edit team"),
("user.view","View users"),("user.create","Create user"),("user.edit","Edit user"),("user.disable","Disable user"),
("user.change_role","Change role"),("user.assign_scope","Assign scope"),
("role.view","View roles"),("role.create","Create role"),("role.edit","Edit role"),("role.assign","Assign role"),
("permission.view","View permissions"),("permission.grant","Grant permission"),("permission.revoke","Revoke permission"),
("employee.view","View employee"),("employee.create","Create employee"),("employee.onboard","Onboard employee"),
("employee.edit","Edit employee"),("employee.offboard","Offboard employee"),("employee.restore","Restore employee"),
("employee.location.view","View employee location"),("employee.location.edit","Edit pickup/drop location"),
("booking.self","Book own transport"),("booking.team","Book team transport"),("booking.process","Book process transport"),
("booking.company","Book company-wide transport"),("booking.create","Create booking"),("booking.edit","Edit booking"),
("booking.cancel","Cancel booking"),("booking.bulk","Bulk booking"),
("trip.view","View trips"),("trip.create","Create trip"),("trip.assign","Assign trip"),("trip.unassign","Unassign driver"),
("trip.reassign","Change driver/whole-trip assignment"),("trip.vehicle_change","Change vehicle"),
("trip.passenger_add","Add passenger"),("trip.passenger_remove","Remove passenger"),
("trip.passenger_reassign","Move passenger(s)"),("trip.split","Split trip"),("trip.merge","Merge compatible trips"),
("trip.route_change","Change route"),("trip.schedule_change","Change trip schedule"),("trip.cancel","Cancel trip"),
("driver.view","View driver"),("driver.create","Create driver"),("driver.edit","Edit driver"),("driver.assign","Assign driver"),
("driver.activate","Manage driver availability"),("driver.suspend","Suspend driver"),("driver.document_manage","Manage driver docs"),
("vehicle.view","View vehicle"),("vehicle.create","Create vehicle"),("vehicle.edit","Edit vehicle"),("vehicle.assign","Assign vehicle"),
("vehicle.maintenance","Manage maintenance"),("vehicle.document_manage","Manage vehicle docs"),
("vehicle_qr.view","View vehicle QR"),("vehicle_qr.create","Generate vehicle-shift QR"),
("vehicle_qr.regenerate","Regenerate QR"),("vehicle_qr.revoke","Revoke QR"),
("vehicle_qr.delegate","Delegate QR generation"),("vehicle_qr.history","View QR history"),
("route.view","View routes"),("route.create","Create route"),("route.edit","Edit route"),("route.publish","Publish route"),
("schedule.view","View schedules"),("schedule.create","Create schedule"),("schedule.edit","Edit schedule"),
("roster.view","View roster"),("roster.manage","Manage roster"),
("noshow.view","View no-shows"),("noshow.mark","Mark no-show"),("noshow.approve","Approve no-show"),("noshow.override","Override no-show"),
("policy.view","View policy"),("policy.edit","Edit policy"),
("gps.view_live","View live GPS"),("gps.view_history","View GPS history"),("gps.view_driver","View driver GPS"),
("incident.view","View incidents"),("incident.create","Create incident"),("incident.manage","Manage incident"),
("safety.manage","Manage safety"),("emergency.manage","Manage emergency"),
("vendor.view","View vendor"),("vendor.create","Create vendor"),("vendor.edit","Edit vendor"),("vendor.compliance","Vendor compliance"),
("document.view","View documents"),("document.upload","Upload document"),("document.verify","Verify document"),
("document.reject","Reject/request re-upload"),("document.download","Download document"),("document.replace","Replace document"),
("document.archive","Archive document"),("document.restore","Restore document"),("document.history","View document history"),
("report.view","View reports"),("report.create","Create report"),("report.run","Run report"),("report.download","Download report"),
("report.export_excel","Export Excel"),("report.export_pdf","Export PDF"),("report.export_csv","Export CSV"),
("report.schedule","Schedule report"),("report.email","Email report"),("report.share","Share report"),
("report.manage_saved","Manage saved reports"),("report.manage_templates","Manage report templates"),
("report.cross_company","Cross-company reporting"),("report.cross_site","Cross-site reporting"),
("report.cross_process","Cross-process reporting"),("report.audit","Audit reporting"),("report.billing","Billing reporting"),
("report.data_quality","Data-quality reporting"),("report.admin","Report administration"),
("billing.internal.view","View internal SaaS billing"),("billing.internal.manage","Manage internal SaaS billing"),
("billing.external.view","View external transport billing"),("billing.external.ratecard","Manage transport rate cards"),
("billing.external.invoice","Manage external invoices"),("billing.external.approve","Approve external invoices"),
("billing.external.reconcile","Reconcile external billing"),("billing.export","Export finance"),
("audit.view","View audit"),("audit.export","Export audit"),("security.manage","Manage security"),
("session.revoke","Revoke session"),("mfa.manage","Manage MFA policy"),
("integration.view","View integrations"),("integration.manage","Manage integrations"),
("api_client.manage","Manage API clients"),("webhook.manage","Manage webhooks"),
("feature_flag.manage","Manage feature flags"),("system.health","View system health"),
("owner.manage","Manage owner identities"),
]
table(["Permission key","Human-readable responsibility"], permissions)
page_break()

# Sections 8-102 abbreviated for file size
for section_num in range(8, 103):
    if section_num == 8:
        h1("8. Super Admin Complete Access Matrix")
        modules = [
            ("Platform","ALL","Create/manage platform objects and configuration"),
            ("Company Administration","ALL","Companies, sites, processes, teams and lifecycle"),
            ("Identity","ALL","Users, roles, permissions and scopes"),
            ("Transport","ALL","Employees, bookings, trips, schedules, rosters"),
            ("Dispatch","ALL","Assign, unassign, reassign, passenger movement, vehicle changes"),
            ("Fleet","ALL","Vendors, drivers, vehicles, assignments and maintenance"),
            ("Vehicle QR","ALL","Generate, regenerate, revoke, delegate, history"),
            ("GPS/Maps","ALL","Live/historical tracking, routes, geofences and map configuration"),
            ("Safety","ALL","SOS, incidents, female transport, emergency response"),
            ("Documents","ALL","Upload, verify, reject, replace, archive, download, history"),
            ("Reports","ALL","View, build, schedule, export, share and cross-tenant reporting"),
            ("Internal SaaS Billing","ALL","Plans, subscriptions, invoices, collections, revenue"),
            ("External Transport Billing","ALL","Rate cards, vendor invoices, reconciliation"),
            ("Integrations","ALL","HRMS, SSO, webhooks, APIs, notification providers"),
            ("Security","ALL","Sessions, MFA, security events and access tools"),
            ("Audit","ALL","All audit trails and exports"),
            ("System","ALL","Health, jobs, queues, feature flags, configuration"),
        ]
        table(["Module","SUPER_ADMIN","Capability"], modules)
        para("The same all-functional access applies to MOVEINSYNC_OWNER and SAAS_OWNER, with owner hierarchy controls determining who may manage owner-level identities.")
        page_break()
    elif section_num == 9:
        h1("9. Company and Tenant Management")
        h2("9.1 Company fields")
        table(["Field","Required","Notes"], [
            ("Legal Name","Yes","Unique legal entity record"),
            ("Display Name","Yes","UI name"),
            ("Company Code","Yes","Immutable business identifier"),
            ("Billing Model","Yes","COMPANY / SITE / PROCESS"),
            ("Primary Contact","Yes","Customer owner/contact"),
            ("Office Email","Yes","Verified"),
            ("Mobile","Yes","Verified"),
            ("Country","Yes","Country/region"),
            ("Timezone","Yes","Default operational timezone"),
            ("Status","Yes","ACTIVE / SUSPENDED / ARCHIVED"),
        ])
        h2("9.2 Company lifecycle")
        bl(["Draft - being configured before activation.", "Active - normal operations.", "Suspended - operational access blocked.", "Archived - no new operational transactions.", "Restored - controlled return from archive/suspension."])
        page_break()
    elif section_num == 10:
        h1("10. Site, Process, Team and Shift Hierarchy")
        para("Company Code, Site Code and Process Code are first-class tracking dimensions.")
        table(["Object","Example code","Important functions"], [
            ("Company","CMP-00127","Tenant identity and billing relationship"),
            ("Site","SITE-BLR01","Operational location and site policy"),
            ("Process","PROC-P01","Business process / cost scope"),
            ("Team","TEAM-CC01","Manager/team grouping"),
            ("Shift","SHIFT-1830","Recurring operational time window"),
        ])
        page_break()
    elif section_num == 11:
        h1("11. User and Authentication Management")
        bl(["Invitation/first-time activation flow.", "Normal login flow.", "Password reset flow.", "MFA for owner-level and privileged roles."])
        page_break()
    elif section_num == 12:
        h1("12. Employee Transport Master")
        para("The employee transport record is independent from HRMS. HRMS can be an integration source, but it cannot silently control transport state.")
        table(["Field","Required"], [
            ("Full Name","Yes"),("Employee ID","Yes"),("Company Code","Yes"),("Site Code","Yes"),
            ("Process Code","Yes"),("Office Email","Yes"),("Mobile Number","Yes"),
            ("Gender where safety policy requires","Conditional"),("Designation","No"),("Department","No"),
            ("Manager ID","No"),("Team ID","No"),("Shift / Shift Group","No"),
            ("Pickup Latitude","Yes"),("Pickup Longitude","Yes"),("Pickup Address","Yes"),
            ("Office/Site Latitude","Yes"),("Office/Site Longitude","Yes"),("Office/Site Address","Yes"),
            ("Transport Eligible","Yes"),("Transport Status","Yes"),("Effective From","Yes"),("Effective To","No"),
        ])
        h2("12.1 Onboard")
        bl(["Transport Admin opens Employees \u2192 Add Employee.", "System restricts company/site/process selectors to administrator scope.", "Validate identity and contact information.", "Validate pickup coordinates/address.", "Preview record.", "Confirm ONBOARD.", "Persist and audit."])
        h2("12.2 Offboard")
        bl(["Require effective date/time and reason.", "Show future bookings and trips.", "Require explicit disposition for affected future transport.", "Set transport status OFFBOARD.", "Block new bookings after effective time.", "Preserve historical trips, invoices, no-shows and audit.", "Write immutable audit event."])
        page_break()
    elif section_num == 15:
        h1("15. Document Management")
        para("Documents are a reusable platform capability. Every document-enabled entity must visibly expose a Documents section.")
        h2("15.1 Document actions")
        bl(["Upload Document", "Preview", "Download", "Verify", "Reject", "Request Re-upload", "Replace / New Version", "Archive", "Restore", "View History"])
        h2("15.2 Document lifecycle")
        code("""DRAFT -> UPLOADED -> PENDING_REVIEW
      +--> VERIFIED
      +--> REJECTED --> REUPLOAD
      +--> EXPIRED
      +--> REPLACED / ARCHIVED""")
        page_break()
    elif section_num == 16:
        h1("16. QR and Vehicle Duty System")
        para("QR generation belongs to Transport Admin by default and can be delegated explicitly.")
        table(["Role","Generate QR","Regenerate/Revoke","Use/scan"], [
            ("SUPER_ADMIN / OWNER","Yes","Yes","Yes"),
            ("TRANSPORT_ADMIN","Yes","Yes","Yes"),
            ("TRANSPORT_COORDINATOR","Only if delegated","Only if delegated","Yes"),
            ("DRIVER","No","No","Operational use only"),
            ("MANAGER","No","No","No"),
            ("FINANCE","No","No","No"),
            ("EMPLOYEE","No","No","No"),
        ])
        page_break()
    elif section_num == 17:
        h1("17. Booking Engine")
        bl(["Self", "Team", "Process", "Company-wide", "Recurring", "Bulk", "Standing", "Emergency", "Guest/visitor"])
        h2("17.1 Booking validation")
        bl(["Employee active and transport eligible.", "Site/process active.", "Booking window open.", "Cutoff not exceeded.", "Pickup location approved.", "Capacity/policy permits.", "Requester has permission and scope.", "Employee not offboarded.", "Duplicate booking rules checked."])
        page_break()
    elif section_num == 18:
        h1("18. Trip Engine")
        h2("18.1 Trip lifecycle")
        code("""CREATED -> ASSIGNMENT_PENDING -> ASSIGNED -> DISPATCHED
  -> DRIVER_EN_ROUTE -> DRIVER_ARRIVED -> BOARDING
  -> STARTED -> IN_TRANSIT -> DROP_COMPLETED -> COMPLETED

Exceptions: CANCELLED, NO_SHOW, REASSIGNED, ABORTED, EMERGENCY""")
        page_break()
    elif section_num == 19:
        h1("19. Passenger-Level Trip Operations")
        para("A trip is a container of passengers, not an indivisible record.")
        h2("19.1 Passenger actions")
        bl(["Remove passenger.", "Move passenger to another trip.", "Move multiple selected passengers.", "Add passenger to existing trip.", "Change one passenger pickup.", "Cancel one passenger while leaving the trip active.", "Mark no-show.", "Restore passenger where policy allows."])
        page_break()
    elif section_num == 20:
        h1("20. Driver and Vehicle Reassignment")
        table(["Trip state","Driver change","Vehicle change","Passenger move"], [
            ("CREATED","Allowed","Allowed","Allowed"),
            ("ASSIGNED","Allowed","Allowed","Allowed"),
            ("DISPATCHED","Allowed with revalidation","Allowed with revalidation","Allowed with checks"),
            ("DRIVER_ARRIVED","Controlled","Controlled","Controlled"),
            ("STARTED","Emergency override only","Emergency override only","Emergency override only"),
            ("COMPLETED","No","No","History only"),
        ])
        page_break()
    elif section_num == 22:
        h1("22. Dispatch Control Room")
        code("""+-------------------------------------------------------------+
| LIVE OPERATIONS                                             |
| Unassigned | Delayed | SOS | GPS stale | No-show | Capacity |
+---------------------------+---------------------------------+
|         LIVE MAP          | Exceptions                      |
+---------------------------+---------------------------------+
| Trip Queue | Driver Availability | Vehicle Availability      |
+-------------------------------------------------------------+""")
        page_break()
    elif section_num == 31:
        h1("31. Incident Management")
        code("""OPEN -> TRIAGED -> ASSIGNED -> INVESTIGATING
  -> ACTION_REQUIRED -> RESOLVED -> CLOSED""")
        page_break()
    elif section_num == 36:
        h1("36. Reports and Reporting Platform")
        para("Reporting is a product area, not a single button.")
        h2("36.1 Report workflow")
        code("""Choose report -> choose filters -> choose authorized fields
  -> preview -> run -> export format -> background job for large output
  -> secure download -> audit""")
        page_break()
    elif section_num == 40:
        h1("40. Billing Architecture")
        para("Keep internal Move In Sync SaaS billing and external customer/vendor transport billing in separate domains.")
        page_break()
    elif section_num == 49:
        h1("49. Access Simulator")
        para("Owner-level/security users can simulate access without mutating production data.")
        para("Result must state ALLOWED or DENIED and explain the exact reason.")
        page_break()
    elif section_num == 54:
        h1("54. Universal Detail Page Pattern")
        code("""Header: Name / Code / Status / Primary action
Summary: Key facts and current state
Context: Company / Site / Process / Team / Shift
Actions: Only actions allowed for current user + object state
Tabs: Overview | Activity | Documents | History | Related
Timeline: Business events
Audit: Who / when / before / after / reason""")
        page_break()
    elif section_num == 61:
        h1("61. Required Human-Readable Codes")
        table(["Object","Format example","Purpose"], [
            ("Company","CMP-000127","Human support/search"),
            ("Site","SITE-BLR01","Site identity"),
            ("Process","PROC-P01","Process identity"),
            ("Team","TEAM-CC01","Team identity"),
            ("Employee","EMP-004582","Employee-facing operational reference"),
            ("Vendor","VND-00074","Vendor operations"),
            ("Driver","DRV-001892","Driver operations"),
            ("Vehicle","VEH-KA01AB1234","Fleet"),
            ("Vehicle Duty","DUT-20260905-0001","Duty identity"),
            ("QR","QR-20260905-0001","QR lifecycle"),
            ("Route","RTE-BLR-001","Route identity"),
            ("Booking","BKG-20260905-0042","Booking"),
            ("Trip","TRP-20260905-001274","Trip"),
            ("Incident","INC-20260905-0004","Incident"),
            ("Document","DOC-DRV-001892-0003","Document"),
            ("Invoice","INV-202609-00129","Invoice"),
        ])
        para("Codes are unique within an appropriate business namespace. UUIDs remain the technical primary keys.")
        page_break()
    elif section_num == 85:
        h1("85. Authorization Test Matrix")
        tests = [
            ("Super Admin creates company","Allowed","Company created + audit"),
            ("Manager creates company","Denied","403 no mutation"),
            ("Transport Admin onboards employee","Allowed","Employee persisted"),
            ("Coordinator onboards employee","Denied","403"),
            ("Transport Admin generates QR","Allowed","QR created"),
            ("Manager generates QR","Denied","403"),
            ("Transport Admin moves one passenger","Allowed","Only selected passenger changes"),
            ("Employee accesses another employee","Denied","No data leak"),
            ("Vendor A accesses Vendor B","Denied","403"),
            ("Sleepy driver assigned","Denied","Compliance blocker"),
            ("Expired licence driver assigned","Denied","Document blocker"),
        ]
        table(["Scenario","Expected","Acceptance"], tests)
        page_break()
    elif section_num == 86:
        h1("86. End-to-End Acceptance Journey")
        journey = [
            "SAAS_OWNER creates MOVEINSYNC_OWNER.",
            "MOVEINSYNC_OWNER creates SUPER_ADMIN.",
            "SUPER_ADMIN creates customer company.",
            "SUPER_ADMIN creates sites and processes.",
            "SUPER_ADMIN creates customer admin and Transport Admin.",
            "Transport Admin onboards employee.",
            "Transport Admin adds/validates pickup point.",
            "Transport Admin creates driver and vehicle.",
            "Transport Admin uploads compliance documents.",
            "Transport Admin generates vehicle-shift QR.",
            "Employee books transport.",
            "Trip is generated with Trip Code.",
            "Transport Admin assigns driver and vehicle.",
            "GPS becomes LIVE.",
            "Trip starts with OTP/arrival rules.",
            "One passenger becomes NO_SHOW.",
            "Transport Admin moves another passenger.",
            "Trip completes.",
            "Operational charge is generated.",
            "Invoice is generated.",
            "Finance reconciles.",
            "Transport Admin downloads Excel/PDF.",
            "Audit timeline shows every sensitive change.",
        ]
        for i, step in enumerate(journey,1):
            numbered(f"{i}. {step}")
        page_break()
    elif section_num == 99:
        h1("99. Builder Build Order")
        phases = [
            ("Phase 1","Supabase + Postgres + RLS + Auth + base schema"),
            ("Phase 2","Owner hierarchy + RBAC + permission engine + scopes"),
            ("Phase 3","Companies + sites + processes + teams"),
            ("Phase 4","Users + invitations + employee transport master"),
            ("Phase 5","Pickup points + maps + geocoding/validation"),
            ("Phase 6","Vendors + drivers + vehicles + documents"),
            ("Phase 7","Vehicle duty + QR"),
            ("Phase 8","Bookings + shifts + roster + schedules"),
            ("Phase 9","Trips + dispatch + passenger operations"),
            ("Phase 10","GPS + driver app + employee app + control room"),
            ("Phase 11","Safety + incidents + guard"),
            ("Phase 12","Billing + rate cards + invoices + reconciliation"),
            ("Phase 13","Reports + exports + dashboards"),
            ("Phase 14","Integrations + webhooks + APIs"),
            ("Phase 15","Forecasting + optimization + intelligence"),
            ("Phase 16","Hardening + performance + acceptance + production release"),
        ]
        table(["Phase","Deliverables"], phases)
        page_break()
    elif section_num == 100:
        h1("100. Builder Completion Protocol")
        bl([
            "Inspect the existing code before changing it.",
            "Do not duplicate business rules in multiple components.",
            "Do not create fake endpoints.",
            "Do not leave placeholders for required production workflows.",
            "Complete database and API before wiring the final UI action.",
            "Use the acceptance tests as implementation checkpoints.",
            "After each phase, run build/lint/tests and verify the UI.",
            "Keep role, permission and scope separate.",
            "Preserve history whenever operational state changes.",
            "Do not reduce functionality to fit a page count.",
        ])
        page_break()
    elif section_num == 101:
        h1("101. Master Non-Negotiable Rules")
        rules = [
            "SUPER_ADMIN is full-functional owner-level access.",
            "SAAS_OWNER is the highest governance identity.",
            "MOVEINSYNC_OWNER has complete functional access.",
            "Super Admin can perform normal operational transport actions.",
            "Transport Admin owns transport employee onboarding/offboarding.",
            "Managers do not automatically receive QR generation.",
            "Finance does not automatically receive dispatch or QR privileges.",
            "Vehicle QR generation belongs to Transport Admin by default.",
            "Trip Code is mandatory for every trip.",
            "Passenger movement is an independent workflow.",
            "Trip history is never silently overwritten.",
            "Documents are a real module with upload and lifecycle.",
            "Report download is a permissioned capability.",
            "Internal SaaS billing and external transport billing are separate.",
            "Company, site, process and team are normalized scope dimensions.",
            "Server-side authorization is mandatory.",
            "Safety outranks optimization.",
            "Page count is never a reason to remove functionality.",
            "Production completion requires end-to-end acceptance, not screenshots.",
        ]
        for r in rules:
            bl([r])
        page_break()
    elif section_num == 102:
        h1("102. Final Definition of Done")
        para("Move In Sync is complete only when a clean environment supports the complete owner-to-operation journey, every critical permission is enforced server-side, every required operational state is persisted, every sensitive action is auditable, every report export is scoped, every document workflow is functional, and every primary user can complete their work from an understandable interface.")
        para("The product is not considered production ready if a screen merely renders, if metrics are hard-coded, if a button does nothing, if an API accepts unauthorized scope, if an export leaks data, or if a critical operation requires direct database editing.")
        page_break()
    else:
        # For sections not specifically coded above, add a placeholder
        h1(f"Section {section_num}")
        para(f"See the full V13 specification document for section {section_num} details.")
        page_break()

# Appendices
h1("Appendix A - Environment Variables")
code("""# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=
GOOGLE_MAPS_GEOCODING_KEY=
GOOGLE_MAPS_ROUTES_KEY=

# Notifications
EMAIL_PROVIDER_API_KEY=
SMS_PROVIDER_API_KEY=
PUSH_PROVIDER_KEY=

# App
APP_URL=
API_URL=
ENVIRONMENT=""")
para("Only the browser key belongs in a client bundle, and even that key must be restricted. Server-side credentials remain secret.")
page_break()

h1("Appendix B - Builder Checklist")
check_groups = {
"Identity": ["Supabase Auth configured","Invitation/recovery works","MFA policy works","Sessions can be revoked"],
"RBAC": ["Owner hierarchy seeded","All roles seeded","Permission catalogue seeded","ON/OFF overrides work","Scope assignments work","Access simulator works"],
"Transport": ["Employee master","Pickup points","Bookings","Trips","Dispatch","Passenger movement","Driver/vehicle reassignment"],
"Fleet": ["Vendor","Driver","Vehicle","Documents","Maintenance","Duty","QR"],
"Safety": ["SOS","Female transport","Incidents","No-show","Driver fatigue","Guard verification"],
"Maps/GPS": ["Map provider abstraction","Restricted keys","Geocoding","Routes","Live GPS","Stale/offline"],
"Billing": ["Internal SaaS","External transport","Rate cards","Invoices","Reconciliation"],
"Reports": ["Catalogue","Builder","Saved reports","Schedules","Excel","PDF","CSV","Audit"],
"UX": ["Role home","Friendly navigation","Responsive UI","Accessibility","Loading/error/empty/403 states"],
"Production": ["Migrations","Backups","Restore","Monitoring","Rate limits","Authorization tests","Tenant isolation tests"],
}
for group, items in check_groups.items():
    h2(group)
    for item in items:
        bl(["[ ] " + item])

doc.save(out)
print(f"Document saved to: {out}")
