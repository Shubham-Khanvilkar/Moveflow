import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class WorkflowOrchestrationService {
  private readonly logger = new Logger(WorkflowOrchestrationService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async startBookingWorkflow(companyId: string, bookingId: string, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== 'REQUESTED') {
      throw new BadRequestException('Booking cannot be processed');
    }

    const workflow = await (this.prisma as any).bookingWorkflow.create({
      data: {
        companyId,
        bookingId,
        status: 'IN_PROGRESS',
        startedBy: performedBy,
        startedAt: new Date(),
        currentStep: 'DRIVER_ASSIGNMENT',
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'DISPATCHING' as any },
    });

    const steps = [
      { name: 'DRIVER_ASSIGNMENT', status: 'PENDING' },
      { name: 'VEHICLE_ASSIGNMENT', status: 'PENDING' },
      { name: 'PASSENGER_NOTIFICATION', status: 'PENDING' },
      { name: 'TRIP_START', status: 'PENDING' },
    ];

    await (this.prisma as any).bookingWorkflowStep.createMany({
      data: steps.map((step, index) => ({
        workflowId: workflow.id,
        stepNumber: index + 1,
        stepName: step.name,
        status: step.status,
      })),
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'BOOKING_WORKFLOW_STARTED',
      entity: 'BookingWorkflow', entityId: workflow.id,
      newValue: { bookingId, stepsCount: steps.length },
    });

    return {
      workflowId: workflow.id,
      bookingId,
      status: 'IN_PROGRESS',
      currentStep: 'DRIVER_ASSIGNMENT',
      steps,
    };
  }

  async escalateBookingRequest(companyId: string, bookingId: string, performedBy: string, data: {
    reason: string;
    priority?: string;
    notes?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const escalation = await (this.prisma as any).bookingEscalation.create({
      data: {
        companyId,
        bookingId,
        reason: data.reason,
        priority: data.priority || 'MEDIUM',
        notes: data.notes,
        escalatedBy: performedBy,
        escalatedAt: new Date(),
        status: 'OPEN',
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'PENDING_APPROVAL' as any },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'BOOKING_ESCALATED',
      entity: 'BookingEscalation', entityId: escalation.id,
      newValue: { bookingId, reason: data.reason, priority: data.priority },
    });

    return escalation;
  }

  async completeBookingWorkflow(companyId: string, workflowId: string, performedBy: string, data: {
    tripId?: string;
    notes?: string;
  }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const workflow = await (this.prisma as any).bookingWorkflow.findFirst({
      where: { id: workflowId, companyId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    if (workflow.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Workflow is not in progress');
    }

    const updated = await (this.prisma as any).bookingWorkflow.update({
      where: { id: workflowId },
      data: {
        status: 'COMPLETED',
        currentStep: 'COMPLETED',
        completedBy: performedBy,
        completedAt: new Date(),
        tripId: data.tripId,
        notes: data.notes,
      },
    });

    await this.prisma.booking.update({
      where: { id: workflow.bookingId },
      data: { status: 'APPROVED' as any },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'BOOKING_WORKFLOW_COMPLETED',
      entity: 'BookingWorkflow', entityId: workflowId,
      newValue: { bookingId: workflow.bookingId, tripId: data.tripId },
    });

    return updated;
  }

  async getWorkflowStatus(companyId: string, workflowId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const workflow = await (this.prisma as any).bookingWorkflow.findFirst({
      where: { id: workflowId, companyId },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    return workflow;
  }

  async listWorkflows(companyId: string, params: { page?: number; limit?: number; status?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (params.status) where.status = params.status;

    const [workflows, total] = await Promise.all([
      (this.prisma as any).bookingWorkflow.findMany({
        where, skip, take: limit,
        include: { booking: { select: { id: true, employeeId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).bookingWorkflow.count({ where }),
    ]);

    return {
      data: workflows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
