import { Injectable, NotFoundException, BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class EmployeeManagementService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ============================================================
  // EMPLOYEE LISTING (scoped by access)
  // ============================================================

  async getEmployees(companyId: string, filters: {
    siteId?: string; lobId?: string; processId?: string; shiftId?: string;
    search?: string; transportEligibility?: string;
    page?: number; limit?: number;
  }, accessScopes?: any[]) {
    if (!this.prisma.isConnected()) return this._demoEmployees();

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId, status: 'ACTIVE' };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { employeeId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.transportEligibility) {
      where.transportEligibility = filters.transportEligibility;
    }

    // Scope filtering — if accessScopes are provided, restrict to matching org assignments
    if (accessScopes && accessScopes.length > 0) {
      const siteIds = accessScopes.filter(s => s.siteId).map(s => s.siteId);
      const lobIds = accessScopes.filter(s => s.lobId).map(s => s.lobId);
      const processIds = accessScopes.filter(s => s.processId).map(s => s.processId);
      const shiftIds = accessScopes.filter(s => s.shiftId).map(s => s.shiftId);

      where.orgAssignments = { some: {} };
      const orgConditions: any[] = [];
      if (siteIds.length > 0) orgConditions.push({ siteId: { in: siteIds } });
      if (lobIds.length > 0) orgConditions.push({ lobId: { in: lobIds } });
      if (processIds.length > 0) orgConditions.push({ processId: { in: processIds } });
      if (shiftIds.length > 0) orgConditions.push({ shiftId: { in: shiftIds } });
      if (orgConditions.length > 0) where.orgAssignments = { some: { OR: orgConditions } };
    }

    // Direct org assignment filters
    if (filters.siteId || filters.lobId || filters.processId || filters.shiftId) {
      const assignmentConditions: any[] = [];
      if (filters.siteId) assignmentConditions.push({ siteId: filters.siteId });
      if (filters.lobId) assignmentConditions.push({ lobId: filters.lobId });
      if (filters.processId) assignmentConditions.push({ processId: filters.processId });
      if (filters.shiftId) assignmentConditions.push({ shiftId: filters.shiftId });

      if (where.orgAssignments?.some) {
        where.orgAssignments.some.AND = assignmentConditions;
      } else {
        where.orgAssignments = { some: { AND: assignmentConditions } };
      }
    }

    const [employees, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: limit,
        select: {
          id: true, employeeId: true, name: true, email: true, phone: true,
          designation: true, transportEligibility: true,
          department: { select: { id: true, name: true } },
          businessUnit: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true } },
          orgAssignments: { include: { site: true, lob: true, process: true, shift: true } },
          _count: { select: { bookings: true } },
        } as any,
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { employees, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getEmployeeById(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return this._demoEmployees().employees[0] as any;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true, employeeId: true, name: true, email: true, phone: true,
        avatar: true, designation: true, transportEligibility: true,
        homeAddress: true, homeLatitude: true, homeLongitude: true,
        employmentType: true,
        department: { select: { id: true, name: true } },
        businessUnit: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        orgAssignments: { include: { site: true, lob: true, process: true, shift: true } },
        _count: { select: { bookings: true } },
      } as any,
    });
    if (!user) throw new NotFoundException('Employee not found');
    return user;
  }

  // ============================================================
  // ORG ASSIGNMENT MANAGEMENT
  // ============================================================

  async assignEmployeeOrg(companyId: string, userId: string, data: {
    siteId?: string; lobId?: string; processId?: string; shiftId?: string;
  }, assignedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const user = await this.prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('Employee not found');

    // Validate references
    if (data.siteId) {
      const site = await this.prisma.companySite.findFirst({ where: { id: data.siteId, companyId } });
      if (!site) throw new NotFoundException('Site not found');
    }
    if (data.lobId) {
      const lob = await this.prisma.lineOfBusiness.findFirst({ where: { id: data.lobId, companyId } });
      if (!lob) throw new NotFoundException('LOB not found');
    }
    if (data.processId) {
      const process = await this.prisma.orgProcess.findFirst({ where: { id: data.processId, companyId } });
      if (!process) throw new NotFoundException('Process not found');
    }
    if (data.shiftId) {
      const shift = await this.prisma.shift.findFirst({ where: { id: data.shiftId, companyId } });
      if (!shift) throw new NotFoundException('Shift not found');
    }

    // Check for existing assignment with same org dimensions
    const existing = await this.prisma.employeeOrgAssignment.findFirst({
      where: { companyId, userId, siteId: data.siteId || null, lobId: data.lobId || null, processId: data.processId || null, shiftId: data.shiftId || null },
    });
    if (existing) throw new ConflictException('Employee already assigned to this org combination');

    const assignment = await this.prisma.employeeOrgAssignment.create({
      data: { companyId, userId, ...data },
    });

    await this.audit.log({
      companyId, userId: assignedBy, action: 'EMPLOYEE_ORG_ASSIGNED', entity: 'EmployeeOrgAssignment',
      entityId: assignment.id, newValue: { targetUserId: userId, ...data },
    });

    return assignment;
  }

  async updateEmployeeOrgAssignment(companyId: string, assignmentId: string, data: {
    siteId?: string; lobId?: string; processId?: string; shiftId?: string;
  }, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.employeeOrgAssignment.findFirst({ where: { id: assignmentId, companyId } });
    if (!existing) throw new NotFoundException('Assignment not found');

    const updated = await this.prisma.employeeOrgAssignment.update({ where: { id: assignmentId }, data });
    await this.audit.log({
      companyId, userId: updatedBy, action: 'EMPLOYEE_ORG_UPDATED', entity: 'EmployeeOrgAssignment',
      entityId: assignmentId, newValue: data,
    });
    return updated;
  }

  async removeEmployeeOrgAssignment(companyId: string, assignmentId: string, removedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.employeeOrgAssignment.findFirst({ where: { id: assignmentId, companyId } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.prisma.employeeOrgAssignment.delete({ where: { id: assignmentId } });
    await this.audit.log({ companyId, userId: removedBy, action: 'EMPLOYEE_ORG_REMOVED', entity: 'EmployeeOrgAssignment', entityId: assignmentId });
    return { removed: true };
  }

  // ============================================================
  // MANAGER HIERARCHY
  // ============================================================

  async getManagerHierarchy(companyId: string, managerId: string) {
    if (!this.prisma.isConnected()) return this._demoManagerHierarchy();

    const relationships = await this.prisma.managerRelationship.findMany({
      where: { companyId, managerId },
    });

    // Fetch employee details separately to avoid complex include type issues
    const employeeIds = relationships.map(r => r.employeeId);
    const employees = await this.prisma.user.findMany({
      where: { id: { in: employeeIds }, companyId },
      select: { id: true, name: true, email: true, designation: true },
    });
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    return relationships.map(r => ({
      id: r.id,
      employee: employeeMap.get(r.employeeId) || { id: r.employeeId, name: 'Unknown', email: '' },
      relationshipType: r.relationshipType,
      isPrimary: r.isPrimary,
    }));
  }

  async getDirectReports(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return [];
    const relationships = await this.prisma.managerRelationship.findMany({
      where: { companyId, managerId: userId },
    });

    const employeeIds = relationships.map(r => r.employeeId);
    const employees = await this.prisma.user.findMany({
      where: { id: { in: employeeIds }, companyId },
      select: {
        id: true, employeeId: true, name: true, email: true, designation: true,
        department: { select: { name: true } },
      } as any,
    });
    const employeeMap = new Map((employees as any[]).map(e => [e.id, e]));

    return relationships.map(r => {
      const emp = employeeMap.get(r.employeeId);
      if (!emp) return null;
      return { ...emp, relationshipType: r.relationshipType, isPrimary: r.isPrimary };
    }).filter(Boolean);
  }

  async assignManager(companyId: string, data: {
    employeeId: string; managerId: string; relationshipType?: string; isPrimary?: boolean;
  }, assignedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const employee = await this.prisma.user.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const manager = await this.prisma.user.findFirst({ where: { id: data.managerId, companyId } });
    if (!manager) throw new NotFoundException('Manager not found');
    if (data.employeeId === data.managerId) throw new BadRequestException('Employee cannot be their own manager');

    const existing = await this.prisma.managerRelationship.findFirst({
      where: { companyId, employeeId: data.employeeId, managerId: data.managerId },
    });
    if (existing) throw new ConflictException('Manager relationship already exists');

    // If marking as primary, unset other primary relationships for this employee
    if (data.isPrimary !== false) {
      await this.prisma.managerRelationship.updateMany({
        where: { companyId, employeeId: data.employeeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const relationship = await this.prisma.managerRelationship.create({
      data: {
        companyId, employeeId: data.employeeId, managerId: data.managerId,
        relationshipType: data.relationshipType || 'DIRECT',
        isPrimary: data.isPrimary !== false,
      },
    });

    await this.audit.log({
      companyId, userId: assignedBy, action: 'MANAGER_ASSIGNED', entity: 'ManagerRelationship',
      entityId: relationship.id, newValue: { employeeId: data.employeeId, managerId: data.managerId },
    });

    return relationship;
  }

  async removeManagerRelationship(companyId: string, relationshipId: string, removedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const existing = await this.prisma.managerRelationship.findFirst({ where: { id: relationshipId, companyId } });
    if (!existing) throw new NotFoundException('Manager relationship not found');
    await this.prisma.managerRelationship.delete({ where: { id: relationshipId } });
    await this.audit.log({ companyId, userId: removedBy, action: 'MANAGER_REMOVED', entity: 'ManagerRelationship', entityId: relationshipId });
    return { removed: true };
  }

  // ============================================================
  // EMPLOYEE PROFILE UPDATE
  // ============================================================

  async updateEmployeeProfile(companyId: string, userId: string, data: {
    name?: string; phone?: string; designation?: string;
    homeAddress?: string; homeLatitude?: number; homeLongitude?: number; homeLocationName?: string;
    transportEligibility?: 'ELIGIBLE' | 'INELIGIBLE' | 'TEMPORARY'; employeeType?: string;
  }, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const user = await this.prisma.user.findFirst({ where: { id: userId, companyId } });
    if (!user) throw new NotFoundException('Employee not found');

    const updateData: any = { ...data };
    const updated = await this.prisma.user.update({ where: { id: userId }, data: updateData });
    await this.audit.log({
      companyId, userId: updatedBy, action: 'EMPLOYEE_PROFILE_UPDATED', entity: 'User',
      entityId: userId, newValue: data,
    });
    return { id: updated.id, name: updated.name, email: updated.email };
  }

  // ============================================================
  // BULK EMPLOYEE IMPORT
  // ============================================================

  async bulkImportEmployees(companyId: string, employees: Array<{
    email: string; name: string; employeeId?: string; phone?: string; designation?: string;
    departmentName?: string; siteCode?: string; lobCode?: string; processCode?: string; shiftName?: string;
  }>, importedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const results = { created: 0, updated: 0, errors: [] as any[] };

    for (const emp of employees) {
      try {
        const existing = await this.prisma.user.findFirst({ where: { companyId, email: emp.email } });

        if (existing) {
          await this.prisma.user.update({ where: { id: existing.id }, data: { name: emp.name, phone: emp.phone } });
          results.updated++;
        } else {
          const bcrypt = await import('bcryptjs');
          const passwordHash = await bcrypt.hash(require('crypto').randomBytes(16).toString('hex'), 12);
          await this.prisma.user.create({
            data: {
              companyId, email: emp.email, name: emp.name, passwordHash,
              employeeId: emp.employeeId, phone: emp.phone, designation: emp.designation,
              status: 'ACTIVE',
              memberships: { create: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' } },
            },
          });
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({ email: emp.email, error: error.message });
      }
    }

    await this.audit.log({
      companyId, userId: importedBy, action: 'EMPLOYEES_IMPORTED', entity: 'User',
      newValue: { count: results.created + results.updated, errors: results.errors.length },
    });

    return results;
  }

  // ============================================================
  // DEMO DATA
  // ============================================================

  private _demoEmployees() {
    return {
      employees: [
        { id: 'emp-1', employeeId: 'EMP-001', name: 'Rahul Sharma', email: 'rahul@acme.com', designation: 'Senior Analyst', transportEligibility: 'ELIGIBLE' },
        { id: 'emp-2', employeeId: 'EMP-002', name: 'Neha Gupta', email: 'neha@acme.com', designation: 'Team Lead', transportEligibility: 'ELIGIBLE' },
      ],
      total: 2, page: 1, limit: 20, totalPages: 1,
    };
  }

  private _demoManagerHierarchy() {
    return [
      { id: 'rel-1', employee: { id: 'emp-1', name: 'Rahul Sharma', email: 'rahul@acme.com' }, relationshipType: 'DIRECT', isPrimary: true },
      { id: 'rel-2', employee: { id: 'emp-2', name: 'Neha Gupta', email: 'neha@acme.com' }, relationshipType: 'DIRECT', isPrimary: true },
    ];
  }
}
