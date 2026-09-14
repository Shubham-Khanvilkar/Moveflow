import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeeService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // 1. EMPLOYEE CRUD + ONBOARDING
  // ============================================================

  async createEmployee(companyId: string, performedBy: string, data: {
    employeeId: string;
    name: string;
    email: string;
    password?: string;
    phone?: string;
    departmentId?: string;
    businessUnitId?: string;
    costCenterId?: string;
    managerId?: string;
    teamLeaderId?: string;
    officeId?: string;
    shiftId?: string;
    designation?: string;
    employmentType?: string;
    homeLatitude?: number;
    homeLongitude?: number;
    homeAddress?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    transportEligibility?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Validate employeeId uniqueness scoped to company
    const existingEmpId = await this.prisma.user.findFirst({
      where: { companyId, employeeId: data.employeeId },
    });
    if (existingEmpId) {
      throw new ConflictException(`Employee ID "${data.employeeId}" already exists in this company`);
    }

    // Validate email uniqueness
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictException(`Email "${data.email}" is already registered`);
    }

    // Validate references exist within same company
    if (data.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: data.departmentId, companyId },
      });
      if (!dept) throw new BadRequestException('Department not found in this company');
    }
    if (data.officeId) {
      const office = await this.prisma.office.findFirst({
        where: { id: data.officeId, companyId },
      });
      if (!office) throw new BadRequestException('Office not found in this company');
    }
    if (data.managerId) {
      const mgr = await this.prisma.user.findFirst({
        where: { id: data.managerId, companyId },
      });
      if (!mgr) throw new BadRequestException('Manager not found in this company');
    }
    if (data.teamLeaderId) {
      const tl = await this.prisma.user.findFirst({
        where: { id: data.teamLeaderId, companyId },
      });
      if (!tl) throw new BadRequestException('Team leader not found in this company');
    }

    const password = data.password || require('crypto').randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        employeeId: data.employeeId,
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone,
        companyId,
        departmentId: data.departmentId,
        businessUnitId: data.businessUnitId,
        managerId: data.managerId,
        teamLeaderId: data.teamLeaderId,
        shiftId: data.shiftId,
        designation: data.designation,
        employmentType: (data.employmentType as any) || 'FULL_TIME',
        homeLatitude: data.homeLatitude,
        homeLongitude: data.homeLongitude,
        homeAddress: data.homeAddress,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        transportEligibility: (data.transportEligibility as any) || 'ELIGIBLE',
        status: 'ACTIVE',
        memberships: {
          create: {
            companyId,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        department: true,
        businessUnit: true,
        shift: true,
      } as any,
    });

    // Create transport eligibility record
    await this.prisma.employeeTransportEligibility.create({
      data: {
        companyId,
        employeeId: user.id,
        status: (data.transportEligibility as any) || 'ELIGIBLE',
      },
    });

    // Create manager relationship records
    if (data.managerId) {
      await this.prisma.managerRelationship.create({
        data: {
          companyId,
          employeeId: user.id,
          managerId: data.managerId,
          relationshipType: 'MANAGER',
          isPrimary: true,
        },
      });
    }
    if (data.teamLeaderId) {
      await this.prisma.managerRelationship.create({
        data: {
          companyId,
          employeeId: user.id,
          managerId: data.teamLeaderId,
          relationshipType: 'TEAM_LEADER',
          isPrimary: true,
        },
      });
    }

    // Create emergency contact
    if (data.emergencyContactName && data.emergencyContactPhone) {
      await this.prisma.emergencyContact.create({
        data: {
          companyId,
          userId: user.id,
          contactName: data.emergencyContactName,
          relationship: 'EMERGENCY',
          phoneNumber: data.emergencyContactPhone,
          isPrimary: true,
        },
      });
    }

    // Audit log
    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'EMPLOYEE_CREATED',
      entity: 'User',
      entityId: user.id,
      newValue: { employeeId: data.employeeId, name: data.name, email: data.email },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async listEmployees(companyId: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    status?: string;
    transportEligibility?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { email: { contains: params.search } },
        { employeeId: { contains: params.search } },
      ];
    }
    if (params.departmentId) where.departmentId = params.departmentId;
    if (params.status) where.status = params.status;
    if (params.transportEligibility) where.transportEligibility = params.transportEligibility;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          transportEligibility: true,
          designation: true,
          employmentType: true,
          departmentId: true,
          managerId: true,
          teamLeaderId: true,
          createdAt: true,
          department: { select: { id: true, name: true } },
          BusinessUnit: { select: { id: true, name: true } },
          Shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        } as any,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmployee(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        transportEligibility: true,
        designation: true,
        employmentType: true,
        homeLatitude: true,
        homeLongitude: true,
        homeAddress: true,
        defaultPickup: true,
        defaultDrop: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        departmentId: true,
        businessUnitId: true,
        managerId: true,
        teamLeaderId: true,
        shiftId: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
        BusinessUnit: { select: { id: true, name: true } },
        shift: true,
        manager: { select: { id: true, name: true, employeeId: true } },
        teamLeader: { select: { id: true, name: true, employeeId: true } },
      } as any,
    });

    if (!user) throw new NotFoundException('Employee not found');
    return user;
  }

  async updateEmployee(companyId: string, performedBy: string, userId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) {
      return { ...data, id: userId, updated: true };
    }

    const existing = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    // Protect immutable fields
    const allowed = [
      'name', 'phone', 'departmentId', 'businessUnitId', 'costCenterId',
      'designation', 'employmentType', 'shiftId', 'officeId',
      'homeLatitude', 'homeLongitude', 'homeAddress',
      'emergencyContactName', 'emergencyContactPhone',
    ];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, employeeId: true, name: true, email: true, phone: true,
        status: true, designation: true, departmentId: true, managerId: true,
      },
    });

    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'EMPLOYEE_UPDATED',
      entity: 'User',
      entityId: userId,
      oldValue: { name: existing.name, phone: existing.phone, designation: existing.designation },
      newValue: updateData,
    });

    return updated;
  }

  async deleteEmployee(companyId: string, performedBy: string, userId: string) {
    if (!this.prisma.isConnected()) {
      return { deleted: true, id: userId };
    }

    const existing = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!existing) throw new NotFoundException('Employee not found');

    // Soft delete — set status to INACTIVE
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
      select: { id: true, name: true, status: true },
    });

    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'EMPLOYEE_DELETED',
      entity: 'User',
      entityId: userId,
      oldValue: { status: existing.status },
      newValue: { status: 'INACTIVE' },
    });

    return updated;
  }

  // ============================================================
  // 2. STATUS TRANSITIONS (TRANSPORT_ACTIVE / SUSPENDED / INACTIVE)
  // ============================================================

  async updateTransportEligibility(
    companyId: string,
    performedBy: string,
    userId: string,
    status: string,
    reason: string,
  ) {
    if (!this.prisma.isConnected()) {
      return { employeeId: userId, transportEligibility: status, reason };
    }

    const valid = ['ELIGIBLE', 'INELIGIBLE', 'TEMPORARY'];
    if (!valid.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${valid.join(', ')}`);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundException('Employee not found');

    const oldStatus = user.transportEligibility;

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { transportEligibility: status as any },
    });

    // Upsert eligibility record
    await this.prisma.employeeTransportEligibility.upsert({
      where: { companyId_employeeId: { companyId, employeeId: userId } },
      update: {
        status: status as any,
        reason,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        employeeId: userId,
        status: status as any,
        reason,
      },
    });

    // Audit
    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'TRANSPORT_ELIGIBILITY_CHANGED',
      entity: 'EmployeeTransportEligibility',
      entityId: userId,
      oldValue: { status: oldStatus },
      newValue: { status, reason },
    });

    return { employeeId: userId, transportEligibility: status, reason };
  }

  // ============================================================
  // 3. BULK IMPORT
  // ============================================================

  async bulkImport(companyId: string, performedBy: string, records: any[]) {
    if (!this.prisma.isConnected()) {
      return {
        total: records.length,
        successful: records.length,
        failed: 0,
        results: records.map((r, i) => ({ row: i + 1, status: 'SUCCESS', employeeId: r.employeeId })),
      };
    }

    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Validate required fields
        if (!row.employeeId || !row.name || !row.email) {
          throw new Error('Missing required fields: employeeId, name, email');
        }

        // Check uniqueness
        const existingEmp = await this.prisma.user.findFirst({
          where: { companyId, employeeId: row.employeeId },
        });
        if (existingEmp) {
          throw new Error(`Employee ID "${row.employeeId}" already exists`);
        }

        const existingEmail = await this.prisma.user.findUnique({
          where: { email: row.email },
        });
        if (existingEmail) {
          throw new Error(`Email "${row.email}" already registered`);
        }

        // Create employee
        const passwordHash = await bcrypt.hash(row.password || require('crypto').randomBytes(16).toString('hex'), 12);
        const user = await this.prisma.user.create({
          data: {
            employeeId: row.employeeId,
            name: row.name,
            email: row.email,
            passwordHash,
            phone: row.phone,
            companyId,
            designation: row.designation,
            employmentType: row.employmentType || 'FULL_TIME',
            homeAddress: row.homeAddress,
            homeLatitude: row.homeLatitude ? parseFloat(row.homeLatitude) : undefined,
            homeLongitude: row.homeLongitude ? parseFloat(row.homeLongitude) : undefined,
            transportEligibility: 'ELIGIBLE',
            status: 'ACTIVE',
            memberships: {
              create: { companyId, role: 'EMPLOYEE', status: 'ACTIVE' },
            },
          },
        });

        await this.prisma.employeeTransportEligibility.create({
          data: { companyId, employeeId: user.id, status: 'ELIGIBLE' },
        });

        results.push({ row: i + 1, status: 'SUCCESS', employeeId: row.employeeId, userId: user.id });
        successful++;
      } catch (err: any) {
        results.push({ row: i + 1, status: 'FAILED', employeeId: row.employeeId, error: err.message });
        failed++;
      }
    }

    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'EMPLOYEE_BULK_IMPORT',
      entity: 'User',
      newValue: { total: records.length, successful, failed },
    });

    return { total: records.length, successful, failed, results };
  }

  // ============================================================
  // 4. REPORTING HIERARCHY
  // ============================================================

  async getMyReportees(companyId: string, managerUserId: string, type?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Get users where this person is manager or team leader
    const where: any = { companyId, OR: [] };

    if (!type || type === 'MANAGER') {
      where.OR.push({ managerId: managerUserId });
    }
    if (!type || type === 'TEAM_LEADER') {
      where.OR.push({ teamLeaderId: managerUserId });
    }

    if (where.OR.length === 0) {
      where.OR.push({ managerId: '__none__' });
    }

    const reportees = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        transportEligibility: true,
        designation: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true } },
      } as any,
      orderBy: { name: 'asc' },
    });

    return {
      managerId: managerUserId,
      reporteeCount: reportees.length,
      reportees,
    };
  }

  async canAccessEmployee(companyId: string, accessorUserId: string, targetUserId: string): Promise<boolean> {
    if (!this.prisma.isConnected()) return true;

    // Super admin / company admin can access all
    const accessorMembership = await this.prisma.companyMembership.findFirst({
      where: { userId: accessorUserId, companyId, status: 'ACTIVE' },
    });
    if (accessorMembership?.role === 'COMPANY_ADMIN' || accessorMembership?.role === 'NAVIRA_PLATFORM_ADMINISTRATOR') {
      return true;
    }

    // Check direct reporting chain (manager -> employee or team_leader -> employee)
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyId },
      select: { managerId: true, teamLeaderId: true },
    });
    if (!target) return false;

    if (target.managerId === accessorUserId || target.teamLeaderId === accessorUserId) {
      return true;
    }

    // Check two-level chain: accessor's reportees' reportees
    const directReportees = await this.prisma.user.findMany({
      where: {
        companyId,
        OR: [
          { managerId: accessorUserId },
          { teamLeaderId: accessorUserId },
        ],
      },
      select: { id: true },
    });

    const directReporteeIds = directReportees.map(r => r.id);
    if (directReporteeIds.includes(targetUserId)) return true;

    // Check if target is reportee of a direct reportee
    const indirectReportees = await this.prisma.user.findMany({
      where: {
        companyId,
        OR: [
          { managerId: { in: directReporteeIds } },
          { teamLeaderId: { in: directReporteeIds } },
        ],
      },
      select: { id: true },
    });

    return indirectReportees.some(r => r.id === targetUserId);
  }

  async reassignManager(
    companyId: string,
    performedBy: string,
    employeeId: string,
    newManagerId: string,
    relationshipType: string = 'MANAGER',
  ) {
    if (!this.prisma.isConnected()) {
      return { employeeId, newManagerId, relationshipType };
    }

    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, companyId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const newManager = await this.prisma.user.findFirst({
      where: { id: newManagerId, companyId },
    });
    if (!newManager) throw new NotFoundException('Manager not found');

    const field = relationshipType === 'TEAM_LEADER' ? 'teamLeaderId' : 'managerId';
    const oldManagerId = employee[field];

    // Update primary relationship
    await this.prisma.user.update({
      where: { id: employeeId },
      data: { [field]: newManagerId },
    });

    // Deactivate old relationship, create new one
    const oldRelType = relationshipType === 'TEAM_LEADER' ? 'TEAM_LEADER' : 'MANAGER';
    await this.prisma.managerRelationship.updateMany({
      where: {
        companyId,
        employeeId,
        relationshipType: oldRelType,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });

    await this.prisma.managerRelationship.create({
      data: {
        companyId,
        employeeId,
        managerId: newManagerId,
        relationshipType: oldRelType,
        isPrimary: true,
      },
    });

    await this.audit.log({
      companyId,
      userId: performedBy,
      action: 'MANAGER_REASSIGNED',
      entity: 'ManagerRelationship',
      entityId: employeeId,
      oldValue: { managerId: oldManagerId, relationshipType: oldRelType },
      newValue: { managerId: newManagerId, relationshipType: oldRelType },
    });

    return {
      employeeId,
      oldManagerId,
      newManagerId,
      relationshipType: oldRelType,
    };
  }

  // ============================================================
  // 5. EMPLOYEE SELF-SERVICE
  // ============================================================

  async getOwnProfile(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        transportEligibility: true,
        designation: true,
        employmentType: true,
        homeLatitude: true,
        homeLongitude: true,
        homeAddress: true,
        defaultPickup: true,
        defaultDrop: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        department: { select: { id: true, name: true } },
        BusinessUnit: { select: { id: true, name: true } },
        shift: true,
        manager: { select: { id: true, name: true, employeeId: true } },
        teamLeader: { select: { id: true, name: true, employeeId: true } },
      } as any,
    });

    if (!user) throw new NotFoundException('User not found');

    // Get saved locations
    const savedLocations = await this.prisma.savedLocation.findMany({
      where: { userId },
    });

    // Get emergency contacts
    const emergencyContacts = await this.prisma.emergencyContact.findMany({
      where: { userId },
    });

    // Get eligibility
    const eligibility = await this.prisma.employeeTransportEligibility.findFirst({
      where: { companyId, employeeId: userId },
    });

    return { ...user, savedLocations, emergencyContacts, eligibility };
  }

  async updateOwnProfile(companyId: string, userId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) {
      return { ...data, id: userId, updated: true };
    }

    // Only allow self-service fields
    const selfServiceFields = [
      'phone', 'homeLatitude', 'homeLongitude', 'homeAddress',
      'emergencyContactName', 'emergencyContactPhone',
    ];

    const updateData: any = {};
    for (const key of selfServiceFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid self-service fields to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, name: true, phone: true, homeAddress: true,
        emergencyContactName: true, emergencyContactPhone: true,
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'EMPLOYEE_SELF_UPDATE',
      entity: 'User',
      entityId: userId,
      newValue: updateData,
    });

    return updated;
  }

  async setPickupPin(companyId: string, userId: string, data: {
    name: string;
    type?: string;
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
  }) {
    if (!this.prisma.isConnected()) {
      return { ...data, userId, saved: true };
    }

    const location = await this.prisma.savedLocation.create({
      data: {
        userId,
        name: data.name,
        type: (data.type as any) || 'CUSTOM',
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        landmark: data.landmark,
        approved: 'APPROVED',
      },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'PICKUP_PIN_SET',
      entity: 'SavedLocation',
      entityId: location.id,
      newValue: { name: data.name, lat: data.latitude, lng: data.longitude },
    });

    return location;
  }

  async getSavedLocations(userId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    return this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSavedLocation(companyId: string, userId: string, locationId: string) {
    if (!this.prisma.isConnected()) {
      return { deleted: true, id: locationId };
    }

    const location = await this.prisma.savedLocation.findFirst({
      where: { id: locationId, userId },
    });
    if (!location) throw new NotFoundException('Location not found');

    await this.prisma.savedLocation.delete({ where: { id: locationId } });

    await this.audit.log({
      companyId,
      userId,
      action: 'SAVED_LOCATION_DELETED',
      entity: 'SavedLocation',
      entityId: locationId,
    });

    return { deleted: true, id: locationId };
  }

  async getTripHistory(companyId: string, userId: string, params: { page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) {
      return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [trips, total] = await Promise.all([
      this.prisma.trip.findMany({
        where: {
          companyId,
          OR: [
            { driverId: userId },
            { passengers: { some: { userId } } },
          ],
        } as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tripCode: true,
          status: true,
          type: true,
          date: true,
          pickupAddress: true,
          dropAddress: true,
          passengerCount: true,
          distanceKm: true,
          actualDuration: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.trip.count({
        where: {
          companyId,
          OR: [
            { driverId: userId },
            { passengers: { some: { userId } } },
          ],
        } as any,
      }),
    ]);

    return {
      data: trips,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async pauseRecurringBooking(companyId: string, userId: string, recurringBookingId: string) {
    if (!this.prisma.isConnected()) {
      return { id: recurringBookingId, status: 'PAUSED' };
    }

    const rb = await this.prisma.recurringBooking.findFirst({
      where: { id: recurringBookingId, companyId, employeeId: userId },
    });
    if (!rb) throw new NotFoundException('Recurring booking not found');

    const updated = await this.prisma.recurringBooking.update({
      where: { id: recurringBookingId },
      data: { status: 'PAUSED' },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'RECURRING_BOOKING_PAUSED',
      entity: 'RecurringBooking',
      entityId: recurringBookingId,
      oldValue: { status: rb.status },
      newValue: { status: 'PAUSED' },
    });

    return updated;
  }

  async resumeRecurringBooking(companyId: string, userId: string, recurringBookingId: string) {
    if (!this.prisma.isConnected()) {
      return { id: recurringBookingId, status: 'ACTIVE' };
    }

    const rb = await this.prisma.recurringBooking.findFirst({
      where: { id: recurringBookingId, companyId, employeeId: userId },
    });
    if (!rb) throw new NotFoundException('Recurring booking not found');

    const updated = await this.prisma.recurringBooking.update({
      where: { id: recurringBookingId },
      data: { status: 'ACTIVE' },
    });

    await this.audit.log({
      companyId,
      userId,
      action: 'RECURRING_BOOKING_RESUMED',
      entity: 'RecurringBooking',
      entityId: recurringBookingId,
      oldValue: { status: rb.status },
      newValue: { status: 'ACTIVE' },
    });

    return updated;
  }

  // ============================================================
  // 6. MANAGER / TL PORTAL
  // ============================================================

  async getPendingApprovals(companyId: string, managerUserId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Get reportee IDs
    const reportees = await this.prisma.user.findMany({
      where: {
        companyId,
        OR: [
          { managerId: managerUserId },
          { teamLeaderId: managerUserId },
        ],
      },
      select: { id: true },
    });

    const reporteeIds = reportees.map(r => r.id);

    // Get pending approvals for reportees' bookings
    const reporteeBookings = await this.prisma.booking.findMany({
      where: { companyId, requesterId: { in: reporteeIds } },
      select: { id: true },
    });
    const bookingIds = reporteeBookings.map(b => b.id);

    const approvals = await this.prisma.approvalEntry.findMany({
      where: {
        bookingId: { in: bookingIds },
        status: 'PENDING',
      },
      include: { booking: true, approver: { select: { id: true, name: true } } } as any,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      managerId: managerUserId,
      pendingCount: approvals.length,
      approvals,
    };
  }

  async approveRequest(companyId: string, approverUserId: string, approvalId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) {
    if (!this.prisma.isConnected()) {
      return { approvalId, decision, approverUserId };
    }

    const approval = await this.prisma.approvalEntry.findFirst({
      where: { id: approvalId },
    });
    if (!approval) throw new NotFoundException('Approval entry not found');

    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Approval is not pending');
    }

    const updated = await this.prisma.approvalEntry.update({
      where: { id: approvalId },
      data: {
        status: decision as any,
        approverId: approverUserId,
        decidedAt: new Date(),
        reason,
      },
    });

    await this.audit.log({
      companyId,
      userId: approverUserId,
      action: `APPROVAL_${decision}`,
      entity: 'ApprovalEntry',
      entityId: approvalId,
      oldValue: { status: 'PENDING' },
      newValue: { status: decision, reason },
    });

    return updated;
  }

  async getTeamTransportOverview(companyId: string, managerUserId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const reportees = await this.prisma.user.findMany({
      where: {
        companyId,
        OR: [
          { managerId: managerUserId },
          { teamLeaderId: managerUserId },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        transportEligibility: true,
        department: { select: { name: true } },
      } as any,
    });

    const reporteeIds = reportees.map(r => r.id);

    const [activeTrips, pendingBookings, completedToday] = await Promise.all([
      this.prisma.trip.count({
        where: {
          companyId,
          passengers: { some: { userId: { in: reporteeIds } } },
          status: { in: ['IN_TRANSIT', 'EN_ROUTE_TO_PICKUP', 'BOARDING'] },
        } as any,
      }),
      this.prisma.booking.count({
        where: {
          companyId,
          requesterId: { in: reporteeIds } as any,
          status: { in: ['REQUESTED', 'PENDING_APPROVAL'] },
        },
      }),
      this.prisma.trip.count({
        where: {
          companyId,
          passengers: { some: { userId: { in: reporteeIds } } },
          status: 'COMPLETED',
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        } as any,
      }),
    ]);

    return {
      managerId: managerUserId,
      reporteeCount: reportees.length,
      activeTrips,
      pendingBookings,
      completedToday,
      reportees,
    };
  }

  // ============================================================
  // 7. DIRECTOR PORTAL
  // ============================================================

  async getEscalatedApprovals(companyId: string, directorUserId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Get indirect reportees (reportees of reportees)
    const directReportees = await this.prisma.user.findMany({
      where: {
        companyId,
        OR: [
          { managerId: directorUserId },
          { teamLeaderId: directorUserId },
        ],
      },
      select: { id: true },
    });

    const directIds = directReportees.map(r => r.id);

    const indirectReportees = await this.prisma.user.findMany({
      where: {
        companyId,
        OR: [
          { managerId: { in: directIds } },
          { teamLeaderId: { in: directIds } },
        ],
      },
      select: { id: true },
    });

    const allReporteeIds = [...directIds, ...indirectReportees.map(r => r.id)];

    // Get escalated approvals (level >= 2, pending)
    const escalatedBookings = await this.prisma.booking.findMany({
      where: { companyId, requesterId: { in: allReporteeIds } },
      select: { id: true },
    });
    const escalatedBookingIds = escalatedBookings.map(b => b.id);

    const escalated = await this.prisma.approvalEntry.findMany({
      where: {
        bookingId: { in: escalatedBookingIds },
        status: 'PENDING',
        level: { gte: 2 },
      },
      include: { booking: true, approver: { select: { id: true, name: true } } } as any,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      directorId: directorUserId,
      escalatedCount: escalated.length,
      approvals: escalated,
    };
  }

  async getOrgExceptions(companyId: string, directorUserId: string) {
    if (!this.prisma.isConnected()) {
      return { transportBans: [], suspensions: [], overdueApprovals: [] };
    }

    // Get all reportees (2 levels deep)
    const direct = await this.prisma.user.findMany({
      where: { companyId, OR: [{ managerId: directorUserId }, { teamLeaderId: directorUserId }] },
      select: { id: true },
    });
    const directIds = direct.map(r => r.id);
    const indirect = await this.prisma.user.findMany({
      where: { companyId, OR: [{ managerId: { in: directIds } }, { teamLeaderId: { in: directIds } }] },
      select: { id: true },
    });
    const allIds = [...directIds, ...indirect.map(r => r.id)];

    const [bans, suspensions, overdueApprovals] = await Promise.all([
      this.prisma.transportBan.findMany({
        where: { companyId, employeeId: { in: allIds }, status: 'ACTIVE' },
        take: 20,
      }),
      this.prisma.user.findMany({
        where: { companyId, id: { in: allIds }, transportEligibility: 'INELIGIBLE' },
        select: { id: true, name: true, employeeId: true },
        take: 20,
      }),
      this.prisma.approvalEntry.findMany({
        where: { status: 'PENDING', level: { gte: 2 } },
        take: 20,
      }),
    ]);

    return { transportBans: bans, suspensions, overdueApprovals };
  }
}
