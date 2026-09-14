import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY } from '../../../test/test-utils';

describe('Vehicle Integration', () => {
  let service: VehicleService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(VehicleService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Full CRUD Lifecycle', () => {
    const companyId = TEST_COMPANY.id;
    const adminId = 'admin-1';

    it('should complete create → get → update → verify → list cycle', async () => {
      // Create
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({
        id: 'veh-new',
        companyId,
        registrationNo: 'MH-INT-001',
        vehicleType: 'SEDAN',
        capacity: 4,
        status: 'PENDING_VERIFICATION',
        vendor: null,
      });

      const created = await service.createVehicle(companyId, adminId, {
        registrationNo: 'MH-INT-001',
        vehicleType: 'SEDAN',
      });
      expect(created.id).toBe('veh-new');
      expect(created.status).toBe('PENDING_VERIFICATION');

      // Get
      prisma.vehicle.findFirst.mockResolvedValue(created);
      const fetched = await service.getVehicle(companyId, 'veh-new');
      expect(fetched.registrationNo).toBe('MH-INT-001');

      // Update
      prisma.vehicle.findFirst.mockResolvedValue({ ...created, companyId });
      prisma.vehicle.update.mockResolvedValue({ ...created, make: 'Toyota' });
      const updated: any = await service.updateVehicle(companyId, adminId, 'veh-new', { make: 'Toyota' });
      expect(updated).toBeDefined();

      // Verify (PENDING_VERIFICATION → AVAILABLE)
      prisma.vehicle.findFirst.mockResolvedValue({ ...created, companyId });
      prisma.vehicle.update.mockResolvedValue({ ...created, status: 'AVAILABLE' });
      const verified = await service.verifyVehicle(companyId, adminId, 'veh-new');
      expect(verified.status).toBe('AVAILABLE');

      // List
      prisma.vehicle.findMany.mockResolvedValue([verified]);
      prisma.vehicle.count.mockResolvedValue(1);
      const listed = await service.listVehicles(companyId, {});
      expect(listed.data).toHaveLength(1);
    });
  });

  describe('Status Transitions', () => {
    it('should enforce valid transitions and reject invalid ones', async () => {
      // AVAILABLE → BLOCKED (valid)
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v1', companyId: TEST_COMPANY.id, status: 'AVAILABLE',
      });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'BLOCKED' });

      const blocked = await service.blockVehicle(TEST_COMPANY.id, 'admin-1', 'v1');
      expect(blocked.status).toBe('BLOCKED');

      // BLOCKED → AVAILABLE (valid)
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v1', companyId: TEST_COMPANY.id, status: 'BLOCKED',
      });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });

      const unblocked = await service.unblockVehicle(TEST_COMPANY.id, 'admin-1', 'v1');
      expect(unblocked.status).toBe('AVAILABLE');

      // AVAILABLE → RETIRED (valid, terminal)
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v1', companyId: TEST_COMPANY.id, status: 'AVAILABLE',
      });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'RETIRED' });

      const retired = await service.retireVehicle(TEST_COMPANY.id, 'admin-1', 'v1');
      expect(retired.status).toBe('RETIRED');
    });
  });

  describe('Bulk Import', () => {
    it('should validate and import vehicles from CSV', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({
        id: 'new-veh',
        registrationNo: 'MH-IMPORT-001',
        status: 'PENDING_VERIFICATION',
      });

      const csv = 'registration_no,vehicle_type,capacity\nMH-IMPORT-001,SEDAN,4\n';
      const result = await service.bulkImportVehicles(TEST_COMPANY.id, 'admin-1', csv, false);

      expect(result.totalRows).toBe(1);
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject CSV with missing required fields', async () => {
      const csv = 'registration_no\nMH-001\n';
      const result = await service.bulkImportVehicles(TEST_COMPANY.id, 'admin-1', csv, false);

      expect(result.status).toBe('VALIDATION_FAILED');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should not write to database in dry-run mode', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      const csv = 'registration_no,vehicle_type\nMH-DRY-001,SEDAN\n';
      const result = await service.bulkImportVehicles(TEST_COMPANY.id, 'admin-1', csv, true);

      expect(result.dryRun).toBe(true);
      expect(prisma.vehicle.create).not.toHaveBeenCalled();
    });
  });

  describe('Compliance Check', () => {
    it('should return eligible when all required documents are valid', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v1', status: 'AVAILABLE',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([
        { documentType: 'REGISTRATION', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
        { documentType: 'INSURANCE', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
        { documentType: 'PUC', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
        { documentType: 'PERMIT', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
        { documentType: 'FITNESS_CERTIFICATE', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
      ]);

      const result = await service.checkCompliance(TEST_COMPANY.id, 'v1');
      expect(result.eligible).toBe(true);
      expect(result.blockingReasons).toHaveLength(0);
      expect(result.documentCount).toBe(5);
    });

    it('should block when vehicle is in BREAKDOWN status', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v1', status: 'BREAKDOWN',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([]);

      const result = await service.checkCompliance(TEST_COMPANY.id, 'v1');
      expect(result.eligible).toBe(false);
      expect(result.blockingReasons.some((r: any) => r.code === 'VEHICLE_STATUS_BLOCKED')).toBe(true);
    });

    it('should warn about expiring documents within 60 days', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);

      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'v1', status: 'AVAILABLE',
      });
      prisma.complianceDocument.findMany.mockResolvedValue([
        { documentType: 'REGISTRATION', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
        { documentType: 'INSURANCE', expiryDate: soon, verificationStatus: 'APPROVED' },
        { documentType: 'PUC', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
        { documentType: 'PERMIT', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
        { documentType: 'FITNESS_CERTIFICATE', expiryDate: new Date('2027-12-31'), verificationStatus: 'APPROVED' },
      ]);

      const result = await service.checkCompliance(TEST_COMPANY.id, 'v1');
      expect(result.warnings.some((w: any) => w.code === 'INSURANCE_EXPIRING')).toBe(true);
    });
  });

  describe('Document Lifecycle', () => {
    it('should upload → verify → reject documents', async () => {
      // Upload
      prisma.complianceDocument.create.mockResolvedValue({
        id: 'doc-1',
        documentType: 'INSURANCE',
        status: 'UPLOADED',
        verificationStatus: 'PENDING',
      });

      const uploaded = await service.uploadDocument(TEST_COMPANY.id, 'admin-1', 'v1', {
        documentType: 'INSURANCE',
        documentNumber: 'INS-001',
        fileName: 'insurance.pdf',
        fileUrl: '/files/insurance.pdf',
      });
      expect(uploaded.status).toBe('UPLOADED');

      // Verify
      prisma.complianceDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        companyId: TEST_COMPANY.id,
        status: 'UPLOADED',
      });
      prisma.complianceDocument.update.mockResolvedValue({
        id: 'doc-1',
        status: 'VERIFIED',
        verificationStatus: 'APPROVED',
      });

      const verified = await service.verifyDocument(TEST_COMPANY.id, 'admin-1', 'doc-1');
      expect(verified.status).toBe('VERIFIED');
    });
  });

  describe('Maintenance Lifecycle', () => {
    it('should create → start → complete maintenance', async () => {
      prisma.vehicleMaintenance.create.mockResolvedValue({
        id: 'maint-1',
        maintenanceType: 'SCHEDULED',
        status: 'SCHEDULED',
      });

      const created = await service.createMaintenance(TEST_COMPANY.id, 'admin-1', 'v1', {
        maintenanceType: 'SCHEDULED',
        description: 'Oil change',
      });
      expect(created.status).toBe('SCHEDULED');

      prisma.vehicleMaintenance.findFirst.mockResolvedValue({ id: 'maint-1' });
      prisma.vehicleMaintenance.update.mockResolvedValue({ id: 'maint-1', status: 'IN_PROGRESS' });
      prisma.vehicle.update.mockResolvedValue({});

      const started = await service.startMaintenance(TEST_COMPANY.id, 'admin-1', 'maint-1');
      expect(started.status).toBe('IN_PROGRESS');

      prisma.vehicleMaintenance.findFirst.mockResolvedValue({ id: 'maint-1' });
      prisma.vehicleMaintenance.update.mockResolvedValue({ id: 'maint-1', status: 'COMPLETED' });
      prisma.vehicle.update.mockResolvedValue({});

      const completed = await service.completeMaintenance(TEST_COMPANY.id, 'admin-1', 'maint-1', {
        actualCost: 2500,
      });
      expect(completed.status).toBe('COMPLETED');
    });
  });

  describe('Breakdown Reporting', () => {
    it('should report breakdown and set vehicle status', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'BREAKDOWN' });
      prisma.vehicleBreakdown.create.mockResolvedValue({
        id: 'bd-1',
        vehicleId: 'v1',
        status: 'REPORTED',
      });

      const result = await service.reportBreakdown(TEST_COMPANY.id, 'admin-1', 'v1', {
        reason: 'Engine failure',
        description: 'Car stopped working',
      });

      expect(result.status).toBe('REPORTED');
      expect(prisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'BREAKDOWN' }) }),
      );
    });
  });
});
