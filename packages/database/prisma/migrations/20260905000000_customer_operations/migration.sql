-- CreateEnum
CREATE TYPE "AddressTypeCustomer" AS ENUM ('PRIMARY', 'SECONDARY', 'TEMPORARY', 'ALTERNATE');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('REGULAR', 'OVERNIGHT', 'AD_HOC');

-- CreateEnum
CREATE TYPE "AdHocStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VehicleUsageType" AS ENUM ('CAB', 'SHUTTLE');

-- CreateEnum
CREATE TYPE "VehicleFuelTypeMaster" AS ENUM ('CNG', 'DIESEL', 'PETROL', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "AddressVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "VehicleTypeRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "usageType" "VehicleUsageType" NOT NULL DEFAULT 'CAB',
    "totalCapacity" INTEGER NOT NULL,
    "fuelType" "VehicleFuelTypeMaster" NOT NULL DEFAULT 'PETROL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTypeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftBufferPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "processId" TEXT,
    "shiftId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'COMPANY',
    "loginArrivalBuffer" INTEGER NOT NULL DEFAULT 15,
    "logoutDepartureBuffer" INTEGER NOT NULL DEFAULT 30,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftBufferPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlotConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "timeOptions" JSONB,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleOfficeAssignment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleOfficeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportScheduleConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "allowMultipleAdditional" BOOLEAN NOT NULL DEFAULT false,
    "maxAdditionalMovementsPerDay" INTEGER NOT NULL DEFAULT 2,
    "allowAdHocShifts" BOOLEAN NOT NULL DEFAULT true,
    "adHocShiftApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowOvernightShifts" BOOLEAN NOT NULL DEFAULT true,
    "bookingCutoffMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "vehicleTypeId" TEXT,
ADD COLUMN "garageName" TEXT,
ADD COLUMN "deviceImei" TEXT,
ADD COLUMN "deviceLastContactTime" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleTypeRecord_companyId_name_key" ON "VehicleTypeRecord"("companyId", "name");

-- CreateIndex
CREATE INDEX "VehicleTypeRecord_companyId_idx" ON "VehicleTypeRecord"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeHistory_companyId_userId_idx" ON "EmployeeHistory"("companyId", "userId");

-- CreateIndex
CREATE INDEX "EmployeeHistory_companyId_action_idx" ON "EmployeeHistory"("companyId", "action");

-- CreateIndex
CREATE INDEX "EmployeeHistory_createdAt_idx" ON "EmployeeHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ShiftBufferPolicy_companyId_level_idx" ON "ShiftBufferPolicy"("companyId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlotConfig_companyId_key" ON "TimeSlotConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOfficeAssignment_vehicleId_officeId_key" ON "VehicleOfficeAssignment"("vehicleId", "officeId");

-- CreateIndex
CREATE INDEX "VehicleOfficeAssignment_vehicleId_idx" ON "VehicleOfficeAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleOfficeAssignment_officeId_idx" ON "VehicleOfficeAssignment"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportScheduleConfig_companyId_key" ON "TransportScheduleConfig"("companyId");

-- AddForeignKey
ALTER TABLE "VehicleTypeRecord" ADD CONSTRAINT "VehicleTypeRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHistory" ADD CONSTRAINT "EmployeeHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftBufferPolicy" ADD CONSTRAINT "ShiftBufferPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlotConfig" ADD CONSTRAINT "TimeSlotConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOfficeAssignment" ADD CONSTRAINT "VehicleOfficeAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOfficeAssignment" ADD CONSTRAINT "VehicleOfficeAssignment_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportScheduleConfig" ADD CONSTRAINT "TransportScheduleConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleTypeRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
