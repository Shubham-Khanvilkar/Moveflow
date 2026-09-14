import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class EnterpriseOpsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ============================================================
  // 1. DRIVER COMPLIANCE AUTO-BLOCKING
  // ============================================================

  async checkDriverCompliance(companyId: string, driverUserId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 86400000);
    const thirtyDays = new Date(now.getTime() + 30 * 86400000);

    // Get or create compliance status
    let compliance = await this.prisma.driverComplianceStatus.findFirst({
      where: { companyId, driverId: driverUserId },
    });
    if (!compliance) {
      compliance = await this.prisma.driverComplianceStatus.create({
        data: { companyId, driverId: driverUserId },
      });
    }

    // Check document expiries
    const warnings: string[] = [];
    const blocks: string[] = [];

    if (compliance.licenseExpiryDate) {
      if (compliance.licenseExpiryDate < now) { blocks.push('License expired'); }
      else if (compliance.licenseExpiryDate < thirtyDays) { warnings.push(`License expires in ${Math.ceil((compliance.licenseExpiryDate.getTime() - now.getTime()) / 86400000)} days`); }
    }
    if (compliance.pucExpiryDate) {
      if (compliance.pucExpiryDate < now) { blocks.push('PUC expired'); }
      else if (compliance.pucExpiryDate < sevenDays) { warnings.push(`PUC expires in ${Math.ceil((compliance.pucExpiryDate.getTime() - now.getTime()) / 86400000)} days`); }
    }
    if (compliance.insuranceExpiryDate) {
      if (compliance.insuranceExpiryDate < now) { blocks.push('Insurance expired'); }
    }
    if (compliance.permitExpiryDate) {
      if (compliance.permitExpiryDate < now) { blocks.push('Permit expired'); }
    }
    if (compliance.fitnessExpiryDate) {
      if (compliance.fitnessExpiryDate < now) { blocks.push('Fitness certificate expired'); }
    }

    // Check working hours
    if (compliance.drivingHoursToday >= compliance.maxDrivingHours) {
      blocks.push(`Max driving hours reached (${compliance.maxDrivingHours}h)`);
    }
    if (compliance.continuousDriving >= 4) {
      blocks.push(`Continuous driving exceeds 4 hours - break required`);
    }

    const isBlocked = blocks.length > 0 && !compliance.adminOverride;
    const isOverridden = compliance.adminOverride && compliance.overrideExpiry && compliance.overrideExpiry > now;

    return {
      driverId: driverUserId,
      isBlocked: isBlocked && !isOverridden,
      blockReason: isBlocked && !isOverridden ? blocks.join('; ') : null,
      warnings,
      blocks,
      documents: {
        license: { valid: compliance.licenseValid, expiry: compliance.licenseExpiryDate },
        puc: { valid: compliance.pucValid, expiry: compliance.pucExpiryDate },
        insurance: { valid: compliance.insuranceValid, expiry: compliance.insuranceExpiryDate },
        permit: { valid: compliance.permitValid, expiry: compliance.permitExpiryDate },
        fitness: { valid: compliance.fitnessValid, expiry: compliance.fitnessExpiryDate },
      },
      workingHours: {
        today: compliance.drivingHoursToday,
        max: compliance.maxDrivingHours,
        continuous: compliance.continuousDriving,
        breakRequired: compliance.breakRequired,
      },
      override: compliance.adminOverride ? {
        reason: compliance.overrideReason,
        approvedBy: compliance.overrideApprovedBy,
        expiresAt: compliance.overrideExpiry,
        active: isOverridden,
      } : null,
      canDispatch: !isBlocked || isOverridden,
    };
  }

  async adminOverrideCompliance(companyId: string, performedBy: string, driverUserId: string, data: {
    reason: string;
    expiryHours: number;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const expiry = new Date(Date.now() + data.expiryHours * 3600000);
    const updated = await this.prisma.driverComplianceStatus.upsert({
      where: { companyId_driverId: { companyId, driverId: driverUserId } },
      update: {
        adminOverride: true,
        overrideReason: data.reason,
        overrideApprovedBy: performedBy,
        overrideExpiry: expiry,
      },
      create: {
        companyId, driverId: driverUserId,
        adminOverride: true,
        overrideReason: data.reason,
        overrideApprovedBy: performedBy,
        overrideExpiry: expiry,
      },
    });

    await this.audit.log({
      companyId, userId: performedBy,
      action: 'COMPLIANCE_OVERRIDE', entity: 'DriverComplianceStatus',
      entityId: driverUserId, newValue: { reason: data.reason, expiry: expiry.toISOString() },
    });

    return { driverId: driverUserId, override: true, expiresAt: expiry };
  }

  async updateComplianceStatus(companyId: string, driverUserId: string, data: Record<string, any>) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const updated = await this.prisma.driverComplianceStatus.upsert({
      where: { companyId_driverId: { companyId, driverId: driverUserId } },
      update: data,
      create: { companyId, driverId: driverUserId, ...data },
    });

    // Auto-block check
    const check = await this.checkDriverCompliance(companyId, driverUserId);
    if (check.isBlocked) {
      await this.prisma.driverComplianceStatus.update({
        where: { id: updated.id },
        data: { isBlocked: true, blockReason: check.blockReason },
      });
    }

    return updated;
  }

  // ============================================================
  // 2. VEHICLE OCCUPANCY VERIFICATION
  // ============================================================

  async createBoardingVerification(companyId: string, tripId: string, vehicleId: string, driverId: string, method: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const verification = await this.prisma.boardingVerification.create({
      data: {
        companyId, tripId, vehicleId, driverId,
        method: method || 'MANUAL',
        expectedCount: 0,
        status: 'PENDING',
      },
    });

    return verification;
  }

  async generateOTP(companyId: string, verificationId: string) {
    if (!this.prisma.isConnected()) {
      return { otpCode: '123456', expiry: new Date(Date.now() + 10 * 60000) };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000);

    await this.prisma.boardingVerification.update({
      where: { id: verificationId },
      data: { otpCode: otp, otpExpiry: expiry, status: 'IN_PROGRESS' },
    });

    return { otpCode: otp, expiry };
  }

  async verifyOTP(companyId: string, verificationId: string, code: string) {
    if (!this.prisma.isConnected()) {
      return { verified: true };
    }

    const verification = await this.prisma.boardingVerification.findFirst({
      where: { id: verificationId, companyId },
    });
    if (!verification) throw new Error('Verification not found');
    if (!verification.otpCode) throw new Error('No OTP generated');
    if (verification.otpExpiry && verification.otpExpiry < new Date()) throw new Error('OTP expired');

    const verified = verification.otpCode === code;

    if (verified) {
      await this.prisma.boardingVerification.update({
        where: { id: verificationId },
        data: { otpVerified: true, verifiedCount: { increment: 1 }, boardedCount: { increment: 1 } },
      });
    }

    return { verified };
  }

  async boardPassenger(companyId: string, verificationId: string, userId: string, data: { seatNumber?: number; luggageCount?: number; accessibilityNeed?: boolean }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    // Check capacity
    const verification = await this.prisma.boardingVerification.findFirst({
      where: { id: verificationId, companyId },
    });
    if (!verification) throw new Error('Verification not found');

    const existingBoarding = await this.prisma.passengerBoarding.findFirst({
      where: { tripId: verification.tripId, userId },
    });

    let boarding;
    if (existingBoarding) {
      boarding = await this.prisma.passengerBoarding.update({
        where: { id: existingBoarding.id },
        data: {
          status: 'BOARDED', driverConfirmed: true,
          boardTime: new Date(), seatNumber: data.seatNumber,
          luggageCount: data.luggageCount || 0, accessibilityNeed: data.accessibilityNeed || false,
        },
      });
    } else {
      boarding = await this.prisma.passengerBoarding.create({
        data: {
          companyId, tripId: verification.tripId, verificationId, userId,
          status: 'BOARDED', driverConfirmed: true, boardTime: new Date(),
          seatNumber: data.seatNumber, luggageCount: data.luggageCount || 0,
          accessibilityNeed: data.accessibilityNeed || false,
        },
      });
    }

    // Update verification count
    await this.prisma.boardingVerification.update({
      where: { id: verificationId },
      data: { boardedCount: { increment: 1 }, verifiedCount: { increment: 1 } },
    });

    return boarding;
  }

  async markNoShow(companyId: string, verificationId: string, userId: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const bv = await this.prisma.boardingVerification.findFirst({ where: { id: verificationId } });
    const tripId = bv?.tripId || '';
    const existingBoarding = await this.prisma.passengerBoarding.findFirst({ where: { tripId, userId } });
    let boarding;
    if (existingBoarding) {
      boarding = await this.prisma.passengerBoarding.update({ where: { id: existingBoarding.id }, data: { status: 'NO_SHOW' } });
    } else {
      boarding = await this.prisma.passengerBoarding.create({ data: { companyId, tripId, verificationId, userId, status: 'NO_SHOW' } });
    }

    await this.prisma.boardingVerification.update({
      where: { id: verificationId },
      data: { noShowCount: { increment: 1 } },
    });

    return boarding;
  }

  async completeBoarding(companyId: string, verificationId: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const verification = await this.prisma.boardingVerification.findFirst({
      where: { id: verificationId, companyId },
    });
    if (!verification) throw new Error('Verification not found');

    const hasDiscrepancy = verification.boardedCount !== verification.expectedCount;

    const updated = await this.prisma.boardingVerification.update({
      where: { id: verificationId },
      data: {
        status: hasDiscrepancy ? 'DISCREPANCY' : 'COMPLETED',
        discrepancyNote: hasDiscrepancy ? `Expected ${verification.expectedCount}, boarded ${verification.boardedCount}` : null,
      },
    });

    return { ...updated, discrepancy: hasDiscrepancy };
  }

  // ============================================================
  // 3. TRIP CHANGE ENGINE
  // ============================================================

  async requestTripChange(companyId: string, requestedBy: string, requestedByRole: string, data: {
    tripId: string;
    changeType: string;
    oldValue: any;
    newValue: any;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    // Auto-approve certain changes (employee pickup change within policy)
    const autoApproveTypes = ['PICKUP_CHANGE', 'DROP_CHANGE', 'TIME_CHANGE'];
    const isAutoApprove = autoApproveTypes.includes(data.changeType) && requestedByRole === 'EMPLOYEE';

    const changeRequest = await this.prisma.tripChangeRequest.create({
      data: {
        companyId, tripId: data.tripId,
        changeType: data.changeType,
        requestedBy, requestedByRole,
        oldValue: data.oldValue, newValue: data.newValue,
        status: isAutoApprove ? 'AUTO_APPROVED' : 'PENDING',
        routeRecalculated: isAutoApprove,
        costRecalculated: isAutoApprove,
      },
    });

    // Audit
    await this.audit.log({
      companyId, userId: requestedBy,
      action: `TRIP_CHANGE_${data.changeType}`, entity: 'TripChangeRequest',
      entityId: changeRequest.id,
      oldValue: data.oldValue, newValue: data.newValue,
    });

    return changeRequest;
  }

  async approveTripChange(companyId: string, approverId: string, changeId: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const updated = await this.prisma.tripChangeRequest.update({
      where: { id: changeId },
      data: { status: 'APPROVED', approvedBy: approverId, routeRecalculated: true, costRecalculated: true },
    });

    await this.audit.log({
      companyId, userId: approverId,
      action: 'TRIP_CHANGE_APPROVED', entity: 'TripChangeRequest', entityId: changeId,
    });

    return updated;
  }

  async rejectTripChange(companyId: string, approverId: string, changeId: string, reason: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const updated = await this.prisma.tripChangeRequest.update({
      where: { id: changeId },
      data: { status: 'REJECTED', approvedBy: approverId, rejectionReason: reason },
    });

    return updated;
  }

  // ============================================================
  // 4. AUTOMATIC RE-DISPATCH
  // ============================================================

  async triggerRedispatch(companyId: string, tripId: string, originalDriverId: string, triggerType: string, originalVehicleId?: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const trigger = await this.prisma.redispatchTrigger.create({
      data: {
        companyId, tripId, originalDriverId, originalVehicleId,
        triggerType,
        status: 'TRIGGERED',
      },
    });

    // Auto-search for replacement
    const searchResult = await this.autoSearchReplacement(companyId, tripId);

    if (searchResult.found) {
      await this.prisma.redispatchTrigger.update({
        where: { id: trigger.id },
        data: {
          status: 'FOUND',
          replacementDriverId: searchResult.driverId,
          replacementVehicleId: searchResult.vehicleId,
          replacementETA: searchResult.eta,
        },
      });
    }

    await this.audit.log({
      companyId, userId: 'SYSTEM',
      action: 'REDISPATCH_TRIGGERED', entity: 'RedispatchTrigger',
      entityId: trigger.id, newValue: { triggerType, tripId },
    });

    return { ...trigger, searchResult };
  }

  async autoSearchReplacement(companyId: string, tripId: string) {
    if (!this.prisma.isConnected()) {
      return { found: false, reason: 'Database not connected' };
    }

    // Get the trip to find required vehicle type and route
    const trip = await (this.prisma as any).trip.findUnique({
      where: { id: tripId },
      include: { route: true },
    });

    if (!trip) {
      return { found: false, reason: 'Trip not found' };
    }

    // Find nearest available driver with matching vehicle
    const availableDrivers = await (this.prisma as any).driver.findMany({
      where: {
        companyId,
        availabilityStatus: 'AVAILABLE',
        status: 'ACTIVE',
        complianceStatus: 'COMPLIANT',
      },
      include: { vehicle: true },
      take: 10,
    });

    if (availableDrivers.length === 0) {
      return { found: false, reason: 'No available drivers' };
    }

    // Pick the first available driver (in production, would calculate nearest by GPS)
    const driver = availableDrivers[0];
    const distance = trip.route
      ? this.calculateDistance(
          trip.route.pickupLat || 0, trip.route.pickupLng || 0,
          driver.currentLat || 0, driver.currentLng || 0,
        )
      : 5.0;

    return {
      found: true,
      driverId: driver.id,
      vehicleId: driver.vehicleId || null,
      eta: Math.round(distance * 3), // rough ETA: 3 min per km
      distance: Math.round(distance * 10) / 10,
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ============================================================
  // 5. COMMUNICATION GATEWAY
  // ============================================================

  async sendCommunication(companyId: string, data: {
    channel: string;
    recipientId?: string;
    recipientPhone?: string;
    recipientEmail?: string;
    messageType: string;
    content: string;
    tripId?: string;
    vehicleId?: string;
    driverId?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const log = await this.prisma.communicationLog.create({
      data: {
        companyId,
        channel: data.channel,
        recipientId: data.recipientId,
        recipientPhone: data.recipientPhone,
        recipientEmail: data.recipientEmail,
        messageType: data.messageType,
        content: data.content,
        tripId: data.tripId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        status: 'SENT',
        externalId: `${data.channel}-${Date.now()}`,
      },
    });

    return log;
  }

  async getCommunicationLogs(companyId: string, params: { channel?: string; messageType?: string; limit?: number }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const where: any = { companyId };
    if (params.channel) where.channel = params.channel;
    if (params.messageType) where.messageType = params.messageType;

    return this.prisma.communicationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });
  }

  // ============================================================
  // 6. EMERGENCY OPERATIONS
  // ============================================================

  async broadcastEmergency(companyId: string, issuedBy: string, data: {
    title: string;
    message: string;
    severity?: string;
    scope: string;
    zoneName?: string;
    targetDriverIds?: string[];
    targetVehicleIds?: string[];
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const broadcast = await this.prisma.emergencyBroadcast.create({
      data: {
        companyId,
        title: data.title,
        message: data.message,
        severity: data.severity || 'HIGH',
        scope: data.scope,
        zoneName: data.zoneName,
        targetDriverIds: data.targetDriverIds ? JSON.stringify(data.targetDriverIds) : undefined,
        targetVehicleIds: data.targetVehicleIds ? JSON.stringify(data.targetVehicleIds) : undefined,
        status: 'ACTIVE',
        issuedBy,
      },
    });

    await this.audit.log({
      companyId, userId: issuedBy,
      action: 'EMERGENCY_BROADCAST', entity: 'EmergencyBroadcast',
      entityId: broadcast.id, newValue: { title: data.title, severity: data.severity, scope: data.scope },
    });

    return broadcast;
  }

  async massCancel(companyId: string, issuedBy: string, data: {
    reason: string;
    description?: string;
    scope: string;
    zoneName?: string;
    effectiveFrom: string;
    effectiveTo?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const cancellation = await this.prisma.massCancellation.create({
      data: {
        companyId,
        reason: data.reason,
        description: data.description,
        scope: data.scope,
        zoneName: data.zoneName,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
        status: 'ACTIVE',
        issuedBy,
      },
    });

    await this.audit.log({
      companyId, userId: issuedBy,
      action: 'MASS_CANCELLATION', entity: 'MassCancellation',
      entityId: cancellation.id, newValue: { reason: data.reason, scope: data.scope },
    });

    return cancellation;
  }

  // ============================================================
  // 7. DRIVER WORKING HOURS
  // ============================================================

  async getDriverWorkLog(companyId: string, driverUserId: string, date?: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const shiftDate = date ? new Date(date) : new Date();
    shiftDate.setHours(0, 0, 0, 0);

    let log = await this.prisma.driverWorkLog.findFirst({
      where: { companyId, driverId: driverUserId, shiftDate },
    });

    if (!log) {
      log = await this.prisma.driverWorkLog.create({
        data: { companyId, driverId: driverUserId, shiftDate },
      });
    }

    return log;
  }

  async startBreak(companyId: string, driverUserId: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const log = await this.getDriverWorkLog(companyId, driverUserId);
    await this.prisma.driverWorkLog.update({
      where: { id: log.id },
      data: { lastBreakStart: new Date(), breakCount: { increment: 1 } },
    });

    return { breakStarted: true, breakCount: log.breakCount + 1 };
  }

  async endBreak(companyId: string, driverUserId: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const log = await this.getDriverWorkLog(companyId, driverUserId);
    if ((log as any).lastBreakStart) {
      const duration = Math.round((Date.now() - (log as any).lastBreakStart.getTime()) / 60000);
      await this.prisma.driverWorkLog.update({
        where: { id: log.id },
        data: {
          lastBreakEnd: new Date(),
          totalBreakMinutes: { increment: duration },
        },
      });
      return { breakEnded: true, breakDuration: duration };
    }

    return { breakEnded: true, breakDuration: 0 };
  }

  // ============================================================
  // 8. FUEL & ODOMETER
  // ============================================================

  async logFuelEntry(companyId: string, driverUserId: string, data: {
    vehicleId: string;
    fuelType: string;
    liters: number;
    costPerLiter: number;
    odometerKm: number;
    stationName?: string;
    socBefore?: number;
    socAfter?: number;
    chargingDuration?: number;
    chargingStation?: string;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const totalCost = data.liters * data.costPerLiter;

    const entry = await this.prisma.fuelEntry.create({
      data: {
        companyId, vehicleId: data.vehicleId, driverId: driverUserId,
        fuelType: data.fuelType, liters: data.liters,
        costPerLiter: data.costPerLiter, totalCost,
        odometerKm: data.odometerKm, stationName: data.stationName,
        socBefore: data.socBefore, socAfter: data.socAfter,
        chargingDuration: data.chargingDuration, chargingStation: data.chargingStation,
      },
    });

    return entry;
  }

  async logOdometerReading(companyId: string, driverUserId: string, data: {
    vehicleId: string;
    startKm: number;
    endKm: number;
    tripId?: string;
    vendorReportedKm?: number;
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const calculatedKm = data.endKm - data.startKm;
    const discrepancyKm = data.vendorReportedKm ? Math.abs(data.vendorReportedKm - calculatedKm) : null;

    return this.prisma.odometerReading.create({
      data: {
        companyId, vehicleId: data.vehicleId, driverId: driverUserId,
        startKm: data.startKm, endKm: data.endKm, calculatedKm,
        vendorReportedKm: data.vendorReportedKm, discrepancyKm,
        tripId: data.tripId, tripDate: new Date(),
      },
    });
  }

  // ============================================================
  // 9. TRIP EXPENSES
  // ============================================================

  async submitTripExpense(companyId: string, driverUserId: string, tripId: string, data: {
    tollAmount?: number;
    parkingAmount?: number;
    waitingAmount?: number;
    permitAmount?: number;
    extraKmAmount?: number;
    otherAmount?: number;
    otherDescription?: string;
    receiptUrls?: string[];
  }) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    const totalExpenses = (data.tollAmount || 0) + (data.parkingAmount || 0) + (data.waitingAmount || 0) + (data.permitAmount || 0) + (data.extraKmAmount || 0) + (data.otherAmount || 0);

    return this.prisma.tripExpense.create({
      data: {
        companyId, tripId, driverId: driverUserId,
        tollAmount: data.tollAmount || 0, parkingAmount: data.parkingAmount || 0,
        waitingAmount: data.waitingAmount || 0, permitAmount: data.permitAmount || 0,
        extraKmAmount: data.extraKmAmount || 0,
        otherAmount: data.otherAmount || 0, otherDescription: data.otherDescription,
        totalExpenses, receiptUrls: data.receiptUrls, status: 'SUBMITTED',
      },
    });
  }

  async verifyTripExpense(companyId: string, verifierId: string, expenseId: string, approved: boolean, notes?: string) {
    if (!this.prisma.isConnected()) {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return this.prisma.tripExpense.update({
      where: { id: expenseId },
      data: { status: approved ? 'VERIFIED' : 'REJECTED', verifiedBy: verifierId, verifiedAt: new Date() },
    });
  }
}
