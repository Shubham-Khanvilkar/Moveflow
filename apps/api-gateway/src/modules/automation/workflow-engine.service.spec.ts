import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let prisma: any;
  let audit: any;

  const mockPrisma = {
    isConnected: jest.fn().mockReturnValue(true),
    workflow: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    workflowRun: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    workflowStepLog: {
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
        WorkflowEngineService,
        { provide: 'PrismaService', useValue: prisma },
        { provide: 'AuditService', useValue: audit },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWorkflow', () => {
    it('should throw ServiceUnavailableException when DB not connected', async () => {
      prisma.isConnected.mockReturnValue(false);
      await expect(service.executeWorkflow('comp1', 'wf1', {}, 'user1'))
        .rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);
      await expect(service.executeWorkflow('comp1', 'wf1', {}, 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when workflow not active', async () => {
      prisma.workflow.findFirst.mockResolvedValue({ id: 'wf1', status: 'PAUSED', steps: '[]' });
      await expect(service.executeWorkflow('comp1', 'wf1', {}, 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should execute workflow successfully with NOTIFICATION step', async () => {
      const workflow = { id: 'wf1', status: 'ACTIVE', steps: JSON.stringify([{ type: 'NOTIFICATION', config: { channel: 'EMAIL' } }]) };
      prisma.workflow.findFirst.mockResolvedValue(workflow);
      prisma.workflowRun.create.mockResolvedValue({ id: 'run1', workflowId: 'wf1', companyId: 'comp1', status: 'RUNNING' });
      prisma.workflowRun.update.mockResolvedValue({});
      prisma.workflowStepLog.create.mockResolvedValue({});

      const result = await service.executeWorkflow('comp1', 'wf1', { key: 'value' }, 'user1');

      expect(result).toEqual(expect.objectContaining({ runId: 'run1', status: 'COMPLETED' }));
      expect(prisma.workflowRun.create).toHaveBeenCalled();
      expect(prisma.workflowRun.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'run1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }));
    });

    it('should handle step failure and mark run as FAILED', async () => {
      const workflow = { id: 'wf1', status: 'ACTIVE', steps: JSON.stringify([{ type: 'INVALID_STEP' }]) };
      prisma.workflow.findFirst.mockResolvedValue(workflow);
      prisma.workflowRun.create.mockResolvedValue({ id: 'run1', workflowId: 'wf1', companyId: 'comp1', status: 'RUNNING' });
      prisma.workflowRun.update.mockResolvedValue({});
      prisma.workflowStepLog.create.mockResolvedValue({});

      const result = await service.executeWorkflow('comp1', 'wf1', {}, 'user1');

      expect(result.status).toBe('FAILED');
      expect(result.step).toBe(1);
    });
  });

  describe('getWorkflowRuns', () => {
    it('should return paginated workflow runs', async () => {
      prisma.workflowRun.findMany.mockResolvedValue([{ id: 'run1', workflow: { id: 'wf1', name: 'Test' } }]);
      prisma.workflowRun.count.mockResolvedValue(1);

      const result = await service.getWorkflowRuns('comp1', 'wf1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should throw ServiceUnavailableException when DB not connected', async () => {
      prisma.isConnected.mockReturnValue(false);
      await expect(service.getWorkflowRuns('comp1', 'wf1', {}))
        .rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('pauseWorkflow', () => {
    it('should throw NotFoundException when workflow not found', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);
      await expect(service.pauseWorkflow('comp1', 'wf1', 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already paused', async () => {
      prisma.workflow.findFirst.mockResolvedValue({ id: 'wf1', status: 'PAUSED' });
      await expect(service.pauseWorkflow('comp1', 'wf1', 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should pause workflow successfully', async () => {
      prisma.workflow.findFirst.mockResolvedValue({ id: 'wf1', status: 'ACTIVE' });
      prisma.workflow.update.mockResolvedValue({ id: 'wf1', status: 'PAUSED' });

      const result = await service.pauseWorkflow('comp1', 'wf1', 'user1');

      expect(result.status).toBe('PAUSED');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'WORKFLOW_PAUSED' }));
    });
  });

  describe('resumeWorkflow', () => {
    it('should throw NotFoundException when workflow not found', async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);
      await expect(service.resumeWorkflow('comp1', 'wf1', 'user1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when not paused', async () => {
      prisma.workflow.findFirst.mockResolvedValue({ id: 'wf1', status: 'ACTIVE' });
      await expect(service.resumeWorkflow('comp1', 'wf1', 'user1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should resume workflow successfully', async () => {
      prisma.workflow.findFirst.mockResolvedValue({ id: 'wf1', status: 'PAUSED' });
      prisma.workflow.update.mockResolvedValue({ id: 'wf1', status: 'ACTIVE' });

      const result = await service.resumeWorkflow('comp1', 'wf1', 'user1');

      expect(result.status).toBe('ACTIVE');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'WORKFLOW_RESUMED' }));
    });
  });
});