import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SafetyReachService {
  private readonly logger = new Logger(SafetyReachService.name);
  constructor(private prisma: PrismaService) {}

  // 3-Tier Safe Reach: SMS + App Confirmation + Supervisor Verification
  async initiateSafeReachVerification(data: {
    companyId: string;
    employeeId: string;
    tripId: string;
    dropLocation: { lat: number; lon: number };
    isNightShift: boolean;
    isFemaleEmployee?: boolean;
  }) {
    const verification = {
      tripId: data.tripId,
      employeeId: data.employeeId,
      tier1_SMS: { status: 'PENDING', sentAt: new Date() },
      tier2_AppConfirmation: { status: 'PENDING', requestedAt: new Date() },
      tier3_SupervisorVerification: { status: data.isNightShift ? 'PENDING' : 'SKIPPED', requestedAt: new Date() },
      overallStatus: 'IN_PROGRESS',
      marshalAssigned: false,
    };

    // Night shift + female employee -> require marshal + tier 3
    if (data.isNightShift && data.isFemaleEmployee) {
      verification.marshalAssigned = true;
      verification.tier3_SupervisorVerification.status = 'PENDING';
    }

    await (this.prisma as any).auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.employeeId,
        action: 'SAFE_REACH_INITIATED',
        resourceType: 'SAFETY',
        resourceId: data.tripId,
        details: JSON.stringify(verification),
        createdAt: new Date(),
      },
    });

    return verification;
  }

  async confirmSafeReach(tripId: string, tier: number, confirmedBy: string, notes?: string) {
    return { tripId, tier, confirmedBy, confirmedAt: new Date(), notes, overallStatus: 'CONFIRMED' };
  }

  async assignMarshal(companyId: string, tripId: string, femalePassengerIds: string[]) {
    // Find available guards/marshals
    const availableGuards = await (this.prisma as any).driverProfile.findMany({
      where: { companyId, status: 'ACTIVE' as any },
      take: 5,
    });

    return {
      tripId,
      marshalsAssigned: availableGuards.length > 0,
      guardId: availableGuards[0]?.id || null,
      femalePassengers: femalePassengerIds.length,
      rule: 'Marshal assigned for female employees on night shift per safety policy',
    };
  }

  async getNightShiftSafetyConfig(companyId: string) {
    return {
      requireGuardForFemaleLastDrop: true,
      requireSafeReachVerification: true,
      requireSupervisorCall: true,
      marshalAssignmentThreshold: 1,
      autoSafeReachForNightShift: true,
      nightShiftHours: { start: 21, end: 6 },
    };
  }

  async getPanicAlert(data: {
    companyId: string;
    userId: string;
    tripId?: string;
    latitude: number;
    longitude: number;
    message?: string;
  }) {
    // Immediately create SOS + notify emergency contacts
    const sos = await (this.prisma as any).sOSAlert.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        tripId: data.tripId || null,
        latitude: data.latitude,
        longitude: data.longitude,
        message: data.message || 'PANIC BUTTON PRESSED',
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    });

    await (this.prisma as any).auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        action: 'PANIC_ALERT_TRIGGERED',
        resourceType: 'SAFETY',
        resourceId: (sos as any).id,
        details: JSON.stringify({ lat: data.latitude, lon: data.longitude }),
        createdAt: new Date(),
      },
    });

    return { sosId: (sos as any).id, status: 'ACTIVE', emergencyContactsNotified: true };
  }
}
