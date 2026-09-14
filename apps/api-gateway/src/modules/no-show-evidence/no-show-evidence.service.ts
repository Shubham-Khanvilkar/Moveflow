import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as crypto from 'crypto';

@Injectable()
export class NoShowEvidenceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // 1. POLICY CONFIGURATION
  // ============================================================

  async getNoShowPolicy(companyId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    let config = await this.prisma.noShowPolicyConfig.findFirst({ where: { companyId } });
    if (!config) {
      config = await this.prisma.noShowPolicyConfig.create({ data: { companyId } });
    }
    return config;
  }

  async updateNoShowPolicy(companyId: string, performedBy: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const existing = await this.prisma.noShowPolicyConfig.findFirst({ where: { companyId } });
    if (!existing) {
      return this.prisma.noShowPolicyConfig.create({ data: { companyId, ...data } });
    }

    const updated = await this.prisma.noShowPolicyConfig.update({ where: { id: existing.id }, data });

    await this.audit.log({
      companyId, userId: performedBy,
      action: 'NO_SHOW_POLICY_UPDATED', entity: 'NoShowPolicyConfig',
      entityId: existing.id, newValue: data,
    });

    return updated;
  }

  // ============================================================
  // 2. CALL ATTEMPT
  // ============================================================

  async createCallAttempt(companyId: string, driverUserId: string, tripId: string, passengerId: string, data: {
    method?: string;
    callResult?: string;
    notes?: string;
    deviceTimestamp?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const policy = await this.getNoShowPolicy(companyId);

    // Count existing attempts for this passenger on this trip
    const existingAttempts = await this.prisma.passengerContactAttempt.findMany({
      where: { companyId, tripId, passengerId },
      orderBy: { attemptNumber: 'desc' },
    });

    const attemptNumber = existingAttempts.length + 1;

    // Enforce maximum attempts
    if (attemptNumber > policy.requiredCallAttempts) {
      throw new BadRequestException(`Maximum call attempts (${policy.requiredCallAttempts}) already reached`);
    }

    // Validate interval: check last attempt has evidence and interval elapsed
    if (existingAttempts.length > 0) {
      const lastAttempt = existingAttempts[0];

      // Check evidence for previous attempt
      if (lastAttempt.evidenceRequired && lastAttempt.evidenceStatus !== 'UPLOADED') {
        throw new BadRequestException(`Call attempt #${lastAttempt.attemptNumber} requires screenshot evidence before proceeding`);
      }

      // Check interval
      if (lastAttempt.serverTimestamp) {
        const elapsed = Date.now() - lastAttempt.serverTimestamp.getTime();
        const requiredMs = policy.minimumMinutesBetweenCalls * 60 * 1000;
        if (elapsed < requiredMs) {
          const remaining = Math.ceil((requiredMs - elapsed) / 1000);
          throw new BadRequestException(`CALL_INTERVAL_NOT_REACHED: wait ${remaining}s more`);
        }
      }
    }

    const serverTimestamp = new Date();
    const nextAttemptAt = new Date(serverTimestamp.getTime() + policy.minimumMinutesBetweenCalls * 60 * 1000);

    const attempt = await this.prisma.passengerContactAttempt.create({
      data: {
        companyId, tripId, passengerId, driverId: driverUserId,
        attemptNumber,
        method: data.method || 'PHONE_CALL',
        callResult: data.callResult,
        notes: data.notes,
        serverTimestamp,
        deviceTimestamp: data.deviceTimestamp ? new Date(data.deviceTimestamp) : undefined,
        evidenceRequired: policy.callScreenshotRequired,
        evidenceStatus: policy.callScreenshotRequired ? 'REQUIRED' : 'NOT_REQUIRED',
        nextAttemptAvailableAt: attemptNumber < policy.requiredCallAttempts ? nextAttemptAt : null,
        status: 'PENDING',
      },
    });

    await this.audit.log({
      companyId, userId: driverUserId,
      action: 'CALL_ATTEMPT_STARTED', entity: 'PassengerContactAttempt',
      entityId: attempt.id,
      newValue: { attemptNumber, method: data.method, tripId, passengerId },
    });

    return attempt;
  }

  // ============================================================
  // 3. EVIDENCE UPLOAD
  // ============================================================

  async uploadEvidence(companyId: string, driverUserId: string, tripId: string, passengerId: string, attemptId: string, data: {
    fileBuffer?: Buffer;
    mimeType?: string;
    fileName?: string;
    fileSize?: number;
    idempotencyKey?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Verify attempt exists and belongs to this driver/trip
    const attempt = await this.prisma.passengerContactAttempt.findFirst({
      where: { id: attemptId, companyId, tripId, passengerId, driverId: driverUserId },
    });
    if (!attempt) throw new NotFoundException('Call attempt not found');

    // Check if evidence already uploaded (idempotency)
    if (attempt.evidenceStatus === 'UPLOADED' && attempt.evidenceDocumentId) {
      return { ...attempt, idempotent: true, message: 'Evidence already uploaded' };
    }

    // Validate mime type
    const policy = await this.getNoShowPolicy(companyId);
    const acceptedTypes = policy.acceptedMimeTypes.split(',');
    if (data.mimeType && !acceptedTypes.includes(data.mimeType)) {
      throw new BadRequestException(`Accepted types: ${acceptedTypes.join(', ')}`);
    }

    // Validate file size
    if (data.fileSize && data.fileSize > policy.maxScreenshotSizeMB * 1024 * 1024) {
      throw new BadRequestException(`Max file size: ${policy.maxScreenshotSizeMB}MB`);
    }

    // Generate SHA-256 hash
    const sha256 = data.fileBuffer
      ? crypto.createHash('sha256').update(data.fileBuffer).digest('hex')
      : `hash-${Date.now()}`;

    // Create evidence record
    const evidence = await this.prisma.noShowEvidence.create({
      data: {
        companyId, tripId, passengerId, driverId: driverUserId,
        contactAttemptId: attemptId,
        evidenceType: 'CALL_LOG_SCREENSHOT',
        sha256,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        storageKey: `evidence/${companyId}/${tripId}/${attemptId}/${Date.now()}`,
        visibility: 'RESTRICTED',
      },
    });

    // Update attempt evidence status
    await this.prisma.passengerContactAttempt.update({
      where: { id: attemptId },
      data: {
        evidenceStatus: 'UPLOADED',
        evidenceDocumentId: evidence.id,
        evidenceUploadedAt: new Date(),
        evidenceHash: sha256,
        status: 'EVIDENCE_UPLOADED',
      },
    });

    await this.audit.log({
      companyId, userId: driverUserId,
      action: 'CALL_LOG_SCREENSHOT_UPLOADED', entity: 'NoShowEvidence',
      entityId: evidence.id,
      newValue: { attemptNumber: attempt.attemptNumber, sha256: sha256.substring(0, 16) + '...' },
    });

    return { evidence, attempt: { id: attemptId, evidenceStatus: 'UPLOADED' } };
  }

  // ============================================================
  // 4. GET CONTACT ATTEMPTS
  // ============================================================

  async getContactAttempts(companyId: string, tripId: string, passengerId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const attempts = await this.prisma.passengerContactAttempt.findMany({
      where: { companyId, tripId, passengerId },
      orderBy: { attemptNumber: 'asc' },
    });

    const policy = await this.getNoShowPolicy(companyId);

    return {
      tripId,
      passengerId,
      policy: {
        requiredCalls: policy.requiredCallAttempts,
        minInterval: policy.minimumMinutesBetweenCalls,
        gracePeriod: policy.gracePeriodMinutes,
        screenshotRequired: policy.callScreenshotRequired,
      },
      attempts,
      evidenceComplete: attempts.filter(a => a.evidenceStatus === 'UPLOADED').length,
      evidenceRequired: attempts.filter(a => a.evidenceRequired).length,
    };
  }

  // ============================================================
  // 5. NO-SHOW VALIDATION
  // ============================================================

  async validateNoShow(companyId: string, tripId: string, passengerId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const policy = await this.getNoShowPolicy(companyId);
    const attempts = await this.prisma.passengerContactAttempt.findMany({
      where: { companyId, tripId, passengerId },
      orderBy: { attemptNumber: 'asc' },
    });

    const checks: { name: string; passed: boolean; reason?: string }[] = [];

    // Check 1: Required call count
    const completedCalls = attempts.filter(a => a.callResult || a.callEndedAt);
    checks.push({
      name: 'CALL_ATTEMPT_COUNT',
      passed: completedCalls.length >= policy.requiredCallAttempts,
      reason: completedCalls.length < policy.requiredCallAttempts
        ? `${completedCalls.length}/${policy.requiredCallAttempts} calls completed`
        : undefined,
    });

    // Check 2: Call intervals
    let intervalsValid = true;
    for (let i = 1; i < attempts.length; i++) {
      const prev = attempts[i - 1];
      const curr = attempts[i];
      if (prev.serverTimestamp && curr.serverTimestamp) {
        const diff = curr.serverTimestamp.getTime() - prev.serverTimestamp.getTime();
        const required = policy.minimumMinutesBetweenCalls * 60 * 1000;
        if (diff < required) {
          intervalsValid = false;
          break;
        }
      }
    }
    checks.push({
      name: 'CALL_INTERVAL_VALIDATED',
      passed: intervalsValid,
      reason: !intervalsValid ? 'One or more call intervals below minimum' : undefined,
    });

    // Check 3: Evidence for every required call
    const requiredAttempts = attempts.filter(a => a.evidenceRequired);
    const evidenceUploaded = requiredAttempts.filter(a => a.evidenceStatus === 'UPLOADED');
    const evidenceRejected = requiredAttempts.filter(a => a.evidenceStatus === 'REJECTED');
    const evidenceMissing = requiredAttempts.filter(a => a.evidenceStatus === 'REQUIRED');

    checks.push({
      name: 'CALL_LOG_EVIDENCE_COMPLETE',
      passed: evidenceUploaded.length === requiredAttempts.length && evidenceRejected.length === 0,
      reason: evidenceMissing.length > 0
        ? `MISSING_CALL_LOG_EVIDENCE: ${evidenceMissing.length} attempts without screenshots`
        : evidenceRejected.length > 0
        ? `${evidenceRejected.length} evidence items rejected`
        : undefined,
    });

    // Check 4: Grace period (check against trip scheduled arrival time)
    let gracePeriodPassed = true;
    if (this.prisma.isConnected()) {
      const trip = await (this.prisma as any).trip.findUnique({ where: { id: tripId } });
      if (trip && trip.scheduledArrival) {
        const now = new Date();
        const arrivalTime = new Date(trip.scheduledArrival);
        const graceMs = (policy.gracePeriodMinutes || 10) * 60 * 1000;
        gracePeriodPassed = (now.getTime() - arrivalTime.getTime()) >= graceMs;
      }
    }
    checks.push({
      name: 'GRACE_PERIOD_SATISFIED',
      passed: gracePeriodPassed,
      reason: gracePeriodPassed ? undefined : `Grace period of ${policy.gracePeriodMinutes || 10} minutes not yet elapsed`,
    });

    // Check 5: GPS/Geofence (check if driver was at pickup location)
    let driverArrivalVerified = true;
    if (this.prisma.isConnected()) {
      const trip = await (this.prisma as any).trip.findUnique({
        where: { id: tripId },
        include: { route: true },
      });
      if (trip?.route?.pickupLat && trip?.route?.pickupLng) {
        // Check if there are any geofence events near the pickup location
        const geofenceEvents = await (this.prisma as any).gpsEvent.findMany({
          where: {
            tripId,
            eventType: 'GEOFENCE_ENTRY',
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });
        driverArrivalVerified = geofenceEvents.length > 0;
      }
    }
    checks.push({
      name: 'DRIVER_ARRIVAL_VERIFIED',
      passed: driverArrivalVerified,
      reason: driverArrivalVerified ? undefined : 'No GPS confirmation of driver arrival at pickup',
    });

    // Overall result
    const allPassed = checks.every(c => c.passed);
    const blockedReasons = checks.filter(c => !c.passed).map(c => c.reason).filter(Boolean);

    return {
      eligible: allPassed,
      status: allPassed ? 'NO_SHOW_ELIGIBLE' : 'NO_SHOW_BLOCKED',
      reasons: blockedReasons,
      checks,
      policy: {
        requiredCalls: policy.requiredCallAttempts,
        minInterval: policy.minimumMinutesBetweenCalls,
        gracePeriod: policy.gracePeriodMinutes,
      },
    };
  }

  // ============================================================
  // 6. FINALIZE NO-SHOW
  // ============================================================

  async finalizeNoShow(companyId: string, performedBy: string, tripId: string, passengerId: string, data?: {
    confirmedBy?: string;
    confirmationMethod?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Run validation first
    const validation = await this.validateNoShow(companyId, tripId, passengerId);
    if (!validation.eligible) {
      throw new BadRequestException(`NO_SHOW_BLOCKED: ${validation.reasons.join('; ')}`);
    }

    // Update passenger boarding status to NO_SHOW
    const boarding = await this.prisma.passengerBoarding.findFirst({
      where: { tripId, userId: passengerId },
    });

    if (boarding) {
      await this.prisma.passengerBoarding.update({
        where: { id: boarding.id },
        data: { status: 'NO_SHOW' },
      });
    }

    // Create audit trail
    const attempts = await this.prisma.passengerContactAttempt.findMany({
      where: { companyId, tripId, passengerId },
      orderBy: { attemptNumber: 'asc' },
    });

    const evidenceIds = attempts
      .filter(a => a.evidenceDocumentId)
      .map(a => a.evidenceDocumentId);

    await this.audit.log({
      companyId, userId: performedBy,
      action: 'NO_SHOW_FINALIZED', entity: 'PassengerBoarding',
      entityId: boarding?.id || tripId,
      newValue: {
        tripId, passengerId,
        callAttempts: attempts.length,
        evidenceCount: evidenceIds.length,
        confirmationMethod: data?.confirmationMethod || 'AUTOMATIC',
      },
    });

    return {
      finalized: true,
      tripId,
      passengerId,
      callAttempts: attempts.length,
      evidenceCount: evidenceIds.length,
      timeline: attempts.map(a => ({
        attempt: a.attemptNumber,
        method: a.method,
        time: a.serverTimestamp,
        result: a.callResult,
        evidence: a.evidenceStatus,
        evidenceHash: a.evidenceHash?.substring(0, 16) + '...',
      })),
      confirmedBy: data?.confirmedBy || performedBy,
      confirmationMethod: data?.confirmationMethod || 'AUTOMATIC',
    };
  }

  // ============================================================
  // 7. GET NO-SHOW EVIDENCE
  // ============================================================

  async getNoShowEvidence(companyId: string, tripId: string, passengerId: string, requesterRole: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    // Privacy: restrict evidence access
    const restrictedRoles = ['COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'CONTROL_ROOM_USER', 'NAVIRA_PLATFORM_ADMINISTRATOR'];
    if (!restrictedRoles.includes(requesterRole)) {
      return { message: 'Call evidence uploaded', restricted: true };
    }

    const evidence = await this.prisma.noShowEvidence.findMany({
      where: { companyId, tripId, passengerId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        evidenceType: true,
        sha256: true,
        mimeType: true,
        fileSize: true,
        uploadedAt: true,
        visibility: true,
        createdAt: true,
      },
    });

    const attempts = await this.prisma.passengerContactAttempt.findMany({
      where: { companyId, tripId, passengerId },
      orderBy: { attemptNumber: 'asc' },
      select: {
        attemptNumber: true,
        method: true,
        callResult: true,
        serverTimestamp: true,
        callStartedAt: true,
        callEndedAt: true,
        callDurationSec: true,
        evidenceStatus: true,
        evidenceHash: true,
      },
    });

    return {
      tripId,
      passengerId,
      evidence,
      attempts,
      totalEvidence: evidence.length,
    };
  }
}
