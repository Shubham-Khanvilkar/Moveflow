import { Test, TestingModule } from '@nestjs/testing';
import { NoShowWorkflowService } from './no-show-workflow.service';
import { PrismaService } from '../../common/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrisma, TEST_COMPANY } from '../../../test/test-utils';

describe('No-Show Integration', () => {
  let service: NoShowWorkflowService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoShowWorkflowService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NoShowWorkflowService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Pickup Arrival Recording', () => {
    it('should record pickup arrival with distance calculation', async () => {
      prisma.noShowPolicyConfig.findFirst.mockResolvedValue({
        gracePeriodMinutes: 10,
      });
      prisma.pickupArrivalEvent.create.mockResolvedValue({
        id: 'arr-1',
        tripId: 'trip-1',
        passengerId: 'p1',
        latitude: 19.076,
        longitude: 72.8777,
      });
      prisma.trip.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.recordPickupArrival({
        companyId: TEST_COMPANY.id,
        tripId: 'trip-1',
        bookingId: 'bk-1',
        passengerId: 'p1',
        driverId: 'd1',
        vehicleId: 'v1',
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 10,
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
      });

      expect(result.distanceMeters).toBeDefined();
      expect(result.gpsAccuracyAcceptable).toBe(true);
    });
  });

  describe('Call Attempt Recording', () => {
    it('should record a call attempt', async () => {
      prisma.noShowPolicyConfig.findFirst.mockResolvedValue({
        minimumMinutesBetweenCalls: 2,
        requiredCallAttempts: 2,
      });
      prisma.passengerContactAttempt.count.mockResolvedValue(0);
      prisma.passengerContactAttempt.findFirst.mockResolvedValue(null);
      prisma.passengerContactAttempt.create.mockResolvedValue({
        id: 'call-1',
        attemptNumber: 1,
        method: 'PHONE',
        result: 'NO_ANSWER',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.recordCallAttempt({
        companyId: TEST_COMPANY.id,
        tripId: 'trip-1',
        bookingId: 'bk-1',
        passengerId: 'p1',
        driverId: 'd1',
        method: 'PHONE',
        result: 'NO_ANSWER',
      });

      expect(result.attempt.attemptNumber).toBe(1);
      expect(result.passengerAvailable).toBe(false);
    });

    it('should return passengerAvailable when answered', async () => {
      prisma.noShowPolicyConfig.findFirst.mockResolvedValue({
        minimumMinutesBetweenCalls: 2,
      });
      prisma.passengerContactAttempt.count.mockResolvedValue(0);
      prisma.passengerContactAttempt.findFirst.mockResolvedValue(null);
      prisma.passengerContactAttempt.create.mockResolvedValue({
        id: 'call-2',
        attemptNumber: 1,
        result: 'ANSWERED',
      });
      prisma.trip.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.recordCallAttempt({
        companyId: TEST_COMPANY.id,
        tripId: 'trip-1',
        bookingId: 'bk-1',
        passengerId: 'p1',
        driverId: 'd1',
        method: 'PHONE',
        result: 'ANSWERED',
      });

      expect(result.passengerAvailable).toBe(true);
      expect(result.action).toBe('BOARDING');
    });
  });

  describe('No-Show Eligibility Check', () => {
    it('should check 5-evidence requirements', async () => {
      prisma.noShowPolicyConfig.findFirst.mockResolvedValue({
        gracePeriodMinutes: 10,
        requiredCallAttempts: 2,
        minimumMinutesBetweenCalls: 2,
        controlRoomConfirmation: false,
      });
      prisma.pickupArrivalEvent.findFirst.mockResolvedValue({
        id: 'arr-1',
        arrivedAt: new Date(Date.now() - 15 * 60000),
        tripId: 'trip-1',
      });
      prisma.passengerContactAttempt.findMany.mockResolvedValue([
        { id: 'c1', result: 'NO_ANSWER', attemptedAt: new Date(), completedAt: new Date() },
        { id: 'c2', result: 'NO_ANSWER', attemptedAt: new Date(), completedAt: new Date() },
      ]);
      prisma.supervisorCallRequest.findFirst.mockResolvedValue(null);

      const result = await service.checkNoShowEligibility(TEST_COMPANY.id, 'trip-1', 'p1');

      expect(result).toHaveProperty('canNoShow');
      expect(result).toHaveProperty('evidence');
      expect(result.evidence).toHaveProperty('arrivalRecorded');
      expect(result.evidence).toHaveProperty('gracePeriodExpired');
      expect(result.evidence).toHaveProperty('completedCallAttempts');
    });
  });

  describe('Supervisor Call Flow', () => {
    it('should create supervisor call request', async () => {
      prisma.supervisorCallRequest.create.mockResolvedValue({
        id: 'sup-1',
        status: 'REQUESTED',
        priority: 'HIGH',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.requestSupervisorCall({
        companyId: TEST_COMPANY.id,
        tripId: 'trip-1',
        bookingId: 'bk-1',
        passengerId: 'p1',
        driverId: 'd1',
        reason: 'Passenger not reachable',
      });

      expect(result.status).toBe('REQUESTED');
    });

    it('should assign supervisor to request', async () => {
      prisma.supervisorCallRequest.update.mockResolvedValue({
        id: 'sup-1',
        status: 'ASSIGNED',
        assignedSupervisorId: 'supervisor-1',
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.assignSupervisor('sup-1', 'supervisor-1', TEST_COMPANY.id);
      expect(result.status).toBe('ASSIGNED');
    });

    it('should record supervisor outcome', async () => {
      prisma.supervisorCallRequest.update.mockResolvedValue({
        id: 'sup-1',
        status: 'COMPLETED',
        resolvedAt: new Date(),
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.supervisorRecordOutcome('sup-1', 'supervisor-1', TEST_COMPANY.id, {
        callOutcome: 'PASSENGER_UNAVAILABLE',
        driverInstruction: 'PROCEED',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.driverInstruction).toBe('PROCEED');
    });
  });

  describe('No-Show Finalization', () => {
    it('should finalize no-show with evidence', async () => {
      prisma.noShowPolicyConfig.findFirst.mockResolvedValue({
        gracePeriodMinutes: 10,
        requiredCallAttempts: 2,
        minimumMinutesBetweenCalls: 2,
        controlRoomConfirmation: false,
      });
      prisma.pickupArrivalEvent.findFirst.mockResolvedValue({
        arrivedAt: new Date(Date.now() - 15 * 60000),
        tripId: 'trip-1',
      });
      const now = new Date();
      const earlier = new Date(now.getTime() - 5 * 60000);
      prisma.passengerContactAttempt.findMany.mockResolvedValue([
        { id: 'c1', result: 'NO_ANSWER', attemptedAt: earlier, completedAt: earlier },
        { id: 'c2', result: 'NO_ANSWER', attemptedAt: now, completedAt: now },
      ]);
      prisma.supervisorCallRequest.findFirst.mockResolvedValue(null);
      prisma.noShowEvidence.create.mockResolvedValue({
        id: 'evidence-1',
        tripId: 'trip-1',
        passengerId: 'p1',
        status: 'PENDING_REVIEW',
      });
      prisma.trip.update.mockResolvedValue({});
      prisma.employeeNoShowRecord.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.finalizeNoShow(
        TEST_COMPANY.id,
        'trip-1',
        'p1',
        'd1',
        'Passenger did not arrive',
      );

      expect(result.status).toBe('PENDING_REVIEW');
      expect(prisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'NO_SHOW' }) }),
      );
    });
  });

  describe('Appeal Flow', () => {
    it('should submit an appeal within 48-hour window', async () => {
      prisma.employeeNoShowRecord.findUnique.mockResolvedValue({
        id: 'ns-1',
        recordedAt: new Date(Date.now() - 24 * 3600000),
      });
      prisma.noShowAppeal.create.mockResolvedValue({
        id: 'appeal-1',
        status: 'SUBMITTED',
        slaDeadline: new Date(Date.now() + 48 * 3600000),
      });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.submitAppeal({
        companyId: TEST_COMPANY.id,
        employeeId: 'emp-1',
        noShowRecordId: 'ns-1',
        tripId: 'trip-1',
        reason: 'I was at the pickup point',
      });

      expect(result.status).toBe('SUBMITTED');
    });

    it('should reject appeal after 48-hour window', async () => {
      prisma.employeeNoShowRecord.findUnique.mockResolvedValue({
        id: 'ns-1',
        recordedAt: new Date(Date.now() - 72 * 3600000),
      });

      await expect(
        service.submitAppeal({
          companyId: TEST_COMPANY.id,
          employeeId: 'emp-1',
          noShowRecordId: 'ns-1',
          tripId: 'trip-1',
          reason: 'Too late',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve appeal and overturn no-show', async () => {
      prisma.noShowAppeal.findFirst.mockResolvedValue({
        id: 'appeal-1',
        status: 'SUBMITTED',
        companyId: TEST_COMPANY.id,
      });
      prisma.noShowAppeal.update.mockResolvedValue({
        id: 'appeal-1',
        status: 'APPROVED',
        reviewedAt: new Date(),
      });
      prisma.employeeNoShowRecord.update.mockResolvedValue({
        id: 'ns-1',
        overturned: true,
      });
      prisma.trip.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.decideAppeal(
        'appeal-1',
        TEST_COMPANY.id,
        'admin-1',
        'APPROVED',
        'Verified at pickup point',
      );

      expect(result.status).toBe('APPROVED');
      expect(prisma.employeeNoShowRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ overturned: true }) }),
      );
    });
  });
});
