import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// ─── Portal definitions ────────────────────────────────────
export interface PortalDefinition {
  portalId: string;
  route: string;
  title: string;
  icon: string;
  description: string;
  requiredRoles: string[];
  requiredPermissions: string[];
}

// ─── Dashboard definitions ─────────────────────────────────
export interface DashboardDefinition {
  dashboardId: string;
  portal: string;
  roles: string[];
  requiredPermissions: string[];
  route: string;
  title: string;
  description: string;
  widgetIds: string[];
  defaultFilters: Record<string, any>;
}

// ─── Widget definitions ────────────────────────────────────
export interface WidgetDefinition {
  widgetId: string;
  metricId: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'map' | 'alert' | 'action';
  requiredPermissions: string[];
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  query: string;
  drilldownRoute?: string;
}

// ─── Portal Registry ───────────────────────────────────────
export const PORTALS: PortalDefinition[] = [
  { portalId: 'platform', route: '/platform', title: 'Platform Admin', icon: '🏢', description: 'Cross-tenant platform operations', requiredRoles: ['NAVIRA_PLATFORM_ADMINISTRATOR'], requiredPermissions: [] },
  { portalId: 'finance', route: '/finance', title: 'Finance', icon: '💰', description: 'Billing, invoices, reconciliation', requiredRoles: ['NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', 'FINANCE_ADMIN'], requiredPermissions: [] },
  { portalId: 'transport', route: '/transport', title: 'Transport', icon: '🚐', description: 'Transport administration', requiredRoles: ['TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN', 'TRANSPORT_COORDINATOR', 'SECURITY_ADMIN'], requiredPermissions: [] },
  { portalId: 'operations', route: '/operations', title: 'Operations', icon: '📡', description: 'Control room, dispatch, fleet', requiredRoles: ['CONTROL_ROOM_OPERATOR', 'DISPATCHER', 'FLEET_MANAGER', 'SAFETY_ADMIN'], requiredPermissions: [] },
  { portalId: 'management', route: '/management', title: 'Management', icon: '👔', description: 'Director, senior manager, manager views', requiredRoles: ['DIRECTOR', 'MANAGER', 'TEAM_LEADER'], requiredPermissions: [] },
  { portalId: 'employee', route: '/employee', title: 'Employee', icon: '👤', description: 'Employee self-service', requiredRoles: ['EMPLOYEE', 'TRAINER'], requiredPermissions: [] },
  { portalId: 'vendor', route: '/vendor', title: 'Vendor', icon: '🏭', description: 'Vendor portal', requiredRoles: ['VENDOR_ADMIN', 'VENDOR_DISPATCHER'], requiredPermissions: [] },
  { portalId: 'driver', route: '/driver', title: 'Driver', icon: '🚗', description: 'Driver operational view', requiredRoles: ['DRIVER'], requiredPermissions: [] },
  { portalId: 'guard', route: '/guard', title: 'Guard', icon: '🛡️', description: 'Guard operational view', requiredRoles: ['GUARD'], requiredPermissions: [] },
  { portalId: 'support', route: '/support', title: 'Support', icon: '🎧', description: 'Support engineer portal', requiredRoles: ['NAVIRA_CUSTOMER_SUPPORT_ENGINEER'], requiredPermissions: [] },
  { portalId: 'security', route: '/security', title: 'Security', icon: '🔒', description: 'Security administrator portal', requiredRoles: ['NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR'], requiredPermissions: [] },
  { portalId: 'auditor', route: '/auditor', title: 'Auditor', icon: '📋', description: 'Platform auditor portal', requiredRoles: ['NAVIRA_PLATFORM_AUDITOR'], requiredPermissions: [] },
];

// ─── Dashboard Registry ────────────────────────────────────
export const DASHBOARDS: DashboardDefinition[] = [
  // PLATFORM
  { dashboardId: 'platform-overview', portal: 'platform', roles: ['NAVIRA_PLATFORM_ADMINISTRATOR'], requiredPermissions: [], route: '/platform/overview', title: 'Platform Overview', description: 'Cross-tenant platform health', widgetIds: ['total-companies', 'active-users', 'system-health', 'mrr', 'api-usage', 'open-incidents', 'support-tickets', 'feature-rollout'], defaultFilters: {} },
  { dashboardId: 'platform-companies', portal: 'platform', roles: ['NAVIRA_PLATFORM_ADMINISTRATOR'], requiredPermissions: [], route: '/platform/companies', title: 'Companies', description: 'Company lifecycle management', widgetIds: ['company-list', 'trial-count', 'suspended-count'], defaultFilters: {} },
  { dashboardId: 'platform-billing', portal: 'platform', roles: ['NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR'], requiredPermissions: [], route: '/platform/billing', title: 'Platform Billing', description: 'Platform-wide billing dashboard', widgetIds: ['platform-invoices', 'revenue-mrr', 'overdue-invoices'], defaultFilters: {} },
  { dashboardId: 'platform-security', portal: 'platform', roles: ['NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR'], requiredPermissions: [], route: '/platform/security', title: 'Security', description: 'Platform security events', widgetIds: ['security-alerts', 'failed-logins', 'mfa-status'], defaultFilters: {} },

  // TRANSPORT
  { dashboardId: 'transport-admin-overview', portal: 'transport', roles: ['TRANSPORT_ADMIN', 'TRANSPORT_SUB_ADMIN'], requiredPermissions: [], route: '/transport/dashboard', title: 'Transport Dashboard', description: 'Transport operations overview', widgetIds: ['active-bookings', 'active-trips', 'fleet-utilization', 'no-show-rate', 'pending-approvals', 'incidents'], defaultFilters: {} },
  { dashboardId: 'transport-bookings', portal: 'transport', roles: ['TRANSPORT_ADMIN', 'TRANSPORT_COORDINATOR'], requiredPermissions: [], route: '/transport/bookings', title: 'Bookings', description: 'Booking management', widgetIds: ['booking-list', 'pending-bookings', 'today-bookings'], defaultFilters: {} },
  { dashboardId: 'transport-dispatch', portal: 'transport', roles: ['TRANSPORT_ADMIN', 'TRANSPORT_COORDINATOR'], requiredPermissions: [], route: '/transport/dispatch', title: 'Dispatch', description: 'Dispatch operations', widgetIds: ['unassigned-trips', 'active-dispatches', 'driver-availability'], defaultFilters: {} },

  // OPERATIONS (Control Room)
  { dashboardId: 'operations-control-room', portal: 'operations', roles: ['CONTROL_ROOM_OPERATOR'], requiredPermissions: [], route: '/operations/control-room', title: 'Control Room', description: 'Real-time operations control', widgetIds: ['live-map', 'active-trips', 'alerts', 'no-show-queue', 'gps-status'], defaultFilters: {} },
  { dashboardId: 'operations-fleet', portal: 'operations', roles: ['FLEET_MANAGER'], requiredPermissions: [], route: '/operations/fleet', title: 'Fleet Operations', description: 'Fleet management dashboard', widgetIds: ['vehicle-status', 'compliance-alerts', 'maintenance-schedule'], defaultFilters: {} },

  // MANAGEMENT
  { dashboardId: 'management-overview', portal: 'management', roles: ['DIRECTOR', 'MANAGER', 'TEAM_LEADER'], requiredPermissions: [], route: '/management/dashboard', title: 'Manager Dashboard', description: 'Team management overview', widgetIds: ['pending-approvals', 'team-trips', 'team-no-shows', 'team-bookings', 'team-expenses'], defaultFilters: {} },

  // EMPLOYEE
  { dashboardId: 'employee-self-service', portal: 'employee', roles: ['EMPLOYEE', 'TRAINER'], requiredPermissions: [], route: '/employee/dashboard', title: 'My Transport', description: 'Employee self-service dashboard', widgetIds: ['upcoming-trips', 'active-bookings', 'recent-bookings', 'expenses'], defaultFilters: {} },

  // VENDOR
  { dashboardId: 'vendor-overview', portal: 'vendor', roles: ['VENDOR_ADMIN', 'VENDOR_DISPATCHER'], requiredPermissions: [], route: '/vendor/dashboard', title: 'Vendor Dashboard', description: 'Vendor operational view', widgetIds: ['vendor-trips', 'vendor-drivers', 'vendor-vehicles', 'vendor-performance'], defaultFilters: {} },

  // DRIVER
  { dashboardId: 'driver-trips', portal: 'driver', roles: ['DRIVER'], requiredPermissions: [], route: '/driver/dashboard', title: 'My Trips', description: 'Driver trip management', widgetIds: ['today-trip', 'trip-history', 'wallet-balance'], defaultFilters: {} },

  // FINANCE
  { dashboardId: 'finance-overview', portal: 'finance', roles: ['NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', 'FINANCE_ADMIN'], requiredPermissions: [], route: '/finance/dashboard', title: 'Finance Dashboard', description: 'Financial operations', widgetIds: ['invoice-value', 'pending-invoices', 'reconciliation-exceptions', 'cost-per-trip', 'budget-vs-actual', 'gst-summary'], defaultFilters: {} },
];

@Injectable()
export class DashboardRegistryService {
  private readonly logger = new Logger(DashboardRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all portals a user is authorized to access
   */
  async getUserPortals(userId: string, companyId: string): Promise<PortalDefinition[]> {
    // Check both UserRoleAssignment (role.name) and CompanyMembership (role enum)
    const [userRoles, memberships] = await Promise.all([
      this.prisma.userRoleAssignment.findMany({
        where: { userId },
        include: { role: true } as any,
      }),
      this.prisma.companyMembership.findMany({
        where: { userId, companyId, status: 'ACTIVE' },
      }),
    ]);

    const roleNames = [
      ...(userRoles as any[]).map(ur => ur.role.name),
      ...memberships.map(m => m.role as string),
    ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

    this.logger.debug(`User ${userId} roles from assignment: ${(userRoles as any[]).map(ur => ur.role.name).join(', ')}, from membership: ${memberships.map(m => m.role).join(', ')}`);

    // Normalize V7 roles to portal-level roles for matching
    const roleNorm: Record<string, string[]> = {
      'ADMIN': ['TRANSPORT_ADMIN'],
      'COMPANY_ADMIN': ['TRANSPORT_ADMIN'],
      'SUPER_ADMIN': ['NAVIRA_PLATFORM_ADMINISTRATOR'],
      'MOVE_IN_ADMIN': ['NAVIRA_PLATFORM_ADMINISTRATOR'],
      'FINANCE_TEAM': ['NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR'],
      'PROJECT_MANAGER': ['NAVIRA_PLATFORM_OPERATIONS_MANAGER'],
      'PROJECT_COORDINATOR': ['NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR'],
      'PLATFORM_COMPLIANCE': ['NAVIRA_PLATFORM_COMPLIANCE_OFFICER'],
      'SECURITY_ADMINISTRATOR': ['NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR'],
      'SUPPORT_ENGINEER': ['NAVIRA_CUSTOMER_SUPPORT_ENGINEER'],
      'PLATFORM_AUDITOR': ['NAVIRA_PLATFORM_AUDITOR'],
      'TRANSPORT_ADMIN': ['TRANSPORT_ADMIN'],
      'TRANSPORT_SUB_ADMIN': ['TRANSPORT_SUB_ADMIN', 'TRANSPORT_ADMIN'],
      'TRANSPORT_COORDINATOR': ['TRANSPORT_COORDINATOR', 'TRANSPORT_ADMIN'],
      'TRANSPORT_COMPLIANCE': ['SECURITY_ADMIN', 'TRANSPORT_ADMIN'],
      'DIRECTOR': ['DIRECTOR', 'MANAGER'],
      'SENIOR_MANAGER': ['MANAGER'],
      'MANAGER': ['MANAGER'],
      'ASSISTANT_MANAGER': ['MANAGER'],
      'TEAM_LEADER': ['TEAM_LEADER', 'MANAGER'],
      'EMPLOYEE': ['EMPLOYEE'],
      'TRAINER': ['EMPLOYEE'],
      'VENDOR_ADMIN': ['VENDOR_ADMIN'],
      'VENDOR_DISPATCHER': ['VENDOR_DISPATCHER', 'VENDOR_ADMIN'],
      'DRIVER': ['DRIVER'],
      'GUARD': ['GUARD'],
    };
    const normalizedRoles = new Set<string>();
    for (const r of roleNames) {
      for (const nr of (roleNorm[r] || [r])) {
        normalizedRoles.add(nr);
      }
    }

    const authorizedPortals = PORTALS.filter(portal =>
      portal.requiredRoles.some(r => normalizedRoles.has(r))
    );

    this.logger.debug(`User ${userId} has ${roleNames.length} roles, ${authorizedPortals.length} portals`);
    return authorizedPortals;
  }

  /**
   * Get all dashboards a user can access within an authorized portal
   */
  async getUserDashboards(userId: string, companyId: string, portalId?: string): Promise<DashboardDefinition[]> {
    const [userRoles, memberships] = await Promise.all([
      this.prisma.userRoleAssignment.findMany({
        where: { userId },
        include: { role: true } as any,
      }),
      this.prisma.companyMembership.findMany({
        where: { userId, companyId, status: 'ACTIVE' },
      }),
    ]);

    const roleNames = [
      ...(userRoles as any[]).map(ur => ur.role.name),
      ...memberships.map(m => m.role as string),
    ].filter((v, i, a) => a.indexOf(v) === i);

    let dashboards = DASHBOARDS.filter(dash =>
      dash.roles.some(r => roleNames.includes(r))
    );

    // COMPANY_ADMIN gets transport-focused dashboards
    if (roleNames.includes('COMPANY_ADMIN') || roleNames.includes('ADMIN')) {
      const adminDashboards = DASHBOARDS.filter(d =>
        ['transport', 'operations', 'management', 'finance', 'security'].includes(d.portal)
      );
      dashboards = [...dashboards, ...adminDashboards];
      // Deduplicate
      const seen = new Set<string>();
      dashboards = dashboards.filter(d => { if (seen.has(d.dashboardId)) return false; seen.add(d.dashboardId); return true; });
    }

    if (portalId) {
      dashboards = dashboards.filter(d => d.portal === portalId);
    }

    return dashboards;
  }

  /**
   * Get widgets for a specific dashboard
   */
  getDashboardWidgets(dashboardId: string): WidgetDefinition[] {
    const dashboard = DASHBOARDS.find(d => d.dashboardId === dashboardId);
    if (!dashboard) return [];

    return dashboard.widgetIds.map(widgetId => ({
      widgetId,
      metricId: widgetId,
      title: widgetId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'kpi' as const,
      requiredPermissions: [],
      dataClassification: 'INTERNAL' as const,
      query: `SELECT * FROM dashboard_metrics WHERE widget_id = '${widgetId}'`,
    }));
  }

  /**
   * Resolve the default portal for a user
   */
  async getDefaultPortal(userId: string, companyId: string): Promise<PortalDefinition | null> {
    const portals = await this.getUserPortals(userId, companyId);
    return portals.length > 0 ? portals[0] : null;
  }

  /**
   * Get full portal resolution for a user (used by frontend)
   */
  async resolvePortalsForUser(userId: string, companyId: string) {
    const portals = await this.getUserPortals(userId, companyId);
    const defaultPortal = portals.length > 0 ? portals[0] : null;

    const portalDashboards: Record<string, DashboardDefinition[]> = {};
    for (const portal of portals) {
      portalDashboards[portal.portalId] = await this.getUserDashboards(userId, companyId, portal.portalId);
    }

    // Get user roles
    const userRoles = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: true } as any,
    });
    const memberships = await this.prisma.companyMembership.findMany({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    const allRoles = [
      ...(userRoles as any[]).map(ur => ur.role.name),
      ...memberships.map(m => m.role as string),
    ].filter((v, i, a) => a.indexOf(v) === i);

    return {
      userId,
      companyId,
      roles: allRoles,
      portals,
      defaultPortal,
      portalDashboards,
      scope: await this.getUserScope(userId, companyId),
    };
  }

  /**
   * Get user's effective scope (sites, LOBs, processes, shifts)
   */
  async getUserScope(userId: string, companyId: string) {
    const scopes = await this.prisma.accessScope.findMany({
      where: { userId, companyId, isActive: true },
      include: { site: true, lob: true, process: true, shift: true },
    });

    return {
      sites: scopes.filter(s => s.site).map(s => ({ id: s.siteId!, name: s.site!.siteName })),
      lobs: scopes.filter(s => s.lob).map(s => ({ id: s.lobId!, name: s.lob!.lobName })),
      processes: scopes.filter(s => s.process).map(s => ({ id: s.processId!, name: s.process!.processName })),
      shifts: scopes.filter(s => s.shift).map(s => ({ id: s.shiftId!, name: s.shift!.name })),
    };
  }
}
