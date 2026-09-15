import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityEventService } from '../security/security-event.service';
import { getSupabaseClientOptional } from '../../lib/supabase';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/**
 * Legacy-to-canonical role mapping
 * Normalizes legacy role names to canonical NAVIRA_ prefixed names
 */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  'SUPER_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'MOVE_IN_ADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE_TEAM': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'PROJECT_MANAGER': 'NAVIRA_PLATFORM_OPERATIONS_MANAGER',
  'PROJECT_COORDINATOR': 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR',
  'PLATFORM_COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMINISTRATOR': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT_ENGINEER': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'PLATFORM_AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',
  'SAAS_OWNER': 'NAVIRA_OWNER',
  'MOVEINSYNC_OWNER': 'NAVIRA_OWNER',
  'SUPERADMIN': 'NAVIRA_PLATFORM_ADMINISTRATOR',
  'FINANCE': 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR',
  'COMPLIANCE': 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER',
  'SECURITY_ADMIN': 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR',
  'SUPPORT': 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER',
  'AUDITOR': 'NAVIRA_PLATFORM_AUDITOR',
  'COORDINATOR': 'TRANSPORT_COORDINATOR',
  'SUB_ADMIN': 'TRANSPORT_SUB_ADMIN',
  'SENIOR_MGR': 'MANAGER',
  'ASST_MANAGER': 'MANAGER',
  'VENDOR': 'VENDOR_ADMIN',
  'ADMIN': 'TRANSPORT_ADMIN',
};

function normalizeRole(role: string): string {
  return LEGACY_TO_CANONICAL[role] || role;
}

function normalizeRoles(roles: string[]): string[] {
  const normalized = roles.map(r => normalizeRole(r));
  return [...new Set(normalized)];
}

@Injectable()
export class AuthService {
  private supabase: ReturnType<typeof getSupabaseClientOptional>;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private audit: AuditService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly securityEvents: SecurityEventService,
  ) {
    // Supabase is optional: when env vars are absent we authenticate locally
    // against User.passwordHash (bcrypt) and issue our own JWTs.
    this.supabase = getSupabaseClientOptional(configService);
  }

  /** Issue a local JWT compatible with JwtStrategy (payload.sub, app_metadata). */
  private async issueLocalTokens(user: any, membership: any) {
    // Vendor mapping: vendor is the team leader of an assigned fleet - the
    // VendorUser link is the assignment (no invites). Carried in the token so
    // vendor-scoped endpoints can scope to it.
    let vendorId: string | null = null;
    try {
      const vu = await this.prisma.vendorUser.findFirst({
        where: { userId: user.id, isActive: true },
        select: { vendorId: true },
      });
      vendorId = vu?.vendorId || null;
    } catch { vendorId = null; }

    const canonicalRole = normalizeRole(membership?.role || 'EMPLOYEE');
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      app_metadata: {
        company_id: membership?.companyId,
        company_code: membership?.company?.code,
        role: canonicalRole,
        vendor_id: vendorId,
      },
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    return { accessToken, refreshToken };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { company: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account is temporarily locked. Try again after ${this.formatRemaining(user.lockedUntil)}`,
      );
    }

    // Verify password: try Supabase first, fall back to local bcrypt
    let authenticated = false;
    let session: any = null;
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (!error) { authenticated = true; session = data.session; }
    }
    if (!authenticated) {
      authenticated = !!user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
    }

    if (!authenticated) {
      await this.recordFailedAttempt(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    if (user.failedLoginCount > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { user, supabaseSession: session };
  }

  private async recordFailedAttempt(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const newCount = (user.failedLoginCount || 0) + 1;
    const lock = newCount >= MAX_FAILED_ATTEMPTS;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: newCount,
        lockedUntil: lock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });
  }

  private formatRemaining(until: Date): string {
    const mins = Math.ceil((until.getTime() - Date.now()) / 60000);
    return `${mins} minute${mins === 1 ? '' : 's'}`;
  }

  async login(email: string, password: string, companyCode?: string, ipAddress?: string, userAgent?: string) {
    const loginMeta = { ipAddress, userAgent, email };

    // Look up user in our database first (source of truth for business context)
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { company: true },
        },
      },
    });

    if (!user) {
      await this.securityEvents.logEvent({
        eventCode: 'FAILED_LOGIN_USER_NOT_FOUND',
        email,
        ipAddress,
        userAgent,
        riskLevel: 'LOW',
        description: `Login attempt for non-existent email: ${email}`,
        metadata: loginMeta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.securityEvents.logEvent({
        eventCode: 'FAILED_LOGIN_ACCOUNT_LOCKED',
        email,
        userId: user.id,
        ipAddress,
        userAgent,
        companyId: user.companyId,
        riskLevel: 'HIGH',
        description: `Login attempt on locked account: ${email}`,
        metadata: { ...loginMeta, lockedUntil: user.lockedUntil.toISOString() },
      });
      throw new UnauthorizedException(
        `Account is temporarily locked. Try again after ${this.formatRemaining(user.lockedUntil)}`,
      );
    }

    // Authenticate: try Supabase first, fall back to local bcrypt
    let authenticated = false;
    if (this.supabase) {
      const { error: authError } = await this.supabase.auth.signInWithPassword({ email, password });
      if (!authError) {
        authenticated = true;
      }
    }
    if (!authenticated) {
      const ok = !!user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
      if (!ok) {
        await this.recordFailedAttempt(user.id);

        const failedCount = (user.failedLoginCount || 0) + 1;
        const isBruteForce = failedCount >= MAX_FAILED_ATTEMPTS;

        await this.securityEvents.logEvent({
          eventCode: isBruteForce ? 'BRUTE_FORCE_DETECTED' : 'FAILED_LOGIN_INVALID_CREDENTIALS',
          email,
          userId: user.id,
          ipAddress,
          userAgent,
          companyId: user.companyId,
          riskLevel: isBruteForce ? 'CRITICAL' : 'MEDIUM',
          description: isBruteForce
            ? `Brute force detected: ${failedCount} failed attempts from IP ${ipAddress}`
            : `Failed login attempt (${failedCount}/${MAX_FAILED_ATTEMPTS}) for: ${email}`,
          metadata: { ...loginMeta, failedCount, maxAttempts: MAX_FAILED_ATTEMPTS },
        });

        // Also check IP-level brute force
        if (ipAddress) {
          const ipBruteForce = await this.securityEvents.checkBruteForce(ipAddress);
          if (ipBruteForce) {
            await this.securityEvents.logEvent({
              eventCode: 'BRUTE_FORCE_DETECTED',
              ipAddress,
              riskLevel: 'CRITICAL',
              description: `IP-level brute force detected from ${ipAddress}`,
              metadata: { ...loginMeta, detectedAtUser: email },
            });
          }
        }

        throw new UnauthorizedException('Invalid credentials');
      }
      authenticated = true;
    }

    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is not active');

    let activeMembership = user.memberships[0];
    if (companyCode) {
      const matched = user.memberships.find(m => m.company.code === companyCode);
      if (!matched) throw new UnauthorizedException(`User does not have access to company: ${companyCode}`);
      activeMembership = matched;
    }

    if (!activeMembership) throw new UnauthorizedException('No active company membership');

    // Reset failed login count
    if (user.failedLoginCount > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful login
    await this.securityEvents.logEvent({
      eventCode: 'SUCCESSFUL_LOGIN',
      email,
      userId: user.id,
      ipAddress,
      userAgent,
      companyId: activeMembership.companyId,
      riskLevel: 'LOW',
      description: `Successful login: ${email}`,
      metadata: loginMeta,
    });

    // Fetch roles, permissions, access scopes AND issue tokens in parallel
    const [userContext, local] = await Promise.all([
      this.buildUserContext(user.id, activeMembership.companyId),
      this.issueLocalTokens(user, activeMembership),
    ]);
    const { roles, permissions, accessScopes } = userContext;
    const accessToken = local.accessToken;
    const refreshToken = local.refreshToken;

    // Store session and audit log in parallel
    await Promise.all([
      this.prisma.session.create({
        data: {
          userId: user.id,
          token: accessToken,
          refreshToken: refreshToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
      this.audit.log({
        companyId: activeMembership.companyId, userId: user.id, action: 'LOGIN', entity: 'Session',
        newValue: { email: user.email },
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        employeeId: user.employeeId,
      },
      company: {
        id: activeMembership.companyId,
        code: activeMembership.company.code,
        name: activeMembership.company.name,
      },
      role: activeMembership.role,
      roles,
      permissions,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      // Always use local JWT for refresh (Supabase is only for password verification)
      const existingSession = await this.prisma.session.findFirst({
        where: { refreshToken },
      });
      if (!existingSession) throw new UnauthorizedException('Invalid or expired refresh token');

      const user = await this.prisma.user.findUnique({
        where: { id: existingSession.userId },
        include: { memberships: { where: { status: 'ACTIVE' }, include: { company: true } } },
      });
      if (!user) throw new UnauthorizedException('Invalid or expired refresh token');

      const membership = user.memberships[0];
      const local = await this.issueLocalTokens(user, membership);
      // Invalidate old session and create new one (refresh token rotation)
      await this.prisma.session.delete({ where: { id: existingSession.id } });
      await this.prisma.session.create({
        data: {
          userId: user.id,
          token: local.accessToken,
          refreshToken: local.refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      return { access_token: local.accessToken, refresh_token: local.refreshToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async register(data: { email: string; password: string; name: string; phone?: string; companyCode: string; role?: string }) {
    this.passwordPolicy.validate(data.password);

    // Check if user already exists in our DB
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('User with this email already exists');

    // Check company exists
    const company = await this.prisma.company.findFirst({
      where: { code: data.companyCode, status: 'ACTIVE' },
    });
    if (!company) throw new UnauthorizedException('Company not found or inactive');

    // Register with Supabase Auth (or store local bcrypt hash when Supabase absent)
    let authUserId: string;
    if (this.supabase) {
      const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: data.name,
          phone: data.phone,
        },
        app_metadata: {
          companyId: company.id,
          companyCode: company.code,
          role: data.role || 'EMPLOYEE',
        },
      });

      if (authError) {
        if (authError.message?.includes('already registered')) {
          throw new ConflictException('User with this email already exists in auth system');
        }
        throw new BadRequestException(`Registration failed: ${authError.message}`);
      }
      authUserId = authData.user.id;
    } else {
      authUserId = crypto.randomUUID();
    }

    // Create user in our database
    const user = await this.prisma.user.create({
      data: {
        id: authUserId,
        email: data.email,
        name: data.name,
        passwordHash: this.supabase ? 'managed-by-supabase' : await bcrypt.hash(data.password, 12),
        phone: data.phone,
        companyId: company.id,
        status: 'ACTIVE',
        passwordChangedAt: new Date(),
        memberships: {
          create: {
            companyId: company.id,
            role: (data.role as any) || 'EMPLOYEE',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        memberships: { where: { companyId: company.id }, include: { company: true } },
      },
    });

    const membership = user.memberships[0];
    const { roles, permissions, accessScopes } = await this.buildUserContext(user.id, company.id);

    // Always use locally-signed JWT (Supabase is only used for password verification)
    const localTokens = await this.issueLocalTokens(user, membership);
    const access_token = localTokens.accessToken;
    const refresh_token = localTokens.refreshToken;

    await this.audit.log({
      companyId: company.id, userId: user.id, action: 'USER_REGISTERED', entity: 'User',
      entityId: user.id, newValue: { email: user.email },
    });

    return {
      access_token,
      refresh_token,
      user: { id: user.id, email: user.email, name: user.name },
      company: { id: company.id,         code: company.code, name: company.name },
      role: membership.role,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If the email exists, a reset link has been sent' };

    if (this.supabase) {
      // Use Supabase password reset
      await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3000')}/auth/reset-password`,
      });
    }
    // Local mode: reset links require an email provider; direct hash update is
    // available via the admin user management endpoints.

    // Always return success to prevent email enumeration
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    this.passwordPolicy.validate(newPassword);

    // With Supabase, password reset is handled via the magic link flow
    // This endpoint is for legacy compatibility only
    // The actual reset happens when the user clicks the link in their email
    throw new BadRequestException('Password reset via token is handled by Supabase. Use the magic link sent to your email.');
  }

  async logout(token: string) {
    // Sign out from Supabase when configured (invalidate the token)
    if (this.supabase) {
      try {
        await this.supabase.auth.admin.signOut(token);
      } catch {
        // Supabase signOut may fail for non-Supabase tokens, continue with local cleanup
      }
    }

    // Remove session from our DB
    await this.prisma.session.deleteMany({ where: { token } });
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.deleteMany({ where: { userId } });
    return { message: 'Logged out from all devices' };
  }

  async getProfile(userId: string, companyId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, employeeId: true, email: true, name: true, phone: true, avatar: true,
        designation: true, transportEligibility: true, homeAddress: true,
        department: { select: { id: true, name: true } },
        businessUnit: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      } as any,
    });
    return user;
  }

  private async buildUserContext(userId: string, companyId: string) {
    // Run independent queries in parallel to reduce login latency
    const [assignments, userRoleAssignments, membership, scopes] = await Promise.all([
      // Legacy transport access role assignments
      this.prisma.transportAccessAssignment.findMany({
        where: { companyId, userId, isActive: true },
        include: { role: true },
      }),
      // New role assignment system
      this.prisma.userRoleAssignment.findMany({
        where: { userId },
        include: { role: true } as any,
      }),
      // Company membership
      this.prisma.companyMembership.findFirst({
        where: { userId, companyId, status: 'ACTIVE' },
      }),
      // Access scopes
      this.prisma.accessScope.findMany({
        where: { companyId, userId, isActive: true },
        include: { site: true, lob: true, process: true, shift: true },
      }),
    ]);

    // Build roles from legacy system
    const transportRoles = assignments.map(a => ({
      id: a.role.id,
      name: a.role.roleName,
      displayName: a.role.displayName,
      hierarchyLevel: a.role.hierarchyLevel,
    }));

    // Build roles from new system
    const userRoles = (userRoleAssignments as any[]).map(ura => ({
      id: ura.role.id,
      name: ura.role.name,
      displayName: ura.role.description || ura.role.name,
      hierarchyLevel: 0,
    }));

    // Merge both role systems, dedup by name
    const allRoles = [...transportRoles, ...userRoles];
    const seen = new Set<string>();
    const roles = allRoles
      .map(r => ({ ...r, name: normalizeRole(r.name) }))
      .filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true; });

    // Add membership role if not already present
    if (membership) {
      const canonicalMembershipRole = normalizeRole(membership.role);
      if (!roles.find(r => r.name === canonicalMembershipRole)) {
        roles.push({ id: 'membership', name: canonicalMembershipRole, displayName: canonicalMembershipRole, hierarchyLevel: 0 });
      }
    }

    // Fetch role IDs from both systems
    const roleIds = assignments.map(a => a.roleId);
    const userRoleIds = userRoleAssignments.map(ura => ura.roleId);

    // Fetch permissions from BOTH role systems in parallel
    const [rolePermissions, globalRolePerms] = await Promise.all([
      roleIds.length > 0
        ? this.prisma.rolePermissionConfig.findMany({
            where: { roleId: { in: roleIds }, enabled: true },
            include: { permission: true } as any,
          })
        : Promise.resolve([]),
      userRoleIds.length > 0
        ? this.prisma.rolePermission.findMany({
            where: { roleId: { in: userRoleIds } },
            include: { permission: true } as any,
          })
        : Promise.resolve([]),
    ]);

    const permissionSet = new Set<string>();
    for (const rp of rolePermissions as any[]) {
      permissionSet.add(`${rp.permission.module}:${rp.permission.action}`);
    }
    for (const rp of globalRolePerms as any[]) {
      permissionSet.add(`${rp.permission.module}:${rp.permission.action}`);
    }

    // Merge legacy boolean permissions from TransportAccessRole
    for (const a of assignments) {
      if (a.role.canManageVendors) permissionSet.add('vendors:manage');
      if (a.role.canManageDrivers) permissionSet.add('drivers:manage');
      if (a.role.canManageVehicles) permissionSet.add('vehicles:manage');
      if (a.role.canManageRoutes) permissionSet.add('routes:manage');
      if (a.role.canImportEmployees) permissionSet.add('employees:import');
      if (a.role.canManagePolicies) permissionSet.add('admin:manage_policies');
      if (a.role.canApproveBanRemoval) permissionSet.add('bans:approve_removal');
      if (a.role.canApproveExpenses) permissionSet.add('finance:approve_expense');
      if (a.role.canManageEmergency) permissionSet.add('safety:manage_emergency');
      if (a.role.canManageShuttles) permissionSet.add('shuttles:manage');
      if (a.role.canManageNodals) permissionSet.add('nodals:manage');
      if (a.role.canViewAnalytics) permissionSet.add('analytics:view');
      if (a.role.canManageSubAdmins) permissionSet.add('admin:manage_subadmins');
      if (a.role.canManageAccessRoles) permissionSet.add('admin:manage_access_roles');
    }

    const accessScopes = scopes.map(s => ({
      siteId: s.siteId, siteName: s.site?.siteName,
      lobId: s.lobId, lobName: s.lob?.lobName,
      processId: s.processId, processName: s.process?.processName,
      shiftId: s.shiftId, shiftName: s.shift?.name,
      expiresAt: s.expiresAt,
    }));

    return { roles, permissions: [...permissionSet], accessScopes };
  }
}
