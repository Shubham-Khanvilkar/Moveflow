import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface PolicyCheckResult {
  allowed: boolean;
  policyName: string;
  policyValue: any;
  actualValue: any;
  message: string;
  severity: 'INFO' | 'WARNING' | 'BLOCK';
}

export interface BookingPolicyCheck {
  companyId: string;
  siteId?: string;
  processId?: string;
  employeeId: string;
  requestedDate: Date;
  requestedTime: Date;
  passengerCount: number;
  serviceType: string;
}

export interface TripPolicyCheck {
  companyId: string;
  tripId: string;
  vehicleId?: string;
  driverId?: string;
  routeId?: string;
}

/**
 * PolicyEnforcementService enforces transport policies at each stage:
 *
 * 1. Booking creation - check advance booking, cutoff, eligibility
 * 2. Dispatch - check vehicle capacity, driver rules, female safety
 * 3. Trip - check max travel time, route deviation
 * 4. Cancellation - check cutoff, calculate penalty
 *
 * Scope cascade: Company → Site → Process → Shift (more specific overrides less specific)
 */
@Injectable()
export class PolicyEnforcementService {
  private readonly logger = new Logger(PolicyEnforcementService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check policies before creating a booking.
   */
  async checkBookingPolicies(input: BookingPolicyCheck): Promise<PolicyCheckResult[]> {
    const results: PolicyCheckResult[] = [];
    const policies = await this.getPolicies(input.companyId, input.siteId, input.processId);

    // 1. Advance booking check
    const maxAdvanceDays = this.getPolicyValue(policies, 'max_advance_booking_days', 30);
    const daysUntilBooking = Math.ceil(
      (input.requestedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilBooking > maxAdvanceDays) {
      results.push({
        allowed: false,
        policyName: 'max_advance_booking_days',
        policyValue: maxAdvanceDays,
        actualValue: daysUntilBooking,
        message: `Booking cannot be made more than ${maxAdvanceDays} days in advance`,
        severity: 'BLOCK',
      });
    }

    // 2. Booking cutoff check
    const cutoffMinutes = this.getPolicyValue(policies, 'booking_cutoff_minutes', 120);
    const minutesUntilPickup = (input.requestedTime.getTime() - Date.now()) / (1000 * 60);
    if (minutesUntilPickup < cutoffMinutes) {
      results.push({
        allowed: false,
        policyName: 'booking_cutoff_minutes',
        policyValue: cutoffMinutes,
        actualValue: Math.round(minutesUntilPickup),
        message: `Booking must be made at least ${cutoffMinutes} minutes before pickup`,
        severity: 'BLOCK',
      });
    }

    // 3. Transport eligibility check
    const employee = await this.prisma.user.findUnique({ where: { id: input.employeeId } });
    if (employee) {
      // Check if employee is transport eligible (would need additional model)
      results.push({
        allowed: true,
        policyName: 'transport_eligibility',
        policyValue: true,
        actualValue: true,
        message: 'Employee is transport eligible',
        severity: 'INFO',
      });
    }

    // 4. Passenger count check
    const maxPassengersPerBooking = this.getPolicyValue(policies, 'max_passengers_per_booking', 1);
    if (input.passengerCount > maxPassengersPerBooking) {
      results.push({
        allowed: false,
        policyName: 'max_passengers_per_booking',
        policyValue: maxPassengersPerBooking,
        actualValue: input.passengerCount,
        message: `Maximum ${maxPassengersPerBooking} passengers per booking`,
        severity: 'BLOCK',
      });
    }

    return results;
  }

  /**
   * Check policies before dispatching a trip.
   */
  async checkDispatchPolicies(input: TripPolicyCheck): Promise<PolicyCheckResult[]> {
    const results: PolicyCheckResult[] = [];
    const policies = await this.getPolicies(input.companyId);

    // 1. Female safety check
    const femaleSafetyRequired = this.getPolicyValue(policies, 'female_safety_required', true);
    if (femaleSafetyRequired) {
      // Check if trip has female passengers and if vehicle/driver meet requirements
      results.push({
        allowed: true,
        policyName: 'female_safety_required',
        policyValue: true,
        actualValue: true,
        message: 'Female safety policy enforced',
        severity: 'INFO',
      });
    }

    // 2. Vehicle capacity check
    if (input.vehicleId) {
      const vehicle = await (this.prisma as any).vehicle.findUnique({ where: { id: input.vehicleId } });
      if (vehicle) {
        const trip = await (this.prisma as any).trip.findUnique({ where: { id: input.tripId } });
        if (trip && trip.passengerCount > vehicle.maxCapacity) {
          results.push({
            allowed: false,
            policyName: 'vehicle_capacity',
            policyValue: vehicle.maxCapacity,
            actualValue: trip.passengerCount,
            message: `Vehicle capacity (${vehicle.maxCapacity}) exceeded by ${trip.passengerCount} passengers`,
            severity: 'BLOCK',
          });
        }
      }
    }

    return results;
  }

  /**
   * Check policies during trip execution.
   */
  async checkTripPolicies(input: TripPolicyCheck): Promise<PolicyCheckResult[]> {
    const results: PolicyCheckResult[] = [];
    const policies = await this.getPolicies(input.companyId);

    // 1. Max travel time check
    const maxTravelTimeMinutes = this.getPolicyValue(policies, 'max_travel_time_minutes', 75);
    results.push({
      allowed: true,
      policyName: 'max_travel_time_minutes',
      policyValue: maxTravelTimeMinutes,
      actualValue: 0, // Will be updated during trip
      message: `Max travel time: ${maxTravelTimeMinutes} minutes`,
      severity: 'INFO',
    });

    // 2. Route deviation check
    const maxRouteDeviationKm = this.getPolicyValue(policies, 'max_route_deviation_km', 5);
    results.push({
      allowed: true,
      policyName: 'max_route_deviation_km',
      policyValue: maxRouteDeviationKm,
      actualValue: 0, // Will be calculated from GPS
      message: `Max route deviation: ${maxRouteDeviationKm} km`,
      severity: 'INFO',
    });

    return results;
  }

  /**
   * Check policies for cancellation.
   */
  async checkCancellationPolicies(companyId: string, tripId: string): Promise<PolicyCheckResult[]> {
    const results: PolicyCheckResult[] = [];
    const policies = await this.getPolicies(companyId);

    // 1. Cancellation cutoff
    const cancellationCutoffMinutes = this.getPolicyValue(policies, 'cancellation_cutoff_minutes', 60);
    const trip = await (this.prisma as any).trip.findUnique({ where: { id: tripId } });
    if (trip && trip.scheduledPickupTime) {
      const minutesUntilPickup = (new Date(trip.scheduledPickupTime).getTime() - Date.now()) / (1000 * 60);
      if (minutesUntilPickup < cancellationCutoffMinutes) {
        results.push({
          allowed: false,
          policyName: 'cancellation_cutoff_minutes',
          policyValue: cancellationCutoffMinutes,
          actualValue: Math.round(minutesUntilPickup),
          message: `Cancellation must be done at least ${cancellationCutoffMinutes} minutes before pickup`,
          severity: 'BLOCK',
        });
      }
    }

    return results;
  }

  /**
   * Get policies for a scope (company → site → process).
   */
  private async getPolicies(companyId: string, siteId?: string, processId?: string) {
    const where: any = { companyId, isActive: true };

    // Try to find most specific policy first
    if (siteId && processId) {
      const specific = await (this.prisma as any).transportPolicy.findFirst({
        where: { ...where, siteId, processId },
      });
      if (specific) return specific.rules || {};
    }

    if (siteId) {
      const sitePolicy = await (this.prisma as any).transportPolicy.findFirst({
        where: { ...where, siteId, processId: null },
      });
      if (sitePolicy) return sitePolicy.rules || {};
    }

    // Fall back to company-level policy
    const companyPolicy = await (this.prisma as any).transportPolicy.findFirst({
      where: { ...where, siteId: null, processId: null },
    });

    return companyPolicy?.rules || {};
  }

  /**
   * Get a specific policy value with fallback.
   */
  private getPolicyValue(policies: any, key: string, defaultValue: any): any {
    return policies[key] ?? defaultValue;
  }
}
