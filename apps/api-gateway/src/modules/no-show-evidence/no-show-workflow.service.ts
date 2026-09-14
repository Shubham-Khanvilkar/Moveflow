import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface NoShowDecision {
  canNoShow: boolean;
  reason: string;
  evidence: {
    arrivalRecorded: boolean;
    gracePeriodExpired: boolean;
    requiredCallAttempts: number;
    completedCallAttempts: number;
    callGapMet: boolean;
    supervisorContacted: boolean;
  };
}

export interface SupervisorCallResult {
  id: string;
  status: string;
  driverInstruction: string;
  outcome: string;
}

@Injectable()
export class NoShowWorkflowService {
  private readonly logger = new Logger(NoShowWorkflowService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================
  // 1. PICKUP ARRIVAL EVENT
  // ============================================================
  async recordPickupArrival(data: {
    companyId: string;
    tripId: string;
    bookingId: string;
    passengerId: string;
    driverId: string;
    vehicleId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    pickupLatitude: number;
    pickupLongitude: number;
  }) {
    const distanceMeters = this.haversineDistance(
      data.latitude, data.longitude,
      data.pickupLatitude, data.pickupLongitude,
    );

    const policy = await this.getNoShowPolicy(data.companyId);
    const geofenceRadius = policy?.gracePeriodMinutes || 100;
    const geofenceMatched = distanceMeters <= geofenceRadius;

    // Verify GPS accuracy
    if (data.accuracy > 50) {
      this.logger.warn(`Low GPS accuracy: ${data.accuracy}m for driver ${data.driverId}`);
    }

    const event = await (this.prisma as any).pickupArrivalEvent.create({
      data: {
        companyId: data.companyId,
        tripId: data.tripId,
        bookingId: data.bookingId,
        passengerId: data.passengerId,
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        distanceFromPickupMeters: distanceMeters,
        arrivedAt: new Date(),
        geofenceMatched,
        createdAt: new Date(),
      },
    });

    // Update trip status to ARRIVED
    await (this.prisma as any).trip.update({
      where: { id: data.tripId },
      data: { status: 'ARRIVED' },
    });

    // Create AuditLog
    await this.createAuditLog(data.companyId, data.driverId, 'DRIVER_ARRIVAL', {
      tripId: data.tripId,
      passengerId: data.passengerId,
      latitude: data.latitude,
      longitude: data.longitude,
      distanceMeters,
      geofenceMatched,
      accuracy: data.accuracy,
    });

    return {
      event,
      distanceMeters,
      geofenceMatched,
      accuracy: data.accuracy,
      gpsAccuracyAcceptable: data.accuracy <= 50,
    };
  }

  // ============================================================
  // 2. NO-SHOW ELIGIBILITY CHECK
  // ============================================================
  async checkNoShowEligibility(
    companyId: string,
    tripId: string,
    passengerId: string,
  ): Promise<NoShowDecision> {
    const policy = await this.getNoShowPolicy(companyId);
    const requiredCalls = policy?.requiredCallAttempts || 2;
    const graceMinutes = policy?.gracePeriodMinutes || 10;
    const minGapMinutes = policy?.minimumMinutesBetweenCalls || 2;
    const requiresSupervisor = policy?.controlRoomConfirmation || false;

    // Check arrival event exists
    const arrivalEvent = await (this.prisma as any).pickupArrivalEvent.findFirst({
      where: { tripId, passengerId, companyId },
      orderBy: { arrivedAt: 'desc' },
    });

    const arrivalRecorded = !!arrivalEvent;

    // Check grace period
    let gracePeriodExpired = false;
    if (arrivalEvent) {
      const elapsed = (Date.now() - arrivalEvent.arrivedAt.getTime()) / 60000;
      gracePeriodExpired = elapsed >= graceMinutes;
    }

    // Check call attempts
    const callAttempts = await (this.prisma as any).passengerContactAttempt.findMany({
      where: { tripId, passengerId, companyId },
      orderBy: { attemptedAt: 'asc' },
    });

    const completedCallAttempts = callAttempts.length;

    // Check call time gap
    let callGapMet = true;
    if (completedCallAttempts >= 2 && minGapMinutes > 0) {
      for (let i = 1; i < callAttempts.length; i++) {
        const gap = (callAttempts[i].attemptedAt.getTime() - callAttempts[i - 1].attemptedAt.getTime()) / 60000;
        if (gap < minGapMinutes) {
          callGapMet = false;
          break;
        }
      }
    }

    // Check supervisor contact
    let supervisorContacted = false;
    if (requiresSupervisor) {
      const supervisorRequest = await (this.prisma as any).supervisorCallRequest.findFirst({
        where: {
          tripId,
          passengerId,
          companyId,
          status: { in: ['COMPLETED', 'CANCELLED'] },
        },
      });
      supervisorContacted = !!supervisorRequest;
    }

    const canNoShow =
      arrivalRecorded &&
      gracePeriodExpired &&
      completedCallAttempts >= requiredCalls &&
      callGapMet &&
      (!requiresSupervisor || supervisorContacted);

    let reason = '';
    if (!arrivalRecorded) reason = 'Driver arrival not recorded';
    else if (!gracePeriodExpired) reason = `Grace period not expired (${graceMinutes} min required)`;
    else if (completedCallAttempts < requiredCalls) reason = `Only ${completedCallAttempts}/${requiredCalls} call attempts completed`;
    else if (!callGapMet) reason = `Call time gap not met (${minGapMinutes} min required between attempts)`;
    else if (requiresSupervisor && !supervisorContacted) reason = 'Supervisor contact required but not completed';
    else reason = 'All evidence requirements met';

    return {
      canNoShow,
      reason,
      evidence: {
        arrivalRecorded,
        gracePeriodExpired,
        requiredCallAttempts: requiredCalls,
        completedCallAttempts,
        callGapMet,
        supervisorContacted,
      },
    };
  }

  // ============================================================
  // 3. RECORD CALL ATTEMPT
  // ============================================================
  async recordCallAttempt(data: {
    companyId: string;
    tripId: string;
    bookingId: string;
    passengerId: string;
    driverId: string;
    method: string;
    result: string;
    durationSeconds?: number;
    notes?: string;
  }) {
    const policy = await this.getNoShowPolicy(data.companyId);
    const minGapMinutes = policy?.minimumMinutesBetweenCalls || 2;

    // Validate call gap
    const lastAttempt = await (this.prisma as any).passengerContactAttempt.findFirst({
      where: {
        tripId: data.tripId,
        passengerId: data.passengerId,
        companyId: data.companyId,
      },
      orderBy: { attemptedAt: 'desc' },
    });

    if (lastAttempt && minGapMinutes > 0) {
      const gapMinutes = (Date.now() - lastAttempt.attemptedAt.getTime()) / 60000;
      if (gapMinutes < minGapMinutes) {
        throw new BadRequestException(
          `Must wait ${Math.ceil(minGapMinutes - gapMinutes)} more minutes before next call attempt. Minimum gap: ${minGapMinutes} min.`,
        );
      }
    }

    // Get next attempt number
    const attemptCount = await (this.prisma as any).passengerContactAttempt.count({
      where: {
        tripId: data.tripId,
        passengerId: data.passengerId,
        companyId: data.companyId,
      },
    });

    const attempt = await (this.prisma as any).passengerContactAttempt.create({
      data: {
        companyId: data.companyId,
        tripId: data.tripId,
        bookingId: data.bookingId,
        passengerId: data.passengerId,
        driverId: data.driverId,
        attemptNumber: attemptCount + 1,
        attemptedAt: new Date(),
        method: data.method as any,
        result: data.result as any,
        durationSeconds: data.durationSeconds || null,
        notes: data.notes || null,
        createdAt: new Date(),
      },
    });

    // Audit log
    await this.createAuditLog(data.companyId, data.driverId, 'CALL_ATTEMPT', {
      tripId: data.tripId,
      passengerId: data.passengerId,
      attemptNumber: attempt.attemptNumber,
      method: data.method,
      result: data.result,
    });

    // Check if passenger responded positively
    if (data.result === 'ANSWERED' || data.result === 'PASSENGER_RESPONDED') {
      // Passenger is available - cancel no-show
      await (this.prisma as any).trip.update({
        where: { id: data.tripId },
        data: { status: 'BOARDING' },
      });
      return { attempt, passengerAvailable: true, action: 'BOARDING' };
    }

    return { attempt, passengerAvailable: false, action: null };
  }

  // ============================================================
  // 4. REQUEST SUPERVISOR CALL
  // ============================================================
  async requestSupervisorCall(data: {
    companyId: string;
    tripId: string;
    bookingId: string;
    passengerId: string;
    driverId: string;
    reason: string;
    priority?: string;
  }) {
    const policy = await this.getNoShowPolicy(data.companyId);
    const responseWindowMinutes = policy?.gracePeriodMinutes || 5;

    const request = await (this.prisma as any).supervisorCallRequest.create({
      data: {
        companyId: data.companyId,
        tripId: data.tripId,
        bookingId: data.bookingId,
        passengerId: data.passengerId,
        driverId: data.driverId,
        requestedAt: new Date(),
        reason: data.reason,
        priority: (data.priority || 'NORMAL') as any,
        status: 'REQUESTED',
        createdAt: new Date(),
      },
    });

    // Schedule timeout escalation
    const timeoutMs = responseWindowMinutes * 60 * 1000;
    setTimeout(async () => {
      const current = await (this.prisma as any).supervisorCallRequest.findUnique({ where: { id: request.id } });
      if (current && current.status === 'REQUESTED') {
        await (this.prisma as any).supervisorCallRequest.update({
          where: { id: request.id },
          data: { status: 'ESCALATED' },
        });
        await this.createAuditLog(data.companyId, data.driverId, 'SUPERVISOR_CALL_ESCALATED', {
          requestId: request.id,
          tripId: data.tripId,
          reason: 'Response window expired',
        });
      }
    }, timeoutMs);

    await this.createAuditLog(data.companyId, data.driverId, 'SUPERVISOR_CALL_REQUESTED', {
      requestId: request.id,
      tripId: data.tripId,
      passengerId: data.passengerId,
      reason: data.reason,
    });

    return request;
  }

  // ============================================================
  // 5. ASSIGN SUPERVISOR
  // ============================================================
  async assignSupervisor(requestId: string, supervisorId: string, companyId: string) {
    const request = await (this.prisma as any).supervisorCallRequest.update({
      where: { id: requestId },
      data: {
        assignedSupervisorId: supervisorId,
        status: 'ASSIGNED',
      },
    });

    await this.createAuditLog(companyId, supervisorId, 'SUPERVISOR_ASSIGNED', {
      requestId,
      tripId: request.tripId,
    });

    return request;
  }

  // ============================================================
  // 6. SUPERVISOR RECORDS OUTCOME + DRIVER INSTRUCTION
  // ============================================================
  async supervisorRecordOutcome(
    requestId: string,
    supervisorId: string,
    companyId: string,
    data: {
      callOutcome: string;
      driverInstruction: 'WAIT' | 'PROCEED' | 'CANCEL_NO_SHOW' | 'OTHER';
      notes?: string;
    },
  ) {
    const request = await (this.prisma as any).supervisorCallRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        resolvedAt: new Date(),
      },
    });

    // Apply driver instruction
    if (data.driverInstruction === 'CANCEL_NO_SHOW') {
      await (this.prisma as any).trip.update({
        where: { id: request.tripId },
        data: { status: 'BOARDING' },
      });
    } else if (data.driverInstruction === 'PROCEED') {
      // Allow no-show to proceed
    }

    await this.createAuditLog(companyId, supervisorId, 'SUPERVISOR_CALL_COMPLETED', {
      requestId,
      tripId: request.tripId,
      callOutcome: data.callOutcome,
      driverInstruction: data.driverInstruction,
      notes: data.notes,
    });

    return { ...request, driverInstruction: data.driverInstruction };
  }

  // ============================================================
  // 7. FINALIZE NO-SHOW
  // ============================================================
  async finalizeNoShow(
    companyId: string,
    tripId: string,
    passengerId: string,
    driverId: string,
    reason: string,
  ) {
    // Verify all evidence
    const eligibility = await this.checkNoShowEligibility(companyId, tripId, passengerId);
    if (!eligibility.canNoShow) {
      throw new BadRequestException(`Cannot finalize NO_SHOW: ${eligibility.reason}`);
    }

    // Create no-show evidence record
    const evidence = await (this.prisma as any).noShowEvidence.create({
      data: {
        companyId,
        tripId,
        passengerId,
        driverId,
        reason,
        arrivalRecorded: eligibility.evidence.arrivalRecorded,
        gracePeriodExpired: eligibility.evidence.gracePeriodExpired,
        requiredCallAttempts: eligibility.evidence.requiredCallAttempts,
        completedCallAttempts: eligibility.evidence.completedCallAttempts,
        callGapMet: eligibility.evidence.callGapMet,
        supervisorContacted: eligibility.evidence.supervisorContacted,
        status: 'PENDING_REVIEW',
        createdAt: new Date(),
      },
    });

    // Update trip status
    await (this.prisma as any).trip.update({
      where: { id: tripId },
      data: { status: 'NO_SHOW' },
    });

    // Record employee no-show
    await (this.prisma as any).employeeNoShowRecord.create({
      data: {
        companyId,
        employeeId: passengerId,
        tripId,
        driverId,
        reason,
        recordedAt: new Date(),
        createdAt: new Date(),
      },
    });

    await this.createAuditLog(companyId, driverId, 'NO_SHOW_MARKED', {
      tripId,
      passengerId,
      reason,
      evidenceId: evidence.id,
    });

    return evidence;
  }

  // ============================================================
  // 8. SUBMIT NO-SHOW APPEAL
  // ============================================================
  async submitAppeal(data: {
    companyId: string;
    employeeId: string;
    noShowRecordId: string;
    tripId: string;
    reason: string;
    supportingEvidence?: string;
  }) {
    // Check 48-hour appeal window
    const noShowRecord = await (this.prisma as any).employeeNoShowRecord.findUnique({
      where: { id: data.noShowRecordId },
    });
    if (!noShowRecord) throw new NotFoundException('No-show record not found');

    const hoursSince = (Date.now() - noShowRecord.recordedAt.getTime()) / 3600000;
    const appealWindowHours = 48;
    if (hoursSince > appealWindowHours) {
      throw new BadRequestException(`Appeal window expired. No-show was ${Math.round(hoursSince)}h ago. Window: ${appealWindowHours}h.`);
    }

    const appeal = await (this.prisma as any).noShowAppeal.create({
      data: {
        companyId: data.companyId,
        employeeId: data.employeeId,
        noShowRecordId: data.noShowRecordId,
        tripId: data.tripId,
        reason: data.reason,
        supportingEvidence: data.supportingEvidence || null,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        slaDeadline: new Date(Date.now() + 48 * 3600000),
        createdAt: new Date(),
      },
    });

    // Schedule SLA escalation (48 hours)
    setTimeout(async () => {
      const current = await (this.prisma as any).noShowAppeal.findUnique({ where: { id: appeal.id } });
      if (current && current.status === 'SUBMITTED') {
        await (this.prisma as any).noShowAppeal.update({
          where: { id: appeal.id },
          data: { status: 'SLA_BREACHED', escalationLevel: 1 },
        });
        await this.createAuditLog(data.companyId, data.employeeId, 'APPEAL_SLA_BREACHED', {
          appealId: appeal.id,
          tripId: data.tripId,
        });
      }
    }, 48 * 3600000);

    await this.createAuditLog(data.companyId, data.employeeId, 'APPEAL_SUBMITTED', {
      appealId: appeal.id,
      tripId: data.tripId,
      reason: data.reason,
    });

    return appeal;
  }

  // ============================================================
  // 9. DECIDE ON APPEAL
  // ============================================================
  async decideAppeal(
    appealId: string,
    companyId: string,
    reviewerId: string,
    decision: 'APPROVED' | 'REJECTED' | 'ESCALATED',
    reason: string,
  ) {
    const appeal = await (this.prisma as any).noShowAppeal.update({
      where: { id: appealId },
      data: {
        status: decision,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        decisionReason: reason,
      },
    });

    // If approved, overturn the no-show
    if (decision === 'APPROVED') {
      await (this.prisma as any).employeeNoShowRecord.update({
        where: { id: appeal.noShowRecordId },
        data: { overturned: true, overturnedBy: reviewerId, overturnedAt: new Date() },
      });
      await (this.prisma as any).trip.update({
        where: { id: appeal.tripId },
        data: { status: 'COMPLETED' },
      });
    }

    // If escalated, bump level
    if (decision === 'ESCALATED') {
      await (this.prisma as any).noShowAppeal.update({
        where: { id: appealId },
        data: { escalationLevel: { increment: 1 } },
      });
    }

    await this.createAuditLog(companyId, reviewerId, 'APPEAL_DECIDED', {
      appealId,
      tripId: appeal.tripId,
      decision,
      reason,
    });

    return appeal;
  }

  // ============================================================
  // 10. CONTROL ROOM QUEUE
  // ============================================================
  async getControlRoomQueue(companyId: string) {
    const arrivals = await (this.prisma as any).pickupArrivalEvent.findMany({
      where: { companyId },
      orderBy: { arrivedAt: 'desc' },
      take: 50,
      include: {
        trip: { select: { id: true, status: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
        passenger: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const queue = [];
    for (const arrival of arrivals) {
      if (!['ARRIVED', 'WAITING_FOR_PASSENGER', 'CONTACT_ATTEMPTS', 'NO_SHOW_ELIGIBLE'].includes(arrival.trip.status)) {
        continue;
      }

      const callAttempts = await (this.prisma as any).passengerContactAttempt.count({
        where: { tripId: arrival.tripId, passengerId: arrival.passengerId },
      });

      const supervisorRequest = await (this.prisma as any).supervisorCallRequest.findFirst({
        where: { tripId: arrival.tripId, passengerId: arrival.passengerId },
        orderBy: { requestedAt: 'desc' },
      });

      const elapsed = (Date.now() - arrival.arrivedAt.getTime()) / 60000;
      const policy = await this.getNoShowPolicy(companyId);
      const gracePeriod = policy?.gracePeriodMinutes || 10;
      const remainingGrace = Math.max(0, gracePeriod - elapsed);

      queue.push({
        tripId: arrival.tripId,
        passenger: arrival.passenger,
        driver: arrival.driver,
        vehicle: arrival.vehicle,
        arrivalTime: arrival.arrivedAt,
        gpsDistance: arrival.distanceFromPickupMeters,
        geofenceMatched: arrival.geofenceMatched,
        callAttempts,
        supervisorRequest: supervisorRequest ? { status: supervisorRequest.status } : null,
        remainingGraceMinutes: Math.round(remainingGrace),
        elapsedMinutes: Math.round(elapsed),
        status: arrival.trip.status,
      });
    }

    return queue;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private async getNoShowPolicy(companyId: string) {
    return this.prisma.noShowPolicyConfig.findFirst({ where: { companyId } });
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async createAuditLog(companyId: string, actorId: string, action: string, details: any) {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          companyId,
          userId: actorId,
          action,
          resourceType: 'NO_SHOW_WORKFLOW',
          resourceId: details.tripId || details.requestId || details.appealId || '',
          details: JSON.stringify(details),
          createdAt: new Date(),
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to create audit log: ${e.message}`);
    }
  }
}
