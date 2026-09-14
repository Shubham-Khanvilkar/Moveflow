import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class RouteManagementService {
  private readonly logger = new Logger(RouteManagementService.name);
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async createRoute(companyId: string, data: { routeCode: string; routeName: string; routeType: string; originLatitude: number; originLongitude: number; originAddress?: string; destLatitude: number; destLongitude: number; destAddress?: string; distanceKm?: number; estimatedMinutes?: number; stops?: any[]; serviceDays?: string; operatingHours?: any; shiftAssignments?: string; vehicleType?: string; maxCapacity?: number; farePerKm?: number; fixedFare?: number; priority?: number }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const route = await this.prisma.routeManagement.create({ data: { companyId, ...data, stops: JSON.stringify(data.stops || []), createdBy } });
    await this.audit.log({ companyId, userId: createdBy, action: 'ROUTE_CREATED', entity: 'RouteManagement', entityId: route.id, newValue: { routeName: data.routeName } });
    return route;
  }

  async getRoutes(companyId: string, params?: { routeType?: string; status?: string; search?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.routeType) where.routeType = params.routeType.toUpperCase();
    if (params?.status) where.status = params.status.toUpperCase();
    if (params?.search) where.OR = [{ routeName: { contains: params.search, mode: 'insensitive' } }, { routeCode: { contains: params.search } }];
    const [data, total] = await Promise.all([this.prisma.routeManagement.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.routeManagement.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateRoute(companyId: string, routeId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.routeManagement.update({ where: { id: routeId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'ROUTE_UPDATED', entity: 'RouteManagement', entityId: routeId, newValue: data });
    return updated;
  }

  async deleteRoute(companyId: string, routeId: string, deletedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    await this.prisma.routeManagement.update({ where: { id: routeId }, data: { status: 'INACTIVE' } });
    await this.audit.log({ companyId, userId: deletedBy, action: 'ROUTE_DEACTIVATED', entity: 'RouteManagement', entityId: routeId });
    return { deactivated: true };
  }

  async createNodalPoint(companyId: string, data: { nodalCode: string; nodalName: string; latitude: number; longitude: number; address?: string; city?: string; landmark?: string; capacity?: number; operatingHours?: any; contactPerson?: string; contactPhone?: string; facilities?: string; zoneName?: string; zoneId?: string }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const nodal = await this.prisma.nodalPoint.create({ data: { companyId, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'NODAL_CREATED', entity: 'NodalPoint', entityId: nodal.id });
    return nodal;
  }

  async getNodalPoints(companyId: string, params?: { isActive?: string; search?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.isActive !== undefined) where.isActive = params.isActive === 'true';
    if (params?.search) where.OR = [{ nodalName: { contains: params.search, mode: 'insensitive' } }, { nodalCode: { contains: params.search } }];
    const [data, total] = await Promise.all([this.prisma.nodalPoint.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.nodalPoint.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateNodalPoint(companyId: string, nodalId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.nodalPoint.update({ where: { id: nodalId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'NODAL_UPDATED', entity: 'NodalPoint', entityId: nodalId, newValue: data });
    return updated;
  }

  async createShuttleRoute(companyId: string, data: { shuttleCode: string; shuttleName: string; routeId?: string; originName: string; originLatitude: number; originLongitude: number; destName: string; destLatitude: number; destLongitude: number; distanceKm?: number; estimatedMinutes?: number; stops?: any[]; frequencyMinutes?: number; operatingHours?: any; serviceDays?: string; vehicleType?: string; maxCapacity?: number; farePerTrip?: number }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const shuttle = await this.prisma.shuttleRoute.create({ data: { companyId, ...data, stops: JSON.stringify(data.stops || []) } });
    await this.audit.log({ companyId, userId: createdBy, action: 'SHUTTLE_CREATED', entity: 'ShuttleRoute', entityId: shuttle.id });
    return shuttle;
  }

  async getShuttleRoutes(companyId: string, params?: { isActive?: string; search?: string; page?: number; limit?: number }) {
    if (!this.prisma.isConnected()) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const page = params?.page || 1; const limit = Math.min(params?.limit || 20, 100); const skip = (page - 1) * limit;
    const where: any = { companyId };
    if (params?.isActive !== undefined) where.isActive = params.isActive === 'true';
    if (params?.search) where.OR = [{ shuttleName: { contains: params.search, mode: 'insensitive' } }, { shuttleCode: { contains: params.search } }];
    const [data, total] = await Promise.all([this.prisma.shuttleRoute.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }), this.prisma.shuttleRoute.count({ where })]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateShuttleRoute(companyId: string, shuttleId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const updated = await this.prisma.shuttleRoute.update({ where: { id: shuttleId }, data });
    await this.audit.log({ companyId, userId: updatedBy, action: 'SHUTTLE_UPDATED', entity: 'ShuttleRoute', entityId: shuttleId, newValue: data });
    return updated;
  }

  async createOfficeLocation(companyId: string, data: { locationCode: string; locationName: string; latitude: number; longitude: number; address?: string; city?: string; state?: string; pincode?: string; radiusKm?: number; timezone?: string; contactPerson?: string; contactPhone?: string; operatingHours?: any; parkingCapacity?: number; isHeadquarters?: boolean }, createdBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    const location = await this.prisma.officeLocation.create({ data: { companyId, ...data } });
    await this.audit.log({ companyId, userId: createdBy, action: 'LOCATION_CREATED', entity: 'OfficeLocation', entityId: location.id });
    return location;
  }

  async getOfficeLocations(companyId: string) {
    if (!this.prisma.isConnected()) return [];
    return this.prisma.officeLocation.findMany({ where: { companyId, isActive: true }, orderBy: { locationName: 'asc' } });
  }

  async updateOfficeLocation(companyId: string, locationId: string, data: Record<string, any>, updatedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');
    return this.prisma.officeLocation.update({ where: { id: locationId }, data });
  }
}
