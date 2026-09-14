import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, TEST_COMPANY, TEST_VEHICLE } from '../../../test/test-utils';

describe('VehicleService', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVehicle', () => {
    it('should create a vehicle with defaults', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({
        id: 'veh-1',
        companyId: TEST_COMPANY.id,
        registrationNo: 'MH-01-ABC',
        vehicleType: 'SEDAN',
        capacity: 4,
        acType: 'NON_AC',
        fuelType: 'PETROL',
        ownershipType: 'COMPANY_OWNED',
        isEV: false,
        status: 'PENDING_VERIFICATION',
        vendor: null,
      });

      const result: any = await service.createVehicle(TEST_COMPANY.id, 'admin-1', {
        registrationNo: 'MH-01-ABC',
        vehicleType: 'SEDAN',
      });

      expect(result.status).toBe('PENDING_VERIFICATION');
      expect(result.capacity).toBe(4);
      expect(result.acType).toBe('NON_AC');
      expect(result.fuelType).toBe('PETROL');
      expect(prisma.vehicle.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'VEHICLE_CREATED' }));
    });

    it('should throw ConflictException for duplicate registrationNo', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'existing', registrationNo: 'MH-01-ABC' });

      await expect(
        service.createVehicle(TEST_COMPANY.id, 'admin-1', {
          registrationNo: 'MH-01-ABC',
          vehicleType: 'SEDAN',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use provided values over defaults', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({
        id: 'veh-2',
        capacity: 6,
        acType: 'AC',
        fuelType: 'DIESEL',
        ownershipType: 'VENDOR_OWNED',
        isEV: true,
        status: 'PENDING_VERIFICATION',
        vendor: null,
      });

      const result: any = await service.createVehicle(TEST_COMPANY.id, 'admin-1', {
        registrationNo: 'MH-02-XYZ',
        vehicleType: 'SUV',
        capacity: 6,
        acType: 'AC',
        fuelType: 'DIESEL',
        ownershipType: 'VENDOR_OWNED',
        isEV: true,
      });

      expect(result.capacity).toBe(6);
      expect(result.acType).toBe('AC');
    });
  });

  describe('listVehicles', () => {
    it('should return paginated vehicles', async () => {
      prisma.vehicle.findMany.mockResolvedValue([{ id: 'v1', registrationNo: 'MH-01' }]);
      prisma.vehicle.count.mockResolvedValue(1);

      const result = await service.listVehicles(TEST_COMPANY.id, {});

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should cap limit at 100', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);
      prisma.vehicle.count.mockResolvedValue(0);

      await service.listVehicles(TEST_COMPANY.id, { limit: 200 });

      const findManyCall = prisma.vehicle.findMany.mock.calls[0][0];
      expect(findManyCall.take).toBe(100);
    });

    it('should apply search filter with OR', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);
      prisma.vehicle.count.mockResolvedValue(0);

      await service.listVehicles(TEST_COMPANY.id, { search: 'MH' });

      const findManyCall = prisma.vehicle.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR.length).toBe(3);
    });
  });

  describe('getVehicle', () => {
    it('should return a vehicle by ID', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', registrationNo: 'MH-01' });

      const result = await service.getVehicle(TEST_COMPANY.id, 'v1');
      expect(result.id).toBe('v1');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.getVehicle(TEST_COMPANY.id, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVehicle', () => {
    it('should update whitelisted fields', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', make: 'Toyota' });

      const result = await service.updateVehicle(TEST_COMPANY.id, 'admin-1', 'v1', {
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
      });

      expect(prisma.vehicle.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.updateVehicle(TEST_COMPANY.id, 'admin-1', 'nonexistent', { make: 'Toyota' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteVehicle', () => {
    it('should delete a vehicle', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id, status: 'AVAILABLE' });
      prisma.vehicle.delete.mockResolvedValue({ id: 'v1' });

      const result = await service.deleteVehicle(TEST_COMPANY.id, 'admin-1', 'v1');
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.deleteVehicle(TEST_COMPANY.id, 'admin-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should reject deletion of ON_TRIP vehicle', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id, status: 'ON_TRIP' });

      await expect(service.deleteVehicle(TEST_COMPANY.id, 'admin-1', 'v1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyVehicle', () => {
    it('should transition PENDING_VERIFICATION to AVAILABLE', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id, status: 'PENDING_VERIFICATION' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });

      const result = await service.verifyVehicle(TEST_COMPANY.id, 'admin-1', 'v1');
      expect(result.status).toBe('AVAILABLE');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'VEHICLE_AVAILABLE' }));
    });
  });

  describe('blockVehicle', () => {
    it('should transition AVAILABLE to BLOCKED', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id, status: 'AVAILABLE' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'BLOCKED' });

      const result = await service.blockVehicle(TEST_COMPANY.id, 'admin-1', 'v1', 'Maintenance needed');
      expect(result.status).toBe('BLOCKED');
    });
  });

  describe('unblockVehicle', () => {
    it('should transition BLOCKED to AVAILABLE', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id, status: 'BLOCKED' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });

      const result = await service.unblockVehicle(TEST_COMPANY.id, 'admin-1', 'v1');
      expect(result.status).toBe('AVAILABLE');
    });
  });

  describe('retireVehicle', () => {
    it('should transition AVAILABLE to RETIRED', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', companyId: TEST_COMPANY.id, status: 'AVAILABLE' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'RETIRED' });

      const result = await service.retireVehicle(TEST_COMPANY.id, 'admin-1', 'v1');
      expect(result.status).toBe('RETIRED');
    });
  });

  describe('checkCompliance', () => {
    it('should return eligible when all documents are valid', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });
      prisma.complianceDocument.findMany.mockResolvedValue([
        { documentType: 'REGISTRATION', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
        { documentType: 'INSURANCE', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
        { documentType: 'PUC', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
        { documentType: 'PERMIT', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
        { documentType: 'FITNESS_CERTIFICATE', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
      ]);

      const result = await service.checkCompliance(TEST_COMPANY.id, 'v1');
      expect(result.eligible).toBe(true);
      expect(result.blockingReasons).toHaveLength(0);
    });

    it('should block when vehicle status is BREAKDOWN', async () => {
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', status: 'BREAKDOWN' });
      prisma.complianceDocument.findMany.mockResolvedValue([]);

      const result = await service.checkCompliance(TEST_COMPANY.id, 'v1');
      expect(result.eligible).toBe(false);
      expect(result.blockingReasons.some((r: any) => r.code === 'VEHICLE_STATUS_BLOCKED')).toBe(true);
    });

    it('should warn about expiring documents', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });
      prisma.complianceDocument.findMany.mockResolvedValue([
        { documentType: 'REGISTRATION', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
        { documentType: 'INSURANCE', expiryDate, verificationStatus: 'APPROVED' },
        { documentType: 'PUC', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
        { documentType: 'PERMIT', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
        { documentType: 'FITNESS_CERTIFICATE', expiryDate: new Date('2027-01-01'), verificationStatus: 'APPROVED' },
      ]);

      const result = await service.checkCompliance(TEST_COMPANY.id, 'v1');
      expect(result.warnings.some((w: any) => w.code === 'INSURANCE_EXPIRING')).toBe(true);
    });
  });

  describe('parseVehicleCSV', () => {
    it('should parse valid CSV', () => {
      const csv = 'registration_no,vehicle_type,capacity\nMH-01-ABC,SEDAN,4\nMH-02-DEF,SUV,6\n';
      const result = service.parseVehicleCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0].registration_no).toBe('MH-01-ABC');
      expect(result[0].capacity).toBe(4);
    });

    it('should throw for too few lines', () => {
      expect(() => service.parseVehicleCSV('header1,header2\n')).toThrow(BadRequestException);
    });
  });

  describe('bulkImportVehicles', () => {
    it('should create vehicles in non-dry-run mode', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({ id: 'new-veh', status: 'PENDING_VERIFICATION' });

      const csv = 'registration_no,vehicle_type\nMH-NEW-001,SEDAN\n';
      const result = await service.bulkImportVehicles(TEST_COMPANY.id, 'admin-1', csv, false);

      expect(result.created).toBe(1);
      expect(result.totalRows).toBe(1);
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });

    it('should not write to DB in dry-run mode', async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      const csv = 'registration_no,vehicle_type\nMH-NEW-001,SEDAN\n';
      const result = await service.bulkImportVehicles(TEST_COMPANY.id, 'admin-1', csv, true);

      expect(result.dryRun).toBe(true);
      expect(result.created).toBe(1);
      expect(prisma.vehicle.create).not.toHaveBeenCalled();
    });
  });

  describe('uploadDocument', () => {
    it('should create a compliance document', async () => {
      prisma.complianceDocument.create.mockResolvedValue({
        id: 'doc-1',
        documentType: 'INSURANCE',
        status: 'UPLOADED',
        verificationStatus: 'PENDING',
      });

      const result = await service.uploadDocument(TEST_COMPANY.id, 'admin-1', 'v1', {
        documentType: 'INSURANCE',
        documentNumber: 'INS-001',
        fileName: 'insurance.pdf',
        fileUrl: '/files/insurance.pdf',
      });

      expect(result.status).toBe('UPLOADED');
      expect(result.verificationStatus).toBe('PENDING');
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'VEHICLE_DOCUMENT_UPLOADED' }));
    });
  });

  describe('createInspection', () => {
    it('should create inspection with PRE_TRIP default', async () => {
      prisma.vehicleInspection.create.mockResolvedValue({
        id: 'insp-1',
        inspectionType: 'PRE_TRIP',
        passed: true,
      });

      const result: any = await service.createInspection(TEST_COMPANY.id, 'admin-1', 'v1', {
        checklist: [{ item: 'Tires', status: 'PASS' }],
      });

      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should fail inspection and set vehicle to MAINTENANCE_REQUIRED when FAIL items', async () => {
      prisma.vehicleInspection.create.mockResolvedValue({
        id: 'insp-2',
        inspectionType: 'PRE_TRIP',
        passed: false,
      });
      prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1', status: 'AVAILABLE' });
      prisma.vehicle.update.mockResolvedValue({ id: 'v1', status: 'MAINTENANCE_REQUIRED' });

      const result: any = await service.createInspection(TEST_COMPANY.id, 'admin-1', 'v1', {
        checklist: [{ item: 'Tires', status: 'FAIL', notes: 'Worn out' }],
      });

      expect(result).toBeDefined();
      expect(prisma.vehicle.update).toHaveBeenCalled();
    });
  });
});
