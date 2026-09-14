import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type CallCapability = 'NATIVE' | 'MASKED' | 'VOIP' | 'NONE';
export type CallOutcome = 'NO_ANSWER' | 'ANSWERED' | 'BUSY' | 'DECLINED' | 'INVALID_NUMBER' | 'CALL_FAILED' | 'PASSENGER_RESPONDED' | 'OTHER';

export interface CallInitiation {
  phoneNumber: string;
  telLink: string;
  capability: CallCapability;
  provider: string;
  tracked: boolean;
}

export interface CallRecord {
  id: string;
  companyId: string;
  tripId: string;
  passengerId: string;
  driverId: string;
  method: string;
  outcome: CallOutcome;
  durationSeconds: number | null;
  initiatedAt: Date;
  completedAt: Date | null;
  provider: string;
}

/**
 * CallingProvider abstraction.
 * Default implementation uses tel: deep links.
 * Future providers: Twilio, masked calling, enterprise telephony.
 * 
 * PRIVACY RULES:
 * - Do NOT record phone conversations
 * - Do NOT store call audio
 * - Do NOT silently monitor personal calls
 * - Only store operational metadata: attemptedAt, result, duration, participants
 */
@Injectable()
export class CallingProviderService {
  private readonly logger = new Logger(CallingProviderService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Initiate a call using the default (tel:) provider.
   * Returns a tel: deep link that the mobile OS handles.
   * Does NOT actually make the call — the OS phone app does.
   */
  async initiateCall(data: {
    companyId: string;
    driverId: string;
    passengerId: string;
    tripId: string;
    bookingId: string;
  }): Promise<CallInitiation> {
    // Get passenger phone number (minimize exposure)
    const passenger = await (this.prisma as any).user.findUnique({
      where: { id: data.passengerId },
      select: { mobile: true, firstName: true },
    });

    if (!passenger?.mobile) {
      return {
        phoneNumber: '',
        telLink: '',
        capability: 'NONE',
        provider: 'NATIVE',
        tracked: false,
      };
    }

    // Normalize phone number
    const normalized = this.normalizePhone(passenger.mobile);

    // Build tel: deep link
    const telLink = `tel:${normalized}`;

    this.logger.log(`Initiating call: driver=${data.driverId} -> passenger=${data.passengerId} via tel:`);

    return {
      phoneNumber: normalized,
      telLink,
      capability: 'NATIVE',
      provider: 'TEL_LINK',
      tracked: true,
    };
  }

  /**
   * Initiate supervisor call (same mechanism)
   */
  async initiateSupervisorCall(data: {
    companyId: string;
    supervisorId: string;
    passengerId: string;
    tripId: string;
  }): Promise<CallInitiation> {
    const passenger = await (this.prisma as any).user.findUnique({
      where: { id: data.passengerId },
      select: { mobile: true },
    });

    if (!passenger?.mobile) {
      return { phoneNumber: '', telLink: '', capability: 'NONE', provider: 'NATIVE', tracked: false };
    }

    const normalized = this.normalizePhone(passenger.mobile);
    return {
      phoneNumber: normalized,
      telLink: `tel:${normalized}`,
      capability: 'NATIVE',
      provider: 'TEL_LINK',
      tracked: true,
    };
  }

  /**
   * Get call capability for this company/installation.
   * Returns what calling methods are available.
   */
  async getCallCapability(companyId: string): Promise<{
    nativeCalling: boolean;
    maskedCalling: boolean;
    voipCalling: boolean;
    provider: string;
  }> {
    // Check if masked calling is configured
    const policy = await (this.prisma as any).transportPolicy.findFirst({
      where: { companyId },
    });

    return {
      nativeCalling: true,                           // Always available via tel:
      maskedCalling: false,                          // Not implemented yet — do not claim it exists
      voipCalling: false,                            // Not implemented yet
      provider: 'TEL_LINK',                          // Current provider
    };
  }

  /**
   * Record call outcome after the driver returns from the phone app.
   * The driver manually selects the outcome since we cannot detect
   * call results from a tel: deep link.
   */
  async recordCallOutcome(data: {
    companyId: string;
    tripId: string;
    bookingId: string;
    passengerId: string;
    driverId: string;
    outcome: CallOutcome;
    durationSeconds?: number;
    notes?: string;
    method?: string;
  }): Promise<CallRecord> {
    // Get next attempt number
    const attemptCount = await (this.prisma as any).passengerContactAttempt.count({
      where: {
        tripId: data.tripId,
        passengerId: data.passengerId,
        companyId: data.companyId,
      },
    });

    const record = await (this.prisma as any).passengerContactAttempt.create({
      data: {
        companyId: data.companyId,
        tripId: data.tripId,
        bookingId: data.bookingId,
        passengerId: data.passengerId,
        driverId: data.driverId,
        attemptNumber: attemptCount + 1,
        attemptedAt: new Date(),
        method: (data.method || 'PHONE_CALL') as any,
        result: data.outcome as any,
        durationSeconds: data.durationSeconds || null,
        notes: data.notes || null,
        createdAt: new Date(),
      },
    });

    return {
      id: (record as any).id,
      companyId: data.companyId,
      tripId: data.tripId,
      passengerId: data.passengerId,
      driverId: data.driverId,
      method: data.method || 'PHONE_CALL',
      outcome: data.outcome,
      durationSeconds: data.durationSeconds || null,
      initiatedAt: (record as any).attemptedAt,
      completedAt: new Date(),
      provider: 'TEL_LINK',
    };
  }

  // ============================================================
  // PHONE NUMBER NORMALIZATION
  // ============================================================
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Indian numbers
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned; // Add India country code
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      // Already has country code
    }

    return cleaned;
  }
}
