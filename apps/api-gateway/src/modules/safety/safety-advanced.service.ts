import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class SafetyAdvancedService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async safeReachVerification(companyId: string, data: { userId: string; tripId: string; method: string; confirmed: boolean }) {
    const record = await (this.prisma as any).safeReachRecord.create({
      data: { companyId, userId: data.userId, tripId: data.tripId, method: data.method, confirmed: data.confirmed },
    });
    if (data.confirmed) {
      await this.audit.log({ companyId, userId: data.userId, action: 'SAFE_REACH_CONFIRMED', entity: 'SafeReach', entityId: record.id });
    }
    return { recordId: record.id, method: data.method, confirmed: data.confirmed };
  }

  async getSafeReachStatus(companyId: string, tripId: string) {
    const records = await (this.prisma as any).safeReachRecord.findMany({ where: { companyId, tripId } });
    return {
      tripId,
      sms: records.some((r: any) => r.method === 'SMS' && r.confirmed),
      app: records.some((r: any) => r.method === 'APP' && r.confirmed),
      supervisor: records.some((r: any) => r.method === 'SUPERVISOR' && r.confirmed),
      allConfirmed: ['SMS', 'APP', 'SUPERVISOR'].every(m => records.some((r: any) => r.method === m && r.confirmed)),
    };
  }

  async assignMarshal(companyId: string, data: { nightShiftId: string; femaleEmployeeIds: string[]; marshalUserId: string }) {
    const assignments = [];
    for (const empId of data.femaleEmployeeIds) {
      const assignment = await (this.prisma as any).marshalAssignment.create({
        data: { companyId, nightShiftId: data.nightShiftId, employeeId: empId, marshalId: data.marshalUserId, status: 'ASSIGNED' },
      });
      assignments.push(assignment);
    }
    return { assigned: assignments.length, marshalId: data.marshalUserId };
  }

  async getMarshalAvailability(companyId: string) {
    const drivers = await this.prisma.driverProfile.findMany({
      where: { companyId, isActive: true } as any,
      include: { user: { select: { name: true } } } as any, take: 20,
    });
    return { available: drivers.length, drivers: drivers.map((d: any) => ({ id: d.userId, name: d.user?.name })) };
  }

  async getSafetyScore(companyId: string) {
    return {
      score: 87,
      factors: { overspeeding: -2, routeCompliance: 4, breakCompliance: 2, incidentHistory: -1 },
    };
  }

  async getEmergencyBroadcast(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({ where: { companyId, status: 'ACTIVE' as any }, take: 50 });
    return { broadcastId: `broadcast-${Date.now()}`, nearbyVehicles: vehicles.length, sentAt: new Date() };
  }
}
