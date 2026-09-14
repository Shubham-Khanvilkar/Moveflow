import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { WorkflowOrchestrationService } from './workflow-orchestration.service';

describe('WorkflowOrchestrationService', () => {
  let service: WorkflowOrchestrationService;
  let prisma: any;
  let audit: any;

  const mockPrisma = {
    isConnected: jest.fn().mockReturnValue(true),
    booking: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    bookingWorkflow: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    bookingWorkflowStep: {
      createMany: jest.fn(),
    },
    bookingEscalation: {
      create: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = mockPrisma;
    audit = mockAudit;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowOrchestrationService,
        { provide: 'PrismaService', useValue: prisma },
        { provide: 'AuditService', useValue: audit },
      ],
    }).compile();

    service = module.get<WorkflowOrchestrationService>(WorkflowOrchestrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startBookingWorkflow', () => {
    it('should throw ServiceUnavailableException when DB not connected', async () => {
      prisma.isConnected.mockReturnValue(false);
      await expect(service.startBookingWorkflow('comp1', 'b1', 'user1'))
        .rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.startBookingWorkflow('comp1', 'b1', 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when booking not pending', async () => {
      prisma.booking.findFirst.mockResolvedValue({ id: 'b1', status: 'APPROVED' });
      await expect(service.startBookingWorkflow('comp1', 'b1', 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should start workflow with 4 steps', async () => {
      prisma.booking.findFirst.mockResolvedValue({ id: 'b1', status: 'PENDING' });
      prisma.bookingWorkflow.create.mockResolvedValue({
        id: 'wf1', bookingId: 'b1', status: 'IN_PROGRESS', currentStep: 'DRIVER_ASSIGNMENT',
      });
      prisma.booking.update.mockResolvedValue({});
      prisma.bookingWorkflowStep.createMany.mockResolvedValue({ count: 4 });

      const result = await service.startBookingWorkflow('comp1', 'b1', 'user1');

      expect(result.workflowId).toBe('wf1');
      expect(result.currentStep).toBe('DRIVER_ASSIGNMENT');
      expect(result.steps).toHaveLength(4);
      expect(prisma.bookingWorkflowStep.createMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ stepName: 'DRIVER_ASSIGNMENT' }),
          expect.objectContaining({ stepName: 'VEHICLE_ASSIGNMENT' }),
          expect.objectContaining({ stepName: 'PASSENGER_NOTIFICATION' }),
          expect.objectContaining({ stepName: 'TRIP_START' }),
        ]),
      }));
    });
  });

  describe('escalateBookingRequest', () => {
    it('should throw NotFoundException when booking not found', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      await expect(service.escalateBookingRequest('comp1', 'b1', 'user1', { reason: 'test' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should create escalation and update booking status', async () => {
      prisma.booking.findFirst.mockResolvedValue({ id: 'b1', status: 'PENDING' });
      prisma.bookingEscalation.create.mockResolvedValue({
        id: 'esc1', bookingId: 'b1', reason: 'Driver unavailable', priority: 'HIGH',
      });
      prisma.booking.update.mockResolvedValue({});

      const result = await service.escalateBookingRequest('comp1', 'b1', 'user1', { reason: 'Driver unavailable', priority: 'HIGH' });

      expect(result.id).toBe('esc1');
      expect(result.priority).toBe('HIGH');
      expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'b1' },
        data: { status: 'ESCALATED' },
      }));
    });
  });

  describe('completeBookingWorkflow', () => {
    it('should throw NotFoundException when workflow not found', async () => {
      prisma.bookingWorkflow.findFirst.mockResolvedValue(null);
      await expect(service.completeBookingWorkflow('comp1', 'wf1', 'user1', {}))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when workflow not in progress', async () => {
      prisma.bookingWorkflow.findFirst.mockResolvedValue({ id: 'wf1', status: 'COMPLETED', bookingId: 'b1' });
      await expect(service.completeBookingWorkflow('comp1', 'wf1', 'user1', {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should complete workflow and confirm booking', async () => {
      prisma.bookingWorkflow.findFirst.mockResolvedValue({ id: 'wf1', status: 'IN_PROGRESS', bookingId: 'b1' });
      prisma.bookingWorkflow.update.mockResolvedValue({ id: 'wf1', status: 'COMPLETED' });
      prisma.booking.update.mockResolvedValue({});

      const result = await service.completeBookingWorkflow('comp1', 'wf1', 'user1', { tripId: 't1' });

      expect(result.status).toBe('COMPLETED');
      expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'b1' },
        data: { status: 'CONFIRMED' },
      }));
    });
  });

  describe('getWorkflowStatus', () => {
    it('should throw NotFoundException when workflow not found', async () => {
      prisma.bookingWorkflow.findFirst.mockResolvedValue(null);
      await expect(service.getWorkflowStatus('comp1', 'wf1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should return workflow with steps', async () => {
      prisma.bookingWorkflow.findFirst.mockResolvedValue({
        id: 'wf1', steps: [{ stepName: 'DRIVER_ASSIGNMENT', status: 'COMPLETED' }],
      });

      const result = await service.getWorkflowStatus('comp1', 'wf1');

      expect(result.id).toBe('wf1');
      expect(result.steps).toHaveLength(1);
    });
  });

  describe('listWorkflows', () => {
    it('should return paginated workflows', async () => {
      prisma.bookingWorkflow.findMany.mockResolvedValue([{ id: 'wf1', booking: { id: 'b1' } }]);
      prisma.bookingWorkflow.count.mockResolvedValue(1);

      const result = await service.listWorkflows('comp1', { page: 1, limit: 20, status: 'IN_PROGRESS' });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});