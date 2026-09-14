import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TripStateMachine, TripState, TripAction } from './trip-state-machine';
import { WebhookDispatcherService } from '../notifications/webhook-dispatcher.service';
import { NotificationChannelsService } from '../notifications/notification-channels.service';

@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(
    private prisma: PrismaService,
    private webhookDispatcher: WebhookDispatcherService,
    private notificationChannels: NotificationChannelsService,
  ) {}

  // ============================================================
  // LIST & GET
  // ============================================================

  async listBookings(companyId: string, userId: string, query: any) {
    const where: any = { companyId };
    if (query.status) where.status = query.status;
    if (query.date) where.date = new Date(query.date);
    if (query.requesterId) where.requesterId = query.requesterId;
    const bookings = await this.prisma.booking.findMany({
      where,
      include: { requester: { select: { id: true, name: true, email: true } } } as any,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(query.limit) || 50, 100),
    });
    const total = await this.prisma.booking.count({ where });
    return { data: bookings, total };
  }

  async getBooking(companyId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: { requester: { select: { id: true, name: true, email: true } } } as any,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async listTrips(companyId: string, query: any) {
    const where: any = { companyId };
    if (query.status) where.status = query.status;
    if (query.date) where.date = new Date(query.date);
    const trips = await this.prisma.trip.findMany({
      where,
      include: { vehicle: true, driver: { select: { id: true, name: true, email: true } } } as any,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(query.limit) || 50, 100),
    });
    const total = await this.prisma.trip.count({ where });
    return { data: trips, total };
  }

  async getTrip(companyId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
      include: { vehicle: true, driver: { select: { id: true, name: true, email: true } } } as any,
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async getAvailableDrivers(companyId: string) {
    const drivers = await this.prisma.driverProfile.findMany({
      where: {
        companyId,
        status: 'ACTIVE' as any,
        availabilityStatus: 'AVAILABLE',
      },
      include: { user: { select: { id: true, name: true, email: true } } } as any,
    });
    return { data: drivers };
  }

  async getAvailableVehicles(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId, status: 'AVAILABLE' },
    });
    return { data: vehicles };
  }

  // ============================================================
  // BOOKING CREATION
  // ============================================================

  async createBooking(
    companyId: string,
    userId: string,
    data: {
      serviceType: 'CAB' | 'SHUTTLE' | 'BUS';
      date: string;
      pickupTime: string;
      pickupLatitude: number;
      pickupLongitude: number;
      pickupAddress: string;
      dropLatitude: number;
      dropLongitude: number;
      dropAddress: string;
      passengerCount?: number;
      specialRequirements?: string;
      returnTrip?: boolean;
      returnTime?: string;
    },
  ) {
    // Validate employee is eligible
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundException('Employee not found');
    if (user.transportEligibility !== 'ELIGIBLE') {
      throw new ForbiddenException('Employee is not transport eligible');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Employee account is not active');
    }

    // Check for active ban
    const activeBan = await this.prisma.transportBan.findFirst({
      where: {
        companyId,
        employeeId: userId,
        status: 'ACTIVE',
      },
    });
    if (activeBan) {
      throw new ForbiddenException('Employee has an active transport ban');
    }

    // ─── Shift Timing Validation ───────────────────────────────
    const bookingDate = new Date(data.date);
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const bookingDayName = dayNames[bookingDate.getDay()];

    // Find employee's schedule for the booking date
    const schedule = await this.prisma.employeeSchedule.findFirst({
      where: {
        userId,
        companyId,
        status: 'ACTIVE',
        effectiveFrom: { lte: bookingDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: bookingDate } },
        ],
      },
    });

    let shiftTiming: any = null;
    if (schedule?.shiftTimingId) {
      shiftTiming = await this.prisma.pickupDropTiming.findFirst({
        where: { id: schedule.shiftTimingId, companyId, isActive: true },
      });
    }

    // Load company transport schedule config for defaults
    const scheduleConfig = await this.prisma.transportScheduleConfig.findUnique({
      where: { companyId },
    });

    // Validate against shift timing windows if available
    if (shiftTiming) {
      // Check if booking day is applicable
      const applicableDays = shiftTiming.applicableDays.split(',').map(d => d.trim());
      if (!applicableDays.includes(bookingDayName)) {
        throw new BadRequestException(
          `Booking not allowed on ${bookingDayName}. Applicable days: ${applicableDays.join(', ')}`,
        );
      }

      // Check transport type is allowed
      const allowedTypes = shiftTiming.transportTypes.split(',').map(t => t.trim());
      if (!allowedTypes.includes(data.serviceType)) {
        throw new BadRequestException(
          `Transport type ${data.serviceType} is not allowed for this shift. Allowed: ${allowedTypes.join(', ')}`,
        );
      }

      // Validate pickup time is within the shift window
      const [reqH, reqM] = data.pickupTime.split(':').map(Number);
      const reqMinutes = reqH * 60 + reqM;
      const [pickStartH, pickStartM] = shiftTiming.pickupStartTime.split(':').map(Number);
      const [pickEndH, pickEndM] = shiftTiming.pickupEndTime.split(':').map(Number);
      const pickStartMinutes = pickStartH * 60 + pickStartM;
      const pickEndMinutes = pickEndH * 60 + pickEndM;

      const isOvernight = pickEndMinutes <= pickStartMinutes;
      const isWithinWindow = isOvernight
        ? reqMinutes >= pickStartMinutes || reqMinutes <= pickEndMinutes
        : reqMinutes >= pickStartMinutes && reqMinutes <= pickEndMinutes;

      if (!isWithinWindow) {
        throw new BadRequestException(
          `Pickup time ${data.pickupTime} is outside the shift window (${shiftTiming.pickupStartTime} - ${shiftTiming.pickupEndTime})`,
        );
      }

      // Check booking cutoff
      const now = new Date();
      const bookingDateTime = new Date(`${data.date}T${data.pickupTime}`);
      const minutesUntilPickup = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);
      if (minutesUntilPickup < shiftTiming.lastBookingCutoffMinutes) {
        throw new BadRequestException(
          `Booking must be at least ${shiftTiming.lastBookingCutoffMinutes} minutes before pickup. Only ${Math.round(minutesUntilPickup)} minutes remaining.`,
        );
      }
    } else {
      // Apply company-level booking cutoff if no shift timing
      const cutoffMinutes = scheduleConfig?.bookingCutoffMinutes ?? 60;
      const now = new Date();
      const bookingDateTime = new Date(`${data.date}T${data.pickupTime}`);
      const minutesUntilPickup = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);
      if (minutesUntilPickup < cutoffMinutes) {
        throw new BadRequestException(
          `Booking must be at least ${cutoffMinutes} minutes before pickup. Only ${Math.round(minutesUntilPickup)} minutes remaining.`,
        );
      }
    }

    // Generate booking code
    const bookingCode = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Determine if approval is required
    const policy = await this.prisma.transportPolicy.findFirst({
      where: { companyId },
    });
    const needsApproval = policy?.requireApproval || false;

    const booking = await this.prisma.booking.create({
      data: {
        bookingCode,
        type: data.serviceType === 'CAB' ? 'CAB' : data.serviceType === 'SHUTTLE' ? 'SHUTTLE' : 'BUS',
        status: needsApproval ? 'PENDING_APPROVAL' : 'REQUESTED',
        requesterId: userId,
        passengerCount: data.passengerCount || 1,
        serviceType: data.serviceType,
        date: new Date(data.date),
        pickupTime: new Date(`${data.date}T${data.pickupTime}`),
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        pickupAddress: data.pickupAddress,
        dropLatitude: data.dropLatitude,
        dropLongitude: data.dropLongitude,
        dropAddress: data.dropAddress,
        specialRequirements: data.specialRequirements,
        returnTrip: data.returnTrip || false,
        returnTime: data.returnTime ? new Date(`${data.date}T${data.returnTime}`) : null,
        companyId,
        approvalStatus: needsApproval ? 'PENDING' : 'NOT_REQUIRED',
      },
    });

    // Create notification
    await this.createNotification(companyId, userId, 'BOOKING_CONFIRMED', 'Booking Confirmed', `Your ${data.serviceType} booking ${bookingCode} has been created`);

    // Dispatch webhook
    this.webhookDispatcher.dispatch(companyId, 'booking.created', {
      bookingId: booking.id,
      bookingCode,
      requesterId: userId,
      serviceType: data.serviceType,
      pickupAddress: data.pickupAddress,
      dropAddress: data.dropAddress,
      date: data.date,
      status: booking.status,
    }).catch(err => this.logger.error(`Webhook dispatch failed for booking.created: ${err.message}`));

    return booking;
  }

  // ============================================================
  // BOOKING APPROVAL
  // ============================================================

  async approveBooking(
    companyId: string,
    bookingId: string,
    approverId: string,
    approved: boolean,
    reason?: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.approvalStatus !== 'PENDING') {
      throw new BadRequestException('Booking is not pending approval');
    }

    const newStatus = approved ? 'APPROVED' : 'REJECTED';
    const bookingStatus = approved ? 'APPROVED' : 'REJECTED';

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        approvalStatus: newStatus,
        status: bookingStatus,
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Notify requester
    const notifType = approved ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED';
    const notifTitle = approved ? 'Booking Approved' : 'Booking Rejected';
    await this.createNotification(
      companyId,
      booking.requesterId,
      notifType,
      notifTitle,
      `Your booking ${booking.bookingCode} has been ${approved ? 'approved' : 'rejected'}${reason ? `. Reason: ${reason}` : ''}`,
    );

    // Dispatch webhook
    const webhookEvent = approved ? 'booking.approved' : 'booking.rejected';
    this.webhookDispatcher.dispatch(companyId, webhookEvent, {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      requesterId: booking.requesterId,
      approved,
      approverId,
      reason,
    }).catch(err => this.logger.error(`Webhook dispatch failed for ${webhookEvent}: ${err.message}`));

    // Send email notification to requester
    const requester = await this.prisma.user.findFirst({ where: { id: booking.requesterId, companyId } });
    if (requester?.email) {
      this.notificationChannels.send({
        companyId,
        userId: booking.requesterId,
        channel: 'EMAIL',
        eventType: webhookEvent,
        title: notifTitle,
        body: `Your booking ${booking.bookingCode} has been ${approved ? 'approved' : 'rejected'}${reason ? `. Reason: ${reason}` : ''}. Pickup: ${booking.pickupAddress} → Drop: ${booking.dropAddress}.`,
        recipientEmail: requester.email,
        data: { bookingCode: booking.bookingCode, pickupAddress: booking.pickupAddress, dropAddress: booking.dropAddress },
      }).catch(err => this.logger.error(`Email notification failed for ${webhookEvent}: ${err.message}`));
    }

    return { success: true, status: bookingStatus };
  }

  // ============================================================
  // DISPATCH
  // ============================================================

  async dispatchTrip(
    companyId: string,
    bookingId: string,
    driverId: string,
    vehicleId: string,
    assignedBy: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.tripId) {
      throw new BadRequestException('Booking has already been dispatched');
    }
    if (!['APPROVED', 'REQUESTED'].includes(booking.status)) {
      throw new BadRequestException('Booking cannot be dispatched in current status');
    }

    // Validate driver is available
    const driverProfile = await this.prisma.driverProfile.findFirst({
      where: { id: driverId, companyId, status: 'ACTIVE' as any },
    });
    if (!driverProfile) throw new BadRequestException('Driver is not available');

    // Validate vehicle is available
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId, status: 'AVAILABLE' },
    });
    if (!vehicle) throw new BadRequestException('Vehicle is not available');

    const runDispatch = async (tx: any) => {
      // Claim both resources conditionally inside the transaction.
      const claimedDriver = await tx.driverProfile.updateMany({
        where: { id: driverId, companyId, status: 'ACTIVE', availabilityStatus: 'AVAILABLE' },
        data: { availabilityStatus: 'ON_TRIP' },
      });
      if (claimedDriver.count !== 1) throw new BadRequestException('Driver is no longer available');

      const claimedVehicle = await tx.vehicle.updateMany({
        where: { id: vehicleId, companyId, status: 'AVAILABLE' },
        data: { status: 'ASSIGNED' },
      });
      if (claimedVehicle.count !== 1) throw new BadRequestException('Vehicle is no longer available');

      const tripCode = `TRIP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // ─── Resolve shift timing for early pickup & departure mode ──
      let scheduledPickupTime = booking.pickupTime;
      let targetArrivalTime: Date | null = null;
      let originalShiftTime: string | null = null;
      let departureMode = 'FIXED';
      let waitTimeoutMinutes = 15;

      const requesterSchedule = await tx.employeeSchedule.findFirst({
        where: {
          userId: booking.requesterId,
          companyId,
          status: 'ACTIVE',
          effectiveFrom: { lte: booking.date },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: booking.date } },
          ],
        },
      });

      if (requesterSchedule?.shiftTimingId) {
        const shiftTiming = await tx.pickupDropTiming.findFirst({
          where: { id: requesterSchedule.shiftTimingId, companyId, isActive: true },
        });

        if (shiftTiming) {
          departureMode = shiftTiming.dropDepartureMode;
          waitTimeoutMinutes = shiftTiming.dropWaitTimeoutMinutes;

          if (shiftTiming.earlyPickupEnabled && shiftTiming.earlyPickupOffsetMinutes > 0) {
            const pickupDate = new Date(booking.pickupTime);
            pickupDate.setMinutes(pickupDate.getMinutes() - shiftTiming.earlyPickupOffsetMinutes);
            scheduledPickupTime = pickupDate;

            const arrivalDate = new Date(booking.pickupTime);
            arrivalDate.setMinutes(arrivalDate.getMinutes() - shiftTiming.earlyPickupBufferMinutes);
            targetArrivalTime = arrivalDate;

            originalShiftTime = `${String(booking.pickupTime.getHours()).padStart(2, '0')}:${String(booking.pickupTime.getMinutes()).padStart(2, '0')}`;
          }
        }
      } else {
        const scheduleConfig = await tx.transportScheduleConfig.findUnique({
          where: { companyId },
        });
        if (scheduleConfig) {
          departureMode = scheduleConfig.defaultDropDepartureMode;
          waitTimeoutMinutes = scheduleConfig.defaultDropWaitTimeoutMinutes;

          if (scheduleConfig.defaultEarlyPickupOffsetMinutes > 0) {
            const pickupDate = new Date(booking.pickupTime);
            pickupDate.setMinutes(pickupDate.getMinutes() - scheduleConfig.defaultEarlyPickupOffsetMinutes);
            scheduledPickupTime = pickupDate;

            const arrivalDate = new Date(booking.pickupTime);
            arrivalDate.setMinutes(arrivalDate.getMinutes() - scheduleConfig.defaultEarlyPickupBufferMinutes);
            targetArrivalTime = arrivalDate;

            originalShiftTime = `${String(booking.pickupTime.getHours()).padStart(2, '0')}:${String(booking.pickupTime.getMinutes()).padStart(2, '0')}`;
          }
        }
      }

      const trip = await tx.trip.create({
        data: {
          tripCode,
          status: 'SCHEDULED',
          type: booking.type,
          date: booking.date,
          scheduledPickupTime,
          pickupLatitude: booking.pickupLatitude,
          pickupLongitude: booking.pickupLongitude,
          pickupAddress: booking.pickupAddress,
          dropLatitude: booking.dropLatitude,
          dropLongitude: booking.dropLongitude,
          dropAddress: booking.dropAddress,
          passengerCount: booking.passengerCount,
          companyId,
          vehicleId,
          driverId: driverProfile.userId,
          departureMode,
          waitTimeoutMinutes,
          targetArrivalTime,
          originalShiftTime,
        },
      });

      await tx.dispatchAssignment.create({
        data: { companyId, tripId: trip.id, driverId: driverProfile.id, vehicleId, assignedBy, type: 'ORIGINAL', status: 'ACTIVE' },
      });
      await tx.driverTrip.create({ data: { tripId: trip.id, driverId: driverProfile.id } });

      const linkedBooking = await tx.booking.updateMany({
        where: { id: bookingId, companyId, tripId: null, status: { in: ['APPROVED', 'REQUESTED'] } },
        data: { tripId: trip.id, status: 'DISPATCHING' },
      });
      if (linkedBooking.count !== 1) throw new BadRequestException('Booking is no longer dispatchable');

      const passengers = await tx.bookingPassenger.findMany({ where: { bookingId } });
      if (passengers.length > 0) {
        await tx.tripPassenger.createMany({
          data: passengers.map((p: any) => ({ tripId: trip.id, userId: p.userId, boardingStatus: 'SCHEDULED' })),
          skipDuplicates: true,
        });
      }

      return trip;
    };

    const trip = this.prisma.$transaction
      ? await this.prisma.$transaction(runDispatch)
      : await runDispatch(this.prisma);

    await this.createNotification(
      companyId,
      driverProfile.userId,
      'DRIVER_ASSIGNED',
      'New Trip Assigned',
      `Trip ${trip.tripCode}: ${booking.pickupAddress} → ${booking.dropAddress}`,
    );

    // Dispatch webhook
    this.webhookDispatcher.dispatch(companyId, 'trip.dispatched', {
      tripId: trip.id,
      tripCode: trip.tripCode,
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      driverId: driverProfile.userId,
      vehicleId,
      pickupAddress: booking.pickupAddress,
      dropAddress: booking.dropAddress,
    }).catch(err => this.logger.error(`Webhook dispatch failed for trip.dispatched: ${err.message}`));

    return trip;
  }

  // ============================================================
  // TRIP STATE TRANSITIONS
  // ============================================================

  async transitionTripState(
    companyId: string,
    tripId: string,
    action: TripAction,
    userId: string,
    metadata?: Record<string, any>,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    // Validate transition
    const currentState = trip.status as TripState;
    if (!TripStateMachine.canTransition(currentState, action)) {
      const validActions = TripStateMachine.getValidActions(currentState);
      throw new BadRequestException(
        `Cannot ${action} from state ${currentState}. Valid actions: ${validActions.join(', ')}`
      );
    }

    const newState = TripStateMachine.transition(currentState, action);

    // Build update data based on action
    const updateData: any = { status: newState };

    switch (action) {
      case 'DRIVER_ACCEPT':
        // Driver accepts the trip
        break;
      case 'DRIVER_EN_ROUTE':
        // Driver is heading to pickup
        break;
      case 'ARRIVE_AT_PICKUP':
        updateData.actualPickupTime = new Date();
        break;
      case 'START_TRIP':
        updateData.startedAt = new Date();
        updateData.isTracking = true;
        break;
      case 'COMPLETE_TRIP':
        updateData.completedAt = new Date();
        updateData.isTracking = false;
        // Calculate duration
        if (trip.startedAt) {
          updateData.actualDuration = Math.round(
            (Date.now() - trip.startedAt.getTime()) / 60000
          );
        }
        // Update vehicle and driver status back
        if (trip.vehicleId) {
          await this.prisma.vehicle.update({
            where: { id: trip.vehicleId },
            data: { status: 'AVAILABLE' },
          });
        }
        if (trip.driverId) {
          const driverProfile = await this.prisma.driverProfile.findFirst({
            where: { userId: trip.driverId, companyId },
          });
          if (driverProfile) {
            await this.prisma.driverProfile.update({
              where: { id: driverProfile.id },
              data: {
                status: 'ACTIVE' as any,
                availabilityStatus: 'AVAILABLE',
                totalTrips: { increment: 1 },
              },
            });
          }
        }
        break;
      case 'REPORT_BREAKDOWN':
        updateData.isTracking = false;
        // Create incident
        if (metadata) {
          await this.prisma.incident.create({
            data: {
              type: 'VEHICLE_BREAKDOWN',
              description: metadata.description || 'Vehicle breakdown reported',
              status: 'REPORTED',
              tripId: trip.id,
              vehicleId: trip.vehicleId,
              driverId: trip.driverId,
              reporterId: userId,
              companyId,
              latitude: metadata.latitude,
              longitude: metadata.longitude,
            },
          });
        }
        break;
      case 'MARK_NO_SHOW':
        updateData.noShowCount = { increment: 1 } as any;
        break;
    }

    // Apply the transition
    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: updateData,
    });

    // Sync booking status with trip status
    await this.syncBookingStatus(tripId, newState);

    // Auto-create return trip on completion
    if (newState === 'COMPLETED') {
      await this.createReturnTripIfRequested(tripId, companyId);
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `TRIP_${action}`,
        entity: 'Trip',
        entityId: tripId,
        oldValue: { status: currentState },
        newValue: { status: newState, ...metadata },
      },
    });

    // Dispatch webhooks for key trip events
    const tripWebhookMap: Record<string, string> = {
      DISPATCHED: 'trip.dispatched',
      IN_TRANSIT: 'trip.started',
      COMPLETED: 'trip.completed',
    };
    const webhookEvent = tripWebhookMap[newState];
    if (webhookEvent) {
      this.webhookDispatcher.dispatch(companyId, webhookEvent, {
        tripId: updatedTrip.id,
        tripCode: updatedTrip.tripCode,
        status: newState,
        previousStatus: currentState,
        driverId: trip.driverId,
        vehicleId: trip.vehicleId,
      }).catch(err => this.logger.error(`Webhook dispatch failed for ${webhookEvent}: ${err.message}`));
    }

    // Send email on trip completion
    if (newState === 'COMPLETED') {
      const booking = await this.prisma.booking.findFirst({ where: { tripId } });
      if (booking) {
        const employee = await this.prisma.user.findFirst({ where: { id: booking.requesterId, companyId } });
        if (employee?.email) {
          const duration = updatedTrip.actualDuration ? `${updatedTrip.actualDuration} minutes` : 'N/A';
          this.notificationChannels.send({
            companyId,
            userId: booking.requesterId,
            channel: 'EMAIL',
            eventType: 'trip.completed',
            title: 'Trip Completed',
            body: `Your trip ${updatedTrip.tripCode} has been completed. Pickup: ${updatedTrip.pickupAddress} → Drop: ${updatedTrip.dropAddress}. Duration: ${duration}.`,
            recipientEmail: employee.email,
            data: {
              tripCode: updatedTrip.tripCode,
              pickupAddress: updatedTrip.pickupAddress,
              dropAddress: updatedTrip.dropAddress,
              duration,
              completedAt: updatedTrip.completedAt?.toISOString(),
            },
          }).catch(err => this.logger.error(`Email notification failed for trip.completed: ${err.message}`));
        }
      }
    }

    return updatedTrip;
  }

  // ============================================================
  // BOOKING-TRIP STATUS SYNC
  // ============================================================

  private async syncBookingStatus(tripId: string, tripState: TripState) {
    // Find linked booking
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return;

    // Find booking linked to this trip
    const booking = await this.prisma.booking.findFirst({
      where: { tripId },
    });
    if (!booking) return;

    const bookingStatusMap: Partial<Record<TripState, string>> = {
      DISPATCHED: 'DISPATCHING',
      IN_TRANSIT: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      NO_SHOW: 'NO_SHOW',
      ARRIVED_AT_DROP: 'ARRIVED',
    };

    const newBookingStatus = bookingStatusMap[tripState];
    if (newBookingStatus && booking.status !== newBookingStatus) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: newBookingStatus as any },
      });
    }
  }

  // ============================================================
  // RETURN TRIP AUTO-CREATION
  // ============================================================

  private async createReturnTripIfRequested(tripId: string, companyId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { tripId },
    });
    if (!booking || !booking.returnTrip || !booking.returnTime) return;

    // Check if return booking already exists
    const existingReturn = await this.prisma.booking.findFirst({
      where: {
        companyId,
        requesterId: booking.requesterId,
        returnTrip: false,
        date: booking.date,
        pickupAddress: booking.dropAddress,
        dropAddress: booking.pickupAddress,
      },
    });
    if (existingReturn) return;

    const returnBookingCode = `BK-RT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const returnBooking = await this.prisma.booking.create({
      data: {
        bookingCode: returnBookingCode,
        type: booking.type,
        status: 'REQUESTED',
        requesterId: booking.requesterId,
        passengerCount: booking.passengerCount,
        serviceType: booking.serviceType,
        date: booking.date,
        pickupTime: booking.returnTime,
        // Swap pickup and drop
        pickupLatitude: booking.dropLatitude,
        pickupLongitude: booking.dropLongitude,
        pickupAddress: booking.dropAddress,
        dropLatitude: booking.pickupLatitude,
        dropLongitude: booking.pickupLongitude,
        dropAddress: booking.pickupAddress,
        returnTrip: false,
        companyId,
        approvalStatus: 'NOT_REQUIRED',
      },
    });

    await this.createNotification(
      companyId,
      booking.requesterId,
      'RETURN_TRIP_CREATED',
      'Return Trip Created',
      `Your return trip ${returnBookingCode} has been auto-created for ${booking.date}`,
    );

    return returnBooking;
  }

  // ============================================================
  // PASSENGER STATE MACHINE
  // ============================================================

  private readonly PASSENGER_VALID_TRANSITIONS: Record<string, string[]> = {
    SCHEDULED: ['EN_ROUTE_TO_PICKUP', 'PICKED_UP', 'NO_SHOW', 'CANCELLED'],
    EN_ROUTE_TO_PICKUP: ['PICKED_UP', 'NO_SHOW', 'CANCELLED'],
    PICKED_UP: ['IN_TRANSIT'],
    IN_TRANSIT: ['ALIGHTING', 'DROPPED'],
    ALIGHTING: ['DROPPED'],
    DROPPED: [],
    NO_SHOW: [],
    CANCELLED: [],
  };

  private readonly PASSENGER_ACTION_TARGET: Record<string, string> = {
    EN_ROUTE_TO_PICKUP: 'EN_ROUTE_TO_PICKUP',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    ALIGHTING: 'ALIGHTING',
    DROPPED: 'DROPPED',
    NO_SHOW: 'NO_SHOW',
    CANCELLED: 'CANCELLED',
  };

  /**
   * Transition a passenger's boarding status.
   */
  async transitionPassenger(
    companyId: string,
    tripId: string,
    userId: string,
    action: string,
    metadata?: {
      seatNumber?: number;
      pickupLatitude?: number;
      pickupLongitude?: number;
      dropLatitude?: number;
      dropLongitude?: number;
      boardedImage?: string;
    },
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const passenger = await this.prisma.tripPassenger.findUnique({
      where: { tripId_userId: { tripId, userId } },
    });
    if (!passenger) throw new NotFoundException('Passenger not found on this trip');

    const currentStatus = passenger.boardingStatus;
    const validActions = this.PASSENGER_VALID_TRANSITIONS[currentStatus] || [];
    if (!validActions.includes(action)) {
      throw new BadRequestException(
        `Cannot ${action} passenger from status ${currentStatus}. Valid: ${validActions.join(', ')}`,
      );
    }

    const newStatus = this.PASSENGER_ACTION_TARGET[action];
    const updateData: any = { boardingStatus: newStatus };

    if (action === 'PICKED_UP') {
      updateData.boardTime = new Date();
      updateData.seatNumber = metadata?.seatNumber;
      updateData.pickupLatitude = metadata?.pickupLatitude;
      updateData.pickupLongitude = metadata?.pickupLongitude;
      if (metadata?.boardedImage) updateData.boardedImage = metadata.boardedImage;
      if (metadata?.boardedImage) updateData.boardedImageAt = new Date();
    }

    if (action === 'DROPPED') {
      updateData.alightTime = new Date();
      updateData.dropLatitude = metadata?.dropLatitude;
      updateData.dropLongitude = metadata?.dropLongitude;
    }

    const updated = await this.prisma.tripPassenger.update({
      where: { tripId_userId: { tripId, userId } },
      data: updateData,
    });

    // Write VehicleOccupancyLog after boarding/alighting
    if (['PICKED_UP', 'DROPPED', 'NO_SHOW'].includes(action)) {
      await this.writeOccupancyLog(tripId, trip.vehicleId, companyId);
    }

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `PASSENGER_${action}`,
        entity: 'TripPassenger',
        entityId: passenger.id,
        oldValue: { boardingStatus: currentStatus },
        newValue: { boardingStatus: newStatus, ...metadata },
      },
    });

    return updated;
  }

  /**
   * Write a VehicleOccupancyLog entry after passenger state changes.
   */
  private async writeOccupancyLog(tripId: string, vehicleId: string | null, companyId: string) {
    if (!vehicleId) return;

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    const maxCapacity = (vehicle as any)?.maxCapacity || 6;

    const boarded = await this.prisma.tripPassenger.count({
      where: { tripId, boardingStatus: { in: ['PICKED_UP', 'IN_TRANSIT', 'ALIGHTING'] } },
    });

    const occupancyPercent = maxCapacity > 0 ? (boarded / maxCapacity) * 100 : 0;

    await (this.prisma as any).vehicleOccupancyLog.create({
      data: {
        tripId,
        vehicleId,
        companyId,
        recordedAt: new Date(),
        maxCapacity,
        occupiedSeats: boarded,
        occupancyPercent: Math.round(occupancyPercent * 100) / 100,
        isUnderutilized: occupancyPercent < 40,
        isOptimal: occupancyPercent >= 60 && occupancyPercent <= 85,
        isOverloaded: occupancyPercent > 100,
      },
    });
  }

  /**
   * Get all passengers for a trip with their status.
   */
  async getTripPassengers(companyId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const passengers = await this.prisma.tripPassenger.findMany({
      where: { tripId },
      include: {
        User: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    return { data: passengers };
  }

  // ============================================================
  // BREAKDOWN & REPLACEMENT
  // ============================================================

  async findReplacement(
    companyId: string,
    tripId: string,
    breakdownLat: number,
    breakdownLng: number,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    // Find nearest available vehicles of same type
    const availableVehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        status: 'AVAILABLE',
        vehicleType: trip.type === 'CAB' ? 'CAB' : undefined,
      },
      include: {
        drivers: {
          where: { status: 'ACTIVE' as any, companyId },
          include: { user: true },
        },
      } as any,
    });

    // Calculate distances (simplified Haversine)
    const candidates = availableVehicles
      .filter((v) => v.drivers.length > 0 && v.latitude && v.longitude)
      .map((v) => {
        const dist = this.haversineDistance(
          breakdownLat, breakdownLng,
          v.latitude!, v.longitude!,
        );
        return {
          vehicle: v,
          driver: v.drivers[0],
          distance: dist,
          eta: Math.round(dist / 30 * 60), // rough ETA assuming 30km/h
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5); // Top 5 candidates

    // Create replacement assignment records
    if (candidates.length > 0) {
      const incident = await this.prisma.incident.findFirst({
        where: { tripId, type: 'VEHICLE_BREAKDOWN', status: 'REPORTED' },
      });

      for (const c of candidates) {
        await this.prisma.replacementAssignment.create({
          data: {
            companyId,
            incidentId: incident?.id || tripId,
            replacementDriverId: c.driver.id,
            replacementVehicleId: c.vehicle.id,
            replacementETA: c.eta,
            distance: c.distance,
            status: 'CANDIDATE_FOUND',
            reason: 'Vehicle breakdown',
            passengersToTransfer: trip.boardedCount,
          },
        });
      }
    }

    return {
      tripId,
      candidates: (candidates as any[]).map((c) => ({
        vehicleId: c.vehicle.id,
        registrationNo: c.vehicle.registrationNo,
        driverName: c.driver.user.name,
        distance: `${c.distance.toFixed(1)} km`,
        eta: `${c.eta} min`,
      })),
    };
  }

  // ============================================================
  // GEO FENCING
  // ============================================================

  async checkGeofence(
    companyId: string,
    vehicleId: string,
    latitude: number,
    longitude: number,
  ) {
    const geofences = await this.prisma.geofence.findMany({
      where: { companyId, isActive: true },
    });

    const triggeredEvents: any[] = [];

    for (const gf of geofences) {
      const distance = this.haversineDistance(latitude, longitude, gf.latitude, gf.longitude);
      const isInside = distance <= gf.radius;

      if (isInside) {
        triggeredEvents.push({
          geofenceId: gf.id,
          geofenceName: gf.name,
          type: gf.type,
          action: 'ENTER',
          distance: `${distance.toFixed(0)}m`,
        });

        // Record event
        await this.prisma.geofenceEvent.create({
          data: {
            geofenceId: gf.id,
            vehicleId,
            action: 'ENTER',
            latitude,
            longitude,
            timestamp: new Date(),
          },
        });
      }
    }

    return triggeredEvents;
  }

  // ============================================================
  // GPS TRACKING
  // ============================================================

  async recordGPSLocation(
    companyId: string,
    vehicleId: string,
    data: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      altitude?: number;
      tripId?: string;
      eventId?: string;
    },
  ) {
    // Check for duplicate event
    if (data.eventId) {
      const existing = await this.prisma.locationPing.findUnique({
        where: { eventId: data.eventId },
      });
      if (existing) return existing; // Idempotent
    }

    const ping = await this.prisma.locationPing.create({
      data: {
        vehicleId,
        tripId: data.tripId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        accuracy: data.accuracy,
        altitude: data.altitude,
        eventId: data.eventId,
        timestamp: new Date(),
      },
    });

    // Update latest location (upsert)
    await this.prisma.latestVehicleLocation.upsert({
      where: { vehicleId },
      update: {
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        accuracy: data.accuracy,
        altitude: data.altitude,
        timestamp: new Date(),
      },
      create: {
        vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        accuracy: data.accuracy,
        altitude: data.altitude,
        timestamp: new Date(),
      },
    });

    // Check geofences
    await this.checkGeofence(companyId, vehicleId, data.latitude, data.longitude);

    return ping;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async createNotification(
    companyId: string,
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        data,
        channel: 'IN_APP',
      },
    });
  }
}
