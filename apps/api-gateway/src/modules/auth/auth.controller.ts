import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthorizationService } from '../../common/services/authorization.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { DashboardRegistryService } from '../dashboard/dashboard-registry.service';
import { AccessControlService } from '../dashboard/access-control.service';
import { AccessScopeGuard } from '../../common/guards/access-scope.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly registry: DashboardRegistryService,
    private readonly accessControl: AccessControlService,
    private readonly authService2: AuthorizationService,
  ) {}

  @Post('login')
  @Throttle(10, 60)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password, loginDto.companyCode);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.refresh_token);
  }

  @Post('register')
  @Throttle(5, 60)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AccessScopeGuard)
  async getMe(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    const companyId = req.user.companyId;

    // Fetch full user with memberships and role assignments
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { company: true },
        },
        roleAssignments: {
          include: { role: true } as any,
        },
      },
    }) as any;

    if (!user) {
      throw new Error('User not found');
    }

    // Resolve portals and dashboards
    const portals = await this.registry.getUserPortals(userId, companyId);
    const defaultPortalId = portals[0]?.portalId || 'employee';
    const [dashboards, permissions, scope] = await Promise.all([
      this.registry.getUserDashboards(userId, companyId, defaultPortalId),
      this.accessControl.getUserPermissions(companyId, userId),
      this.registry.getUserScope(userId, companyId),
    ]);

    // Determine active role - use canonical role from roleAssignments, no aliases
    const roleAssignments = user.roleAssignments || [];
    let activeRole = req.user.role || 'EMPLOYEE';
    if (roleAssignments.length > 0) {
      // Get the highest-assigned canonical role (lowest hierarchyLevel = highest authority)
      const sortedRoles = [...roleAssignments].sort((a: any, b: any) => (a.role?.hierarchyLevel ?? 99) - (b.role?.hierarchyLevel ?? 99));
      activeRole = sortedRoles[0].role?.name || activeRole;
    }

    const activePortal = portals[0] || null;

    // Resolve security domain and identity type from user model
    const securityDomain = user.securityDomain || 'CUSTOMER_INTERNAL';
    const identityType = user.identityType || 'CUSTOMER_USER';

    // V8: Get effective access from database
    let effectiveAccess: any = null;
    try {
      effectiveAccess = await this.authService2.getEffectiveAccess(userId, companyId);
    } catch (e: any) { /* fallback to legacy */ }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      employeeId: user.employeeId,
      status: user.status,
      transportEligibility: user.transportEligibility,
      company: user.memberships?.[0]?.company ? {
        id: user.memberships[0].company.id,
        name: user.memberships[0].company.name,
        code: user.memberships[0].company.companyCode || user.memberships[0].company.code,
      } : null,
      roles: user.roleAssignments?.map((ra: any) => ra.role?.name).filter(Boolean) || [],
      activeRole,
      securityDomain,
      identityType,
      permissions,
      scope,
      portals,
      activePortal,
      portalDashboards: (await this.registry.getUserDashboards(userId, companyId)).reduce((acc: Record<string, any[]>, d: any) => {
        if (!acc[d.portal]) acc[d.portal] = [];
        acc[d.portal].push(d);
        return acc;
      }, {}),
      navigation: this.buildNavigation(activeRole, activePortal),
      dashboard: activePortal ? {
        id: activePortal.portalId,
        title: activePortal.title,
        route: activePortal.route,
      } : null,
      dataVisibility: this.getDataVisibility(activeRole, securityDomain, identityType),
      v8Permissions: (effectiveAccess as any)?.permissions || [],
      v8Scope: (effectiveAccess as any)?.effectiveScope || {},
      v8CanCreateLowerAdmin: (effectiveAccess as any)?.canCreateLowerAdmin || false,
      v8DataClassification: (effectiveAccess as any)?.dataClassification || 'INTERNAL',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, AccessScopeGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub, req.user.companyId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, AccessScopeGuard)
  async logout(@Request() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    return this.authService.logout(token);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard, AccessScopeGuard)
  async logoutAll(@Request() req: any) {
    return this.authService.logoutAll(req.user.sub);
  }

  private buildNavigation(role: string, portal: any): any[] {
    const navMap: Record<string, any[]> = {
      SUPER_ADMIN: [
        { id: 'platform', label: 'Platform Control', icon: 'Building2', route: '/platform' },
        { id: 'companies', label: 'Companies', icon: 'Building', route: '/platform/companies' },
        { id: 'owners', label: 'Owner Management', icon: 'Crown', route: '/platform/owners' },
        { id: 'employees', label: 'Employees', icon: 'Users', route: '/transport/employees' },
        { id: 'bookings', label: 'Bookings', icon: 'Calendar', route: '/transport/bookings' },
        { id: 'dispatch', label: 'Dispatch', icon: 'Send', route: '/transport/dispatch' },
        { id: 'control-room', label: 'Control Room', icon: 'Radio', route: '/transport/control-room' },
        { id: 'trips', label: 'Trips', icon: 'Map', route: '/transport/trips' },
        { id: 'drivers', label: 'Drivers', icon: 'Car', route: '/transport/drivers' },
        { id: 'vehicles', label: 'Vehicles', icon: 'Truck', route: '/transport/vehicles' },
        { id: 'routes', label: 'Routes', icon: 'Route', route: '/transport/routes' },
        { id: 'compliance', label: 'Compliance', icon: 'CheckCircle', route: '/transport/compliance' },
        { id: 'vendors', label: 'Vendors', icon: 'Handshake', route: '/transport/vendors' },
        { id: 'reports', label: 'Reports', icon: 'BarChart3', route: '/transport/reports' },
        { id: 'billing', label: 'Billing', icon: 'CreditCard', route: '/transport/billing' },
        { id: 'cost-leaks', label: 'Cost Leaks', icon: 'DollarSign', route: '/transport/cost-leaks' },
        { id: 'predictive-analytics', label: 'Predictive Analytics', icon: 'BarChart3', route: '/transport/predictive-analytics' },
        { id: 'capacity-exchange', label: 'Capacity Exchange', icon: 'RefreshCw', route: '/transport/capacity-exchange' },
        { id: 'cxo-intelligence', label: 'CXO Intelligence', icon: 'BarChart3', route: '/transport/cxo-intelligence' },
        { id: 'digital-twin', label: 'Digital Twin', icon: 'RefreshCw', route: '/transport/digital-twin' },
        { id: 'vendor-truth', label: 'Vendor Truth', icon: 'Handshake', route: '/transport/vendor-truth' },
        { id: 'gps-tracking', label: 'GPS Tracking', icon: 'Map', route: '/transport/gps-tracking' },
        { id: 'incidents', label: 'Incidents', icon: 'AlertTriangle', route: '/transport/incidents' },
        { id: 'security', label: 'Security', icon: 'Shield', route: '/platform/security' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
        { id: 'admin-access', label: 'Access Control', icon: 'Lock', route: '/platform/admin-access' },
        { id: 'admin-roles', label: 'Roles & Permissions', icon: 'CheckSquare', route: '/platform/admin-roles' },
        { id: 'settings', label: 'Settings', icon: 'Settings', route: '/platform/settings' },
      ],
      NAVIRA_OWNER: [
        { id: 'platform', label: 'Platform Control', icon: 'Building2', route: '/platform' },
        { id: 'companies', label: 'Companies', icon: 'Building', route: '/platform/companies' },
        { id: 'owners', label: 'Owner Management', icon: 'Crown', route: '/platform/owners' },
        { id: 'employees', label: 'Employees', icon: 'Users', route: '/transport/employees' },
        { id: 'bookings', label: 'Bookings', icon: 'Calendar', route: '/transport/bookings' },
        { id: 'dispatch', label: 'Dispatch', icon: 'Send', route: '/transport/dispatch' },
        { id: 'control-room', label: 'Control Room', icon: 'Radio', route: '/transport/control-room' },
        { id: 'trips', label: 'Trips', icon: 'Map', route: '/transport/trips' },
        { id: 'drivers', label: 'Drivers', icon: 'Car', route: '/transport/drivers' },
        { id: 'vehicles', label: 'Vehicles', icon: 'Truck', route: '/transport/vehicles' },
        { id: 'routes', label: 'Routes', icon: 'Route', route: '/transport/routes' },
        { id: 'compliance', label: 'Compliance', icon: 'CheckCircle', route: '/transport/compliance' },
        { id: 'vendors', label: 'Vendors', icon: 'Handshake', route: '/transport/vendors' },
        { id: 'reports', label: 'Reports', icon: 'BarChart3', route: '/transport/reports' },
        { id: 'billing', label: 'Billing', icon: 'CreditCard', route: '/transport/billing' },
        { id: 'cost-leaks', label: 'Cost Leaks', icon: 'DollarSign', route: '/transport/cost-leaks' },
        { id: 'predictive-analytics', label: 'Predictive Analytics', icon: 'BarChart3', route: '/transport/predictive-analytics' },
        { id: 'capacity-exchange', label: 'Capacity Exchange', icon: 'RefreshCw', route: '/transport/capacity-exchange' },
        { id: 'cxo-intelligence', label: 'CXO Intelligence', icon: 'BarChart3', route: '/transport/cxo-intelligence' },
        { id: 'digital-twin', label: 'Digital Twin', icon: 'RefreshCw', route: '/transport/digital-twin' },
        { id: 'vendor-truth', label: 'Vendor Truth', icon: 'Handshake', route: '/transport/vendor-truth' },
        { id: 'gps-tracking', label: 'GPS Tracking', icon: 'Map', route: '/transport/gps-tracking' },
        { id: 'incidents', label: 'Incidents', icon: 'AlertTriangle', route: '/transport/incidents' },
        { id: 'security', label: 'Security', icon: 'Shield', route: '/platform/security' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
        { id: 'admin-access', label: 'Access Control', icon: 'Lock', route: '/platform/admin-access' },
        { id: 'admin-roles', label: 'Roles & Permissions', icon: 'CheckSquare', route: '/platform/admin-roles' },
        { id: 'settings', label: 'Settings', icon: 'Settings', route: '/platform/settings' },
      ],
      NAVIRA_PLATFORM_ADMINISTRATOR: [
        { id: 'platform', label: 'Platform Control', icon: 'Building2', route: '/platform' },
        { id: 'companies', label: 'Companies', icon: 'Building', route: '/platform/companies' },
        { id: 'owners', label: 'Owner Management', icon: 'Crown', route: '/platform/owners' },
        { id: 'security', label: 'Security', icon: 'Shield', route: '/platform/security' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
      ],
      NAVIRA_PLATFORM_OPERATIONS_MANAGER: [
        { id: 'platform', label: 'Operations Overview', icon: 'Building2', route: '/platform' },
        { id: 'companies', label: 'Companies', icon: 'Building', route: '/platform/companies' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
      ],
      NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR: [
        { id: 'platform', label: 'Finance Overview', icon: 'Building2', route: '/platform' },
        { id: 'billing', label: 'SaaS Billing', icon: 'CreditCard', route: '/platform/billing' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
      ],
      NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR: [
        { id: 'platform', label: 'Security Center', icon: 'Building2', route: '/platform' },
        { id: 'security', label: 'Security', icon: 'Shield', route: '/platform/security' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
      ],
      NAVIRA_PLATFORM_COMPLIANCE_OFFICER: [
        { id: 'platform', label: 'Compliance Center', icon: 'Building2', route: '/platform' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
      ],
      NAVIRA_PLATFORM_AUDITOR: [
        { id: 'platform', label: 'Audit Center', icon: 'Building2', route: '/platform' },
        { id: 'audit', label: 'Audit Log', icon: 'FileText', route: '/platform/audit' },
      ],
      NAVIRA_INTEGRATION_API_ADMINISTRATOR: [
        { id: 'platform', label: 'Integrations', icon: 'Building2', route: '/platform' },
        { id: 'settings', label: 'Settings', icon: 'Settings', route: '/platform/settings' },
      ],
      NAVIRA_CLIENT_SUCCESS_MANAGER: [
        { id: 'platform', label: 'Client Success', icon: 'Building2', route: '/platform' },
        { id: 'companies', label: 'Companies', icon: 'Building', route: '/platform/companies' },
        { id: 'audit', label: 'Audit', icon: 'FileText', route: '/platform/audit' },
      ],
      NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR: [
        { id: 'platform', label: 'Implementation', icon: 'Building2', route: '/platform' },
        { id: 'companies', label: 'Companies', icon: 'Building', route: '/platform/companies' },
      ],
      NAVIRA_CUSTOMER_SUPPORT_ENGINEER: [
        { id: 'platform', label: 'Support Center', icon: 'Building2', route: '/platform' },
        { id: 'tickets', label: 'Tickets', icon: 'Headphones', route: '/support/tickets' },
        { id: 'companies', label: 'Companies', icon: 'Building', route: '/support/companies' },
      ],

      TRANSPORT_ADMIN: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/transport/dashboard' },
        { id: 'employees', label: 'Employees', icon: 'Users', route: '/transport/employees' },
        { id: 'bookings', label: 'Bookings', icon: 'Calendar', route: '/transport/bookings' },
        { id: 'dispatch', label: 'Dispatch', icon: 'Send', route: '/transport/dispatch' },
        { id: 'control-room', label: 'Control Room', icon: 'Radio', route: '/transport/control-room' },
        { id: 'trips', label: 'Trips', icon: 'Map', route: '/transport/trips' },
        { id: 'drivers', label: 'Drivers', icon: 'Car', route: '/transport/drivers' },
        { id: 'vehicles', label: 'Vehicles', icon: 'Truck', route: '/transport/vehicles' },
        { id: 'vehicle-qr', label: 'Vehicle QR', icon: 'QrCode', route: '/transport/vehicle-qr' },
        { id: 'routes', label: 'Routes', icon: 'Route', route: '/transport/routes' },
        { id: 'compliance', label: 'Compliance', icon: 'CheckCircle', route: '/transport/compliance' },
        { id: 'no-show', label: 'No-Show', icon: 'UserX', route: '/transport/no-show' },
        { id: 'vendors', label: 'Vendors', icon: 'Handshake', route: '/transport/vendors' },
        { id: 'reports', label: 'Reports', icon: 'BarChart3', route: '/transport/reports' },
        { id: 'policies', label: 'Policies', icon: 'FileText', route: '/transport/policies' },
        { id: 'organization', label: 'Organization', icon: 'Building', route: '/transport/organization' },
        { id: 'profile-access', label: 'Profile Access', icon: 'Lock', route: '/transport/profile-access' },
        { id: 'vendor-contracts', label: 'Vendor Contracts', icon: 'FileText', route: '/transport/vendor-contracts' },
        { id: 'approval-queue', label: 'Approval Queue', icon: 'CheckSquare', route: '/transport/approval-queue' },
        { id: 'notification-preferences', label: 'Notifications', icon: 'Bell', route: '/transport/notification-preferences' },
        { id: 'settings', label: 'Settings', icon: 'Settings', route: '/transport/settings' },
      ],
      MANAGER: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/management/dashboard' },
        { id: 'team', label: 'Team', icon: 'Users', route: '/management/team' },
        { id: 'transport', label: 'Transport', icon: 'Car', route: '/management/transport' },
        { id: 'approvals', label: 'Approvals', icon: 'CheckSquare', route: '/management/approvals' },
        { id: 'reports', label: 'Reports', icon: 'BarChart3', route: '/management/reports' },
      ],
      EMPLOYEE: [
        { id: 'home', label: 'Home', icon: 'Home', route: '/employee/dashboard' },
        { id: 'my-transport', label: 'My Transport', icon: 'Car', route: '/employee/transport' },
        { id: 'bookings', label: 'My Bookings', icon: 'Calendar', route: '/employee/bookings' },
        { id: 'book', label: 'Book Transport', icon: 'Plus', route: '/employee/book' },
        { id: 'trips', label: 'My Trips', icon: 'Map', route: '/employee/trips' },
        { id: 'notifications', label: 'Notifications', icon: 'Bell', route: '/employee/notifications' },
        { id: 'expenses', label: 'Expenses', icon: 'Wallet', route: '/employee/expenses' },
        { id: 'profile', label: 'Profile', icon: 'User', route: '/employee/profile' },
      ],
      DRIVER: [
        { id: 'home', label: 'Home', icon: 'Home', route: '/driver/dashboard' },
        { id: 'availability', label: 'Availability', icon: 'Clock', route: '/driver/availability' },
        { id: 'trips', label: "Today's Trips", icon: 'Map', route: '/driver/trips' },
        { id: 'navigation', label: 'Navigation', icon: 'Navigation', route: '/driver/navigation' },
        { id: 'passengers', label: 'Passengers', icon: 'Users', route: '/driver/passengers' },
        { id: 'boarding', label: 'Boarding', icon: 'CheckSquare', route: '/driver/boarding' },
        { id: 'no-show', label: 'No-Show', icon: 'UserX', route: '/driver/no-show' },
        { id: 'breakdown', label: 'Breakdown', icon: 'AlertTriangle', route: '/driver/breakdown' },
        { id: 'sos', label: 'SOS', icon: 'AlertCircle', route: '/driver/sos' },
        { id: 'notifications', label: 'Notifications', icon: 'Bell', route: '/driver/notifications' },
        { id: 'profile', label: 'Profile', icon: 'User', route: '/driver/profile' },
      ],
      VENDOR_ADMIN: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/vendor/dashboard' },
        { id: 'drivers', label: 'Drivers', icon: 'Car', route: '/vendor/drivers' },
        { id: 'vehicles', label: 'Vehicles', icon: 'Truck', route: '/vendor/vehicles' },
        { id: 'trips', label: 'Trips', icon: 'Map', route: '/vendor/trips' },
        { id: 'invoices', label: 'Invoices', icon: 'FileText', route: '/vendor/invoices' },
      ],
      TRANSPORT_COORDINATOR: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/coordinator/dashboard' },
        { id: 'dispatch', label: 'Dispatch', icon: 'Send', route: '/coordinator/dispatch' },
        { id: 'trips', label: 'Live Trips', icon: 'Map', route: '/coordinator/trips' },
        { id: 'drivers', label: 'Drivers', icon: 'Car', route: '/coordinator/drivers' },
        { id: 'reassignment', label: 'Reassignment', icon: 'RefreshCw', route: '/coordinator/reassignment' },
        { id: 'reports', label: 'Reports', icon: 'BarChart3', route: '/coordinator/reports' },
      ],
      DIRECTOR: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/director/dashboard' },
        { id: 'approvals', label: 'Approvals', icon: 'CheckSquare', route: '/director/approvals' },
        { id: 'site-overview', label: 'Site Overview', icon: 'Building', route: '/director/sites' },
        { id: 'cost-analytics', label: 'Cost Analytics', icon: 'BarChart3', route: '/director/costs' },
        { id: 'reports', label: 'Reports', icon: 'FileText', route: '/director/reports' },
      ],
      SENIOR_MANAGER: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/senior-manager/dashboard' },
        { id: 'approvals', label: 'Approvals', icon: 'CheckSquare', route: '/senior-manager/approvals' },
        { id: 'teams', label: 'My Teams', icon: 'Users', route: '/senior-manager/teams' },
        { id: 'reports', label: 'Reports', icon: 'BarChart3', route: '/senior-manager/reports' },
      ],
      ASSISTANT_MANAGER: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/asst-manager/dashboard' },
        { id: 'approvals', label: 'Approvals', icon: 'CheckSquare', route: '/asst-manager/approvals' },
        { id: 'schedule', label: 'Schedule', icon: 'Calendar', route: '/asst-manager/schedule' },
        { id: 'team', label: 'Team', icon: 'Users', route: '/asst-manager/team' },
      ],
      TEAM_LEADER: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/team-leader/dashboard' },
        { id: 'approvals', label: 'Approvals', icon: 'CheckSquare', route: '/team-leader/approvals' },
        { id: 'team', label: 'My Team', icon: 'Users', route: '/team-leader/team' },
        { id: 'schedule', label: 'Schedule', icon: 'Calendar', route: '/team-leader/schedule' },
      ],
      TRANSPORT_COMPLIANCE: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', route: '/compliance/dashboard' },
        { id: 'violations', label: 'Violations', icon: 'AlertTriangle', route: '/compliance/violations' },
        { id: 'rules', label: 'Policy Rules', icon: 'FileText', route: '/compliance/rules' },
        { id: 'reports', label: 'Reports', icon: 'BarChart3', route: '/compliance/reports' },
      ],
      GUARD: [
        { id: 'home', label: 'Home', icon: 'Home', route: '/guard/dashboard' },
        { id: 'trips', label: 'Monitor Trips', icon: 'Map', route: '/guard/trips' },
        { id: 'boarding', label: 'Boarding', icon: 'CheckSquare', route: '/guard/boarding' },
        { id: 'safety', label: 'Safety', icon: 'Shield', route: '/guard/safety' },
      ],
    };
    return navMap[role] || navMap.EMPLOYEE;
  }

  private getDataVisibility(role: string, securityDomain: string = 'CUSTOMER_INTERNAL', identityType: string = 'CUSTOMER_USER'): Record<string, string> {
    // NAVIRA internal users have platform-wide access
    if (securityDomain === 'NAVIRA_INTERNAL') {
      return { scope: 'platform', dataClassification: 'RESTRICTED' };
    }
    // Customer users
    const visibilityMap: Record<string, Record<string, string>> = {
      TRANSPORT_ADMIN: { scope: 'company', dataClassification: 'CONFIDENTIAL' },
      TRANSPORT_SUB_ADMIN: { scope: 'site', dataClassification: 'CONFIDENTIAL' },
      MANAGER: { scope: 'hierarchy', dataClassification: 'INTERNAL' },
      EMPLOYEE: { scope: 'self', dataClassification: 'INTERNAL' },
      DRIVER: { scope: 'self', dataClassification: 'OPERATIONAL' },
      VENDOR_ADMIN: { scope: 'vendor', dataClassification: 'CONFIDENTIAL' },
      NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR: { scope: 'company', dataClassification: 'RESTRICTED' },
      NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR: { scope: 'company', dataClassification: 'RESTRICTED' },
      NAVIRA_PLATFORM_AUDITOR: { scope: 'platform', dataClassification: 'RESTRICTED' },
    };
    return visibilityMap[role] || { scope: 'self', dataClassification: 'INTERNAL' };
  }
}
