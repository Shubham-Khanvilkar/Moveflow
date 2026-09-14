import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class WorkplaceManagementService {
  private readonly logger = new Logger(WorkplaceManagementService.name);
  constructor(private prisma: PrismaService) {}

  async getSpaceUtilization(companyId: string, date: Date) {
    return {
      date: date.toISOString().split('T')[0],
      desks: { total: 200, booked: 156, available: 44, utilizationPercent: 78 },
      meetingRooms: { total: 20, booked: 14, available: 6, utilizationPercent: 70 },
      parking: { total: 100, occupied: 67, available: 33, utilizationPercent: 67 },
      visitors: { expected: 12, checkedIn: 8, checkedOut: 3 },
      meals: { ordered: 145, delivered: 130, pending: 15 },
    };
  }

  async getTransportToDeskIntegration(companyId: string, employeeId: string) {
    const trip = await (this.prisma as any).trip.findFirst({
      where: { companyId, passengers: { some: { passengerId: employeeId } }, status: { in: ['IN_TRANSIT', 'ARRIVED'] } },
    });
    return {
      tripStatus: (trip as any)?.status || 'NO_TRIP',
      estimatedArrival: trip ? new Date(Date.now() + 25 * 60000) : null,
      deskStatus: 'RESERVED',
      deskNumber: 'A-42',
      meetingRoom: null,
    };
  }
}
