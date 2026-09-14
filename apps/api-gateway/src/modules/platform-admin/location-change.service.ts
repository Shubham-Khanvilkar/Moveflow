import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

export interface SubmitLocationChangeDto {
  companyId: string;
  employeeId: string;
  requestedBy: string;
  newLatitude: number;
  newLongitude: number;
  newAddress: string;
  reason: string;
  effectiveDate?: string;
}

export interface DecideLocationChangeDto {
  requestId: string;
  approvedBy: string;
  decision: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  effectiveDate?: string;
}

@Injectable()
export class LocationChangeService {
  private readonly logger = new Logger(LocationChangeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Submit a location change request.
   */
  async submitRequest(dto: SubmitLocationChangeDto) {
    const employee = await this.prisma.user.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.companyId !== dto.companyId) {
      throw new BadRequestException('Employee does not belong to this company');
    }

    // Check for pending request
    const pending = await (this.prisma as any).locationChangeRequest.findFirst({
      where: {
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        status: 'PENDING',
      },
    });
    if (pending) {
      throw new BadRequestException('Employee already has a pending location change request');
    }

    // Calculate impact analysis
    const impact = await this.analyzeImpact(
      dto.companyId,
      dto.employeeId,
      dto.newLatitude,
      dto.newLongitude,
    );

    const request = await (this.prisma as any).locationChangeRequest.create({
      data: {
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        requestedBy: dto.requestedBy,
        oldLatitude: employee.homeLatitude || 0,
        oldLongitude: employee.homeLongitude || 0,
        oldAddress: employee.homeAddress || '',
        newLatitude: dto.newLatitude,
        newLongitude: dto.newLongitude,
        newAddress: dto.newAddress,
        reason: dto.reason,
        status: 'PENDING',
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        impactAnalysis: impact as any,
        distanceChange: impact.distanceChange,
        routeImpact: impact.routeImpact,
        costImpact: impact.costImpact,
      },
    });

    await this.auditService.log({
      companyId: dto.companyId,
      userId: dto.requestedBy,
      action: 'LOCATION_CHANGE_REQUESTED',
      entity: 'LocationChangeRequest',
      entityId: request.id,
      metadata: {
        employeeId: dto.employeeId,
        oldAddress: employee.homeAddress,
        newAddress: dto.newAddress,
        distanceChange: impact.distanceChange,
      },
    });

    this.logger.log(`Location change request created: ${request.id}`);
    return { success: true, data: request };
  }

  /**
   * Approve or reject a location change request.
   */
  async decide(dto: DecideLocationChangeDto) {
    const request = await (this.prisma as any).locationChangeRequest.findUnique({
      where: { id: dto.requestId },
    });
    if (!request) throw new NotFoundException('Location change request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    if (dto.decision === 'APPROVED') {
      // Update employee location
      const effectiveDate = dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : new Date();

      await this.prisma.user.update({
        where: { id: request.employeeId },
        data: {
          homeLatitude: request.newLatitude,
          homeLongitude: request.newLongitude,
          homeAddress: request.newAddress,
        },
      });

      // Record in LocationHistory
      await (this.prisma as any).locationHistory.create({
        data: {
          companyId: request.companyId,
          employeeId: request.employeeId,
          latitude: request.newLatitude,
          longitude: request.newLongitude,
          address: request.newAddress,
          source: 'APPROVED',
          approvedBy: dto.approvedBy,
          validFrom: effectiveDate,
        },
      });

      // Close previous LocationHistory
      await (this.prisma as any).locationHistory.updateMany({
        where: {
          employeeId: request.employeeId,
          validTo: null,
          id: { not: undefined },
        },
        data: { validTo: new Date() },
      });
    }

    const updated = await (this.prisma as any).locationChangeRequest.update({
      where: { id: dto.requestId },
      data: {
        status: dto.decision,
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
        rejectionReason: dto.decision === 'REJECTED' ? dto.rejectionReason : null,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : request.effectiveDate,
      },
    });

    await this.auditService.log({
      companyId: request.companyId,
      userId: dto.approvedBy,
      action: `LOCATION_CHANGE_${dto.decision}`,
      entity: 'LocationChangeRequest',
      entityId: dto.requestId,
      metadata: {
        employeeId: request.employeeId,
        decision: dto.decision,
        reason: dto.rejectionReason,
      },
    });

    return { success: true, data: updated };
  }

  /**
   * List location change requests with filters.
   */
  async listRequests(companyId: string, query?: {
    status?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const where: any = { companyId };
    if (query?.status) where.status = query.status;
    if (query?.employeeId) where.employeeId = query.employeeId;

    const [requests, total] = await Promise.all([
      (this.prisma as any).locationChangeRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.prisma as any).locationChangeRequest.count({ where }),
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get location change request by ID.
   */
  async getRequest(requestId: string) {
    const request = await (this.prisma as any).locationChangeRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Location change request not found');
    return { success: true, data: request };
  }

  /**
   * Get location history for an employee.
   */
  async getLocationHistory(employeeId: string) {
    const history = await (this.prisma as any).locationHistory.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: history };
  }

  /**
   * Manually update employee location (admin override).
   */
  async manualUpdate(companyId: string, employeeId: string, dto: {
    latitude: number;
    longitude: number;
    address: string;
    updatedBy: string;
    reason?: string;
  }) {
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.companyId !== companyId) {
      throw new BadRequestException('Employee does not belong to this company');
    }

    await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        homeLatitude: dto.latitude,
        homeLongitude: dto.longitude,
        homeAddress: dto.address,
      },
    });

    await (this.prisma as any).locationHistory.create({
      data: {
        companyId,
        employeeId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        source: 'MANUAL_OVERRIDE',
        approvedBy: dto.updatedBy,
        validFrom: new Date(),
      },
    });

    await this.auditService.log({
      companyId,
      userId: dto.updatedBy,
      action: 'LOCATION_MANUAL_UPDATE',
      entity: 'User',
      entityId: employeeId,
      metadata: {
        newAddress: dto.address,
        reason: dto.reason,
      },
    });

    return { success: true, message: 'Location updated' };
  }

  /**
   * Analyze impact of a location change.
   */
  private async analyzeImpact(
    companyId: string,
    employeeId: string,
    newLat: number,
    newLng: number,
  ) {
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { homeLatitude: true, homeLongitude: true, homeAddress: true },
    });

    const oldLat = employee?.homeLatitude || 0;
    const oldLng = employee?.homeLongitude || 0;

    // Haversine distance
    const R = 6371; // Earth radius in km
    const dLat = ((newLat - oldLat) * Math.PI) / 180;
    const dLng = ((newLng - oldLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((oldLat * Math.PI) / 180) *
        Math.cos((newLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Determine route impact
    let routeImpact = 'LOW';
    if (distanceKm > 5) routeImpact = 'HIGH';
    else if (distanceKm > 2) routeImpact = 'MODERATE';

    // Estimate cost impact (rough: ₹15/km)
    const costImpact = distanceKm * 15;

    // Check if on existing route
    const nearestRoute = await this.prisma.route.findFirst({
      where: {
        companyId,
      },
      take: 1,
    });

    return {
      distanceChange: Math.round(distanceKm * 100) / 100,
      routeImpact,
      costImpact: Math.round(costImpact),
      onExistingRoute: !!nearestRoute,
      oldAddress: employee?.homeAddress || '',
      oldCoordinates: { lat: oldLat, lng: oldLng },
      newCoordinates: { lat: newLat, lng: newLng },
    };
  }
}
