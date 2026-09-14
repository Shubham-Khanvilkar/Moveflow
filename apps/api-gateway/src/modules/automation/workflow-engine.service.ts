import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async executeWorkflow(companyId: string, workflowId: string, context: Record<string, any>, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const workflow = await (this.prisma as any).workflow.findFirst({
      where: { id: workflowId, companyId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    if (workflow.status !== 'ACTIVE') {
      throw new BadRequestException('Workflow is not active');
    }

    const run = await (this.prisma as any).workflowRun.create({
      data: {
        workflowId,
        companyId,
        triggeredBy: performedBy,
        context,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      const steps = JSON.parse(workflow.steps || '[]');
      let currentStep = 0;
      const results: any[] = [];

      for (const step of steps) {
        currentStep++;
        const stepResult = await this.executeStep(companyId, run.id, step, context, currentStep);
        results.push(stepResult);

        if (stepResult.status === 'FAILED') {
          await (this.prisma as any).workflowRun.update({
            where: { id: run.id },
            data: { status: 'FAILED', completedAt: new Date(), error: stepResult.error },
          });
          return { runId: run.id, status: 'FAILED', step: currentStep, results };
        }
      }

      await (this.prisma as any).workflowRun.update({
        where: { id: run.id },
        data: { status: 'COMPLETED', completedAt: new Date(), results },
      });

      await this.audit.log({
        companyId, userId: performedBy, action: 'WORKFLOW_EXECUTED',
        entity: 'WorkflowRun', entityId: run.id,
        newValue: { workflowId, stepsCount: steps.length },
      });

      return { runId: run.id, status: 'COMPLETED', results };
    } catch (error: any) {
      await (this.prisma as any).workflowRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', completedAt: new Date(), error: error.message },
      });
      throw error;
    }
  }

  private async executeStep(companyId: string, runId: string, step: any, context: any, stepNumber: number) {
    const startTime = Date.now();
    try {
      let output: any = null;

      switch (step.type) {
        case 'NOTIFICATION':
          output = { type: 'NOTIFICATION_SENT', channel: step.config?.channel || 'IN_APP' };
          break;
        case 'STATUS_UPDATE':
          output = { type: 'STATUS_UPDATED', entity: step.config?.entity, field: step.config?.field };
          break;
        case 'HTTP_CALL':
          output = { type: 'HTTP_CALLED', url: step.config?.url, method: step.config?.method || 'POST' };
          break;
        case 'DELAY':
          output = { type: 'DELAYED', duration: step.config?.duration || 0 };
          break;
        default:
          output = { type: 'UNKNOWN_STEP', stepType: step.type };
      }

      await (this.prisma as any).workflowStepLog.create({
        data: {
          workflowRunId: runId,
          stepNumber,
          stepType: step.type,
          status: 'COMPLETED',
          input: step.config,
          output,
          startedAt: new Date(startTime),
          completedAt: new Date(),
        },
      });

      return { step: stepNumber, status: 'COMPLETED', ...output };
    } catch (error: any) {
      await (this.prisma as any).workflowStepLog.create({
        data: {
          workflowRunId: runId,
          stepNumber,
          stepType: step.type,
          status: 'FAILED',
          input: step.config,
          error: error.message,
          startedAt: new Date(startTime),
          completedAt: new Date(),
        },
      });

      return { step: stepNumber, status: 'FAILED', error: error.message };
    }
  }

  async getWorkflowRuns(companyId: string, workflowId: string, params: { page?: number; limit?: number; status?: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (workflowId) where.workflowId = workflowId;
    if (params.status) where.status = params.status;

    const [runs, total] = await Promise.all([
      (this.prisma as any).workflowRun.findMany({
        where, skip, take: limit,
        include: { workflow: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).workflowRun.count({ where }),
    ]);

    return {
      data: runs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async pauseWorkflow(companyId: string, workflowId: string, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const workflow = await (this.prisma as any).workflow.findFirst({
      where: { id: workflowId, companyId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    if (workflow.status === 'PAUSED') {
      throw new BadRequestException('Workflow is already paused');
    }

    const updated = await (this.prisma as any).workflow.update({
      where: { id: workflowId },
      data: { status: 'PAUSED', pausedAt: new Date(), pausedBy: performedBy },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'WORKFLOW_PAUSED',
      entity: 'Workflow', entityId: workflowId,
    });

    return updated;
  }

  async resumeWorkflow(companyId: string, workflowId: string, performedBy: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const workflow = await (this.prisma as any).workflow.findFirst({
      where: { id: workflowId, companyId },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    if (workflow.status !== 'PAUSED') {
      throw new BadRequestException('Workflow is not paused');
    }

    const updated = await (this.prisma as any).workflow.update({
      where: { id: workflowId },
      data: { status: 'ACTIVE', resumedAt: new Date(), resumedBy: performedBy },
    });

    await this.audit.log({
      companyId, userId: performedBy, action: 'WORKFLOW_RESUMED',
      entity: 'Workflow', entityId: workflowId,
    });

    return updated;
  }
}
