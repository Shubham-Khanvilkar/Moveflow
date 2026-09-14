-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('DRAFT', 'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('NONE', 'PENDING_VERIFYING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN', 'DISPATCHER', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE', 'DRIVER', 'GUARD');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITED', 'LEFT');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "TransportEligibility" AS ENUM ('ELIGIBLE', 'INELIGIBLE', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAB', 'SEDAN', 'SUV', 'VAN', 'SHUTTLE', 'BUS');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'CNG', 'OTHER');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('COMPANY_OWNED', 'VENDOR_OWNED', 'LEASED', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargingStatus" AS ENUM ('NOT_APPLICABLE', 'CHARGING', 'AVAILABLE', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'BREAKDOWN', 'MAINTENANCE_REQUIRED', 'UNDER_REPAIR', 'MAINTENANCE_CLEARED', 'BLOCKED', 'RETIRED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "DriverAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_VERIFICATION', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriverAvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'ON_TRIP', 'ON_BREAK', 'OFF_DUTY', 'EMERGENCY', 'MAINTENANCE_SUPPORT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CAB', 'SHUTTLE', 'BUS');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('CAB', 'SHUTTLE', 'BUS');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISPATCHING', 'ASSIGNED', 'DRIVER_CONFIRMED', 'EN_ROUTE', 'ARRIVED', 'BOARDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ShuttleBookingStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED', 'BOARDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ApprovalEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'BOARDING', 'IN_TRANSIT', 'ARRIVED_AT_DROP', 'COMPLETED', 'CANCELLED', 'DELAYED');

-- CreateEnum
CREATE TYPE "BoardingStatus" AS ENUM ('SCHEDULED', 'BOARDED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BoardingAction" AS ENUM ('BOARD', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BoardingMethod" AS ENUM ('MANUAL', 'QR', 'OTP');

-- CreateEnum
CREATE TYPE "GeofenceType" AS ENUM ('PICKUP_OFFICE', 'DEPOT', 'RESTRICTED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GeofenceAction" AS ENUM ('ENTER', 'EXIT');

-- CreateEnum
CREATE TYPE "SOSStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('ACCIDENT', 'VEHICLE_BREAKDOWN', 'DRIVER_ISSUE', 'PASSENGER_ISSUE', 'GPS_FAILURE', 'ROUTE_BLOCKED', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'ASSIGNED', 'INVESTIGATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'DRIVER_ASSIGNED', 'VEHICLE_APPROACHING', 'VEHICLE_ARRIVED', 'TRIP_DELAYED', 'TRIP_COMPLETED', 'BOOKING_CANCELLED', 'SOS_ALERT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "SavedLocationType" AS ENUM ('HOME', 'OFFICE', 'PICKUP_POINT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LocationApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RoundingMode" AS ENUM ('ROUND_TO_NEAREST_1', 'ROUND_TO_NEAREST_5', 'ROUND_TO_NEAREST_10', 'NO_ROUNDING');

-- CreateEnum
CREATE TYPE "TollPolicy" AS ENUM ('NOT_INCLUDED', 'INCLUDED', 'VENDOR_REPORTED', 'MANUALLY_ENTERED');

-- CreateEnum
CREATE TYPE "ParkingPolicy" AS ENUM ('NOT_INCLUDED', 'INCLUDED', 'VENDOR_REPORTED', 'MANUALLY_ENTERED');

-- CreateEnum
CREATE TYPE "AcType" AS ENUM ('AC', 'NON_AC');

-- CreateEnum
CREATE TYPE "NightChargeType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'PER_KM');

-- CreateEnum
CREATE TYPE "TripCostStatus" AS ENUM ('ESTIMATED', 'FINAL', 'DISPUTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComplianceEntityType" AS ENUM ('DRIVER', 'VEHICLE', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "ComplianceDocumentType" AS ENUM ('DRIVING_LICENSE', 'PUC', 'INSURANCE', 'PERMIT', 'FITNESS_CERTIFICATE', 'REGISTRATION_CERTIFICATE', 'EMPLOYEE_ID_PROOF', 'CORPORATE_ID', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceDocStatus" AS ENUM ('UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ComplianceVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DriverOnboardingStatus" AS ENUM ('DRAFT', 'DOCUMENTS_PENDING', 'UNDER_REVIEW', 'ACTIVE', 'SUSPENDED', 'COMPLIANCE_HOLD', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplianceScore" AS ENUM ('COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "VehicleOnboardingStatus" AS ENUM ('DRAFT', 'DOCUMENTS_PENDING', 'UNDER_REVIEW', 'ACTIVE', 'COMPLIANCE_HOLD', 'MAINTENANCE', 'SUSPENDED', 'RETIRED');

-- CreateEnum
CREATE TYPE "EmployeeOnboardingStatus" AS ENUM ('DRAFT', 'INVITED', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ComplianceAlertType" AS ENUM ('DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'DOCUMENT_REJECTED', 'DOCUMENT_PENDING_REVIEW', 'DRIVER_COMPLIANCE_HOLD', 'VEHICLE_COMPLIANCE_HOLD', 'LICENSE_EXPIRING', 'INSURANCE_EXPIRING', 'PUC_EXPIRING', 'PERMIT_EXPIRING', 'FITNESS_EXPIRING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "VendorOnboardingStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RecurringPattern" AS ENUM ('DAILY', 'WEEKDAYS', 'SELECTED_DAYS', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('PICKUP', 'DROP', 'NODAL_PICKUP', 'NODAL_DROP', 'OFFICE');

-- CreateEnum
CREATE TYPE "TripStopStatus" AS ENUM ('PENDING', 'APPROACHING', 'ARRIVED', 'BOARDING', 'COMPLETED', 'SKIPPED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "DispatchType" AS ENUM ('ORIGINAL', 'REPLACEMENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReplacementStatus" AS ENUM ('FINDING', 'CANDIDATE_FOUND', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TRANSFER_IN_PROGRESS', 'TRANSFERRED', 'COMPLETED', 'DECLINED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeviationStatus" AS ENUM ('DETECTED', 'UNDER_REVIEW', 'EXPLAINED', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "BanStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'REMOVAL_REQUESTED', 'MANAGER_APPROVAL_PENDING', 'DIRECTOR_APPROVAL_PENDING', 'APPROVED_FOR_REMOVAL', 'REJECTED', 'REMOVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BanRemovalStatus" AS ENUM ('SUBMITTED', 'MANAGER_APPROVAL_PENDING', 'DIRECTOR_APPROVAL_PENDING', 'EMAIL_SENT', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalMethod" AS ENUM ('IN_APP', 'EMAIL', 'ADMIN_OVERRIDE');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'PENDING');

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('LATE_PICKUP', 'DRIVER_BEHAVIOR', 'VEHICLE_CONDITION', 'SAFETY', 'ROUTE', 'BILLING', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LostFoundStatus" AS ENUM ('REPORTED', 'FOUND', 'HANDOVER_IN_PROGRESS', 'HANDED_OVER', 'CLOSED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('PRE_TRIP', 'POST_TRIP', 'MAINTENANCE', 'BREAKDOWN', 'PERIODIC');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('SCHEDULED_SERVICE', 'INSPECTION', 'REPAIR', 'TYRE', 'BATTERY', 'BRAKES', 'BREAKDOWN_REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "EligibilityStatus" AS ENUM ('ELIGIBLE', 'INELIGIBLE', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('CIRCLE', 'POLYGON', 'ZONE', 'RADIUS');

-- CreateEnum
CREATE TYPE "PreferenceLevel" AS ENUM ('PRIMARY', 'PREFERRED', 'SECONDARY');

-- CreateEnum
CREATE TYPE "DriverPreferenceMode" AS ENUM ('STRICT_PREFERENCE', 'BALANCED', 'FLEXIBLE');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "favicon" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "status" "CompanyStatus" NOT NULL DEFAULT 'DRAFT',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "currency" TEXT DEFAULT 'INR',
    "distanceUnit" TEXT DEFAULT 'KM',
    "brandName" TEXT,
    "primaryColor" TEXT DEFAULT '#2563EB',
    "secondaryColor" TEXT DEFAULT '#1E40AF',
    "customDomain" TEXT,
    "domainStatus" "DomainStatus" NOT NULL DEFAULT 'NONE',
    "domainVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "buId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "platformName" TEXT NOT NULL DEFAULT 'Move In Sync',
    "supportEmail" TEXT,
    "maxCompanies" INTEGER NOT NULL DEFAULT 1000,
    "allowSelfSignup" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "gender" "Gender",
    "companyId" TEXT NOT NULL,
    "businessUnitId" TEXT,
    "departmentId" TEXT,
    "teamId" TEXT,
    "managerId" TEXT,
    "teamLeaderId" TEXT,
    "designation" TEXT,
    "employmentType" "EmploymentType",
    "shiftId" TEXT,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,
    "homeAddress" TEXT,
    "defaultPickup" TEXT,
    "defaultDrop" TEXT,
    "transportEligibility" "TransportEligibility" NOT NULL DEFAULT 'ELIGIBLE',
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "capacity" INTEGER NOT NULL,
    "fuelType" "FuelType",
    "color" TEXT,
    "gpsDeviceId" TEXT,
    "vendorId" TEXT,
    "companyId" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "acType" "AcType" DEFAULT 'NON_AC',
    "ownershipType" "OwnershipType" DEFAULT 'COMPANY_OWNED',
    "passengerCapacity" INTEGER,
    "odometer" DOUBLE PRECISION DEFAULT 0,
    "isEV" BOOLEAN DEFAULT false,
    "batteryCapacity" DOUBLE PRECISION,
    "currentChargePercentage" DOUBLE PRECISION,
    "estimatedRangeKm" DOUBLE PRECISION,
    "chargingStatus" "ChargingStatus" DEFAULT 'NOT_APPLICABLE',
    "lastChargeAt" TIMESTAMP(3),
    "chargingLocation" TEXT,
    "insurancePolicyNo" TEXT,
    "insuranceProvider" TEXT,
    "pucNumber" TEXT,
    "permitNumber" TEXT,
    "fitnessCertNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "permitExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "pollutionExpiry" TIMESTAMP(3),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "driverCode" TEXT,
    "licenseNo" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "licenseCategory" TEXT,
    "vendorId" TEXT,
    "status" "DriverAccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "availabilityStatus" "DriverAvailabilityStatus" NOT NULL DEFAULT 'OFF_DUTY',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "city" TEXT,
    "state" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "vehicleId" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverTrip" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,

    CONSTRAINT "DriverTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "billingModel" TEXT,
    "slaConfig" JSONB,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "routeCode" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "origin" TEXT,
    "destination" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "companyId" TEXT NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "arrivalOffset" INTEGER,
    "departureOffset" INTEGER,
    "isPickup" BOOLEAN NOT NULL DEFAULT true,
    "isDrop" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportService" (
    "id" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "minAdvanceBookingMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "cancellationDeadlineMinutes" INTEGER NOT NULL DEFAULT 60,
    "allowLateBooking" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalLevels" INTEGER NOT NULL DEFAULT 1,
    "eligibleDepartments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibleDesignations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "femaleGuardRequired" BOOLEAN NOT NULL DEFAULT true,
    "guardStartHour" INTEGER NOT NULL DEFAULT 20,
    "guardEndHour" INTEGER NOT NULL DEFAULT 6,
    "guardRequiredDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "femaleLastDropGuardRequired" BOOLEAN NOT NULL DEFAULT true,
    "femaleFirstPickupGuardRequired" BOOLEAN NOT NULL DEFAULT true,
    "guardAssignmentMode" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "guardUnavailableBehavior" TEXT NOT NULL DEFAULT 'ESCALATE',
    "maxDetourKm" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "maxAdditionalTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "guardPerTripCost" DOUBLE PRECISION,
    "guardPerHourCost" DOUBLE PRECISION,
    "guardNightSurcharge" DOUBLE PRECISION,
    "guardMinimumCharge" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "requesterId" TEXT NOT NULL,
    "managerBookerId" TEXT,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "serviceType" "ServiceType" NOT NULL,
    "routeId" TEXT,
    "date" DATE NOT NULL,
    "pickupTime" TIMESTAMP(3) NOT NULL,
    "returnTrip" BOOLEAN NOT NULL DEFAULT false,
    "returnTime" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" JSONB,
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLandmark" TEXT,
    "pickupRadius" DOUBLE PRECISION DEFAULT 100,
    "dropLatitude" DOUBLE PRECISION NOT NULL,
    "dropLongitude" DOUBLE PRECISION NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "dropLandmark" TEXT,
    "purpose" TEXT,
    "department" TEXT,
    "costCenter" TEXT,
    "project" TEXT,
    "specialRequirements" TEXT,
    "notes" TEXT,
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "tripId" TEXT,
    "companyId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPassenger" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BookingPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShuttleBooking" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "pickupStopId" TEXT NOT NULL,
    "dropStopId" TEXT NOT NULL,
    "seatNumber" INTEGER,
    "status" "ShuttleBookingStatus" NOT NULL DEFAULT 'CONFIRMED',

    CONSTRAINT "ShuttleBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "approverRole" TEXT,
    "departmentId" TEXT,
    "serviceType" "ServiceType",
    "maxAmount" DOUBLE PRECISION,

    CONSTRAINT "ApprovalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalEntry" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "status" "ApprovalEntryStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "configId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "tripCode" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "type" "BookingType" NOT NULL,
    "routeId" TEXT,
    "routePolyline" TEXT,
    "plannedPolyline" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "date" DATE NOT NULL,
    "scheduledPickupTime" TIMESTAMP(3) NOT NULL,
    "actualPickupTime" TIMESTAMP(3),
    "scheduledDropTime" TIMESTAMP(3),
    "actualDropTime" TIMESTAMP(3),
    "pickupLatitude" DOUBLE PRECISION NOT NULL,
    "pickupLongitude" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "dropLatitude" DOUBLE PRECISION NOT NULL,
    "dropLongitude" DOUBLE PRECISION NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "plannedDuration" INTEGER,
    "actualDuration" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "passengerCount" INTEGER NOT NULL DEFAULT 0,
    "boardedCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "isTracking" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPassenger" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardingStatus" "BoardingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "boardedImage" TEXT,
    "boardedImageAt" TIMESTAMP(3),

    CONSTRAINT "TripPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boarding" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "BoardingAction" NOT NULL DEFAULT 'BOARD',
    "method" "BoardingMethod" NOT NULL DEFAULT 'MANUAL',
    "otp" TEXT,
    "qrCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Boarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LatestVehicleLocation" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LatestVehicleLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPing" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "userId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "eventId" TEXT,
    "anomaly" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GeofenceType" NOT NULL DEFAULT 'CUSTOM',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceEvent" (
    "id" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "action" "GeofenceAction" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeofenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOSAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "status" "SOSStatus" NOT NULL DEFAULT 'OPEN',
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SOSAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "tripId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "reporterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "companyId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SavedLocationType" NOT NULL DEFAULT 'CUSTOM',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "landmark" TEXT,
    "radius" DOUBLE PRECISION DEFAULT 100,
    "approved" "LocationApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roundingMode" "RoundingMode" NOT NULL DEFAULT 'ROUND_TO_NEAREST_1',
    "roundingPrecision" INTEGER NOT NULL DEFAULT 2,
    "nightChargeStart" INTEGER NOT NULL DEFAULT 22,
    "nightChargeEnd" INTEGER NOT NULL DEFAULT 6,
    "defaultFreeWaitingMinutes" INTEGER NOT NULL DEFAULT 15,
    "defaultWaitingRatePerMin" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "gpsTrackingIntervalSeconds" INTEGER NOT NULL DEFAULT 10,
    "gpsRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "defaultTollPolicy" "TollPolicy" NOT NULL DEFAULT 'NOT_INCLUDED',
    "defaultParkingPolicy" "ParkingPolicy" NOT NULL DEFAULT 'MANUALLY_ENTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "companyId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "vehicleType" "VehicleType",
    "acType" "AcType",
    "vendorId" TEXT,
    "city" TEXT,
    "routeCode" TEXT,
    "costCenterId" TEXT,
    "baseFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perKmRate" DOUBLE PRECISION NOT NULL,
    "perHourRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumFare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waitingChargePerMin" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "freeWaitingMinutes" INTEGER NOT NULL DEFAULT 15,
    "nightChargeType" "NightChargeType" NOT NULL DEFAULT 'PERCENTAGE',
    "nightChargeValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "airportCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalPassengerCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tollPolicy" "TollPolicy" NOT NULL DEFAULT 'NOT_INCLUDED',
    "tollAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parkingPolicy" "ParkingPolicy" NOT NULL DEFAULT 'MANUALLY_ENTERED',
    "parkingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "lastModifiedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCardHistory" (
    "id" TEXT NOT NULL,
    "rateCardId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT,
    "changeReason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateCardHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripCostSnapshot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "rateCardId" TEXT,
    "costCenterId" TEXT,
    "ratePerKm" DOUBLE PRECISION NOT NULL,
    "baseFare" DOUBLE PRECISION NOT NULL,
    "minimumKm" DOUBLE PRECISION NOT NULL,
    "minimumFare" DOUBLE PRECISION NOT NULL,
    "waitingChargePerMin" DOUBLE PRECISION NOT NULL,
    "freeWaitingMinutes" INTEGER NOT NULL,
    "nightChargeType" TEXT,
    "nightChargeValue" DOUBLE PRECISION,
    "acType" TEXT,
    "plannedDistanceKm" DOUBLE PRECISION NOT NULL,
    "actualDistanceKm" DOUBLE PRECISION,
    "billableDistanceKm" DOUBLE PRECISION NOT NULL,
    "baseFareAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanceCost" DOUBLE PRECISION NOT NULL,
    "waitingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waitingMinutes" INTEGER NOT NULL DEFAULT 0,
    "nightChargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tollCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parkingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "airportCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "department" TEXT,
    "businessUnit" TEXT,
    "project" TEXT,
    "vendorId" TEXT,
    "vehicleType" TEXT,
    "serviceType" TEXT,
    "status" "TripCostStatus" NOT NULL DEFAULT 'ESTIMATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripCostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripCost" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB,
    "department" TEXT,
    "businessUnit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "costCenterId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "tripCount" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expiryAlertDays" INTEGER[] DEFAULT ARRAY[60, 30, 15, 7, 1]::INTEGER[],
    "documentRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "autoBlockDriverOnExpiry" BOOLEAN NOT NULL DEFAULT true,
    "autoBlockVehicleOnExpiry" BOOLEAN NOT NULL DEFAULT true,
    "corporateEmailDomain" TEXT,
    "requireCorporateEmail" BOOLEAN NOT NULL DEFAULT false,
    "employeeIdCaseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "employeeIdPrefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleType" "VehicleType",
    "serviceType" "ServiceType",
    "vendorId" TEXT,
    "city" TEXT,
    "driverDocuments" TEXT[] DEFAULT ARRAY['DRIVING_LICENSE', 'PUC', 'INSURANCE', 'PERMIT']::TEXT[],
    "vehicleDocuments" TEXT[] DEFAULT ARRAY['REGISTRATION_CERTIFICATE', 'INSURANCE', 'PUC', 'PERMIT', 'FITNESS_CERTIFICATE']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "ComplianceEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentType" "ComplianceDocumentType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "documentNumber" TEXT,
    "documentName" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "issuingAuthority" TEXT,
    "insuranceProvider" TEXT,
    "coverageType" TEXT,
    "permitType" TEXT,
    "licenseType" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileType" TEXT,
    "storageKey" TEXT,
    "status" "ComplianceDocStatus" NOT NULL DEFAULT 'UPLOADED',
    "verificationStatus" "ComplianceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedByName" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "supersededById" TEXT,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverOnboarding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT,
    "driverId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "employmentType" TEXT,
    "joiningDate" TIMESTAMP(3),
    "status" "DriverOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "complianceScore" "ComplianceScore" NOT NULL DEFAULT 'NON_COMPLIANT',
    "userProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleOnboarding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "fuelType" "FuelType",
    "capacity" INTEGER NOT NULL,
    "acType" "AcType",
    "color" TEXT,
    "gpsDeviceId" TEXT,
    "status" "VehicleOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "complianceScore" "ComplianceScore" NOT NULL DEFAULT 'NON_COMPLIANT',
    "linkedVehicleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeOnboarding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "department" TEXT,
    "businessUnit" TEXT,
    "designation" TEXT,
    "managerId" TEXT,
    "teamLeaderId" TEXT,
    "employmentType" "EmploymentType",
    "workLocation" TEXT,
    "shiftName" TEXT,
    "joiningDate" TIMESTAMP(3),
    "transportEligibility" "TransportEligibility" NOT NULL DEFAULT 'ELIGIBLE',
    "eligibilityType" TEXT,
    "eligibilityReason" TEXT,
    "eligibilityFrom" TIMESTAMP(3),
    "eligibilityTo" TIMESTAMP(3),
    "status" "EmployeeOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAlert" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" "ComplianceEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "alertType" "ComplianceAlertType" NOT NULL,
    "documentType" "ComplianceDocumentType",
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "daysUntilExpiry" INTEGER,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOnboarding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "address" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "billingModel" TEXT,
    "status" "VendorOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredPickup" TEXT,
    "preferredService" "ServiceType",
    "preferredTime" TEXT,
    "accessibilityNeeds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringBooking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "pattern" "RecurringPattern" NOT NULL,
    "daysOfWeek" TEXT,
    "pickupTime" TEXT NOT NULL,
    "dropTime" TEXT,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "pickupAddress" TEXT,
    "dropLat" DOUBLE PRECISION NOT NULL,
    "dropLng" DOUBLE PRECISION NOT NULL,
    "dropAddress" TEXT,
    "status" "RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "pausedAt" TIMESTAMP(3),
    "resumeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "StopType" NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "landmark" TEXT,
    "scheduledTime" TIMESTAMP(3),
    "arrivalTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),
    "status" "TripStopStatus" NOT NULL DEFAULT 'PENDING',
    "passengerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "DispatchType" NOT NULL DEFAULT 'ORIGINAL',
    "reason" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "originalDriverId" TEXT,
    "originalVehicleId" TEXT,
    "replacementDriverId" TEXT,
    "replacementVehicleId" TEXT,
    "replacementETA" INTEGER,
    "distance" DOUBLE PRECISION,
    "status" "ReplacementStatus" NOT NULL DEFAULT 'FINDING',
    "reason" TEXT NOT NULL,
    "passengersToTransfer" INTEGER NOT NULL DEFAULT 0,
    "transferMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplacementAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteDeviation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "plannedRouteGeoJSON" JSONB,
    "actualRouteGeoJSON" JSONB,
    "deviationDistance" DOUBLE PRECISION NOT NULL,
    "deviationDuration" INTEGER,
    "deviationPercentage" DOUBLE PRECISION,
    "maxDeviationLat" DOUBLE PRECISION,
    "maxDeviationLng" DOUBLE PRECISION,
    "status" "DeviationStatus" NOT NULL DEFAULT 'DETECTED',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteDeviation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportBanPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "escalationRules" JSONB NOT NULL,
    "defaultBanDays" INTEGER NOT NULL DEFAULT 7,
    "countResetDays" INTEGER,
    "allowEmailApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowTransportAdminOverride" BOOLEAN NOT NULL DEFAULT true,
    "appealEnabled" BOOLEAN NOT NULL DEFAULT true,
    "separationOfDuty" BOOLEAN NOT NULL DEFAULT true,
    "recurringBookingHandling" TEXT NOT NULL DEFAULT 'PAUSE',
    "configurableReasons" JSONB,
    "permanentBanEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportBanPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportBan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "banCount" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "evidence" TEXT,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "isPermanent" BOOLEAN NOT NULL DEFAULT false,
    "status" "BanStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiredApprovalRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportBanRemovalRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "banId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "reason" TEXT,
    "comments" TEXT,
    "status" "BanRemovalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "requiredRole" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportBanRemovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportBanApproval" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "removalRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "method" "ApprovalMethod" NOT NULL,
    "decision" "ApprovalDecision",
    "decisionReason" TEXT,
    "emailToken" TEXT,
    "emailTokenExpiresAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportBanApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverRating" INTEGER,
    "vehicleRating" INTEGER,
    "punctuality" INTEGER,
    "cleanliness" INTEGER,
    "safety" INTEGER,
    "overallRating" INTEGER,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "tripId" TEXT,
    "type" "ComplaintType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LostFound" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT,
    "tripId" TEXT,
    "vehicleId" TEXT,
    "description" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "status" "LostFoundStatus" NOT NULL DEFAULT 'REPORTED',
    "foundDate" TIMESTAMP(3),
    "foundLocation" TEXT,
    "handoverTo" TEXT,
    "handoverDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LostFound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleInspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "type" "InspectionType" NOT NULL,
    "checklist" JSONB NOT NULL,
    "odometer" INTEGER,
    "fuelLevel" INTEGER,
    "passed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "odometer" INTEGER,
    "cost" DOUBLE PRECISION,
    "vendor" TEXT,
    "parts" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT,
    "toolCalls" JSONB,
    "toolResults" JSONB,
    "tokens" INTEGER,
    "model" TEXT,
    "provider" TEXT,
    "latencyMs" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "tokensInput" INTEGER NOT NULL DEFAULT 0,
    "tokensOutput" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "filename" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastIndexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerRelationship" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL DEFAULT 'MANAGER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTransportEligibility" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "EligibilityStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "reason" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "allowedServices" JSONB,
    "acAllowed" BOOLEAN NOT NULL DEFAULT true,
    "maxDistance" DOUBLE PRECISION,
    "nodalEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTransportEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "operatingHours" TEXT,
    "capacity" INTEGER,
    "parkingCapacity" INTEGER,
    "pickupZones" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentUpload" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiryDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPreferredArea" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaType" "AreaType" NOT NULL DEFAULT 'CIRCLE',
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION,
    "polygonPoints" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "preferenceLevel" "PreferenceLevel" NOT NULL DEFAULT 'PREFERRED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "shiftName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverPreferredArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverAreaPreferenceSchedule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverAreaPreferenceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverHomeBase" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Home Base',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverHomeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPreferenceConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "primaryAreaWeight" INTEGER NOT NULL DEFAULT 30,
    "preferredAreaWeight" INTEGER NOT NULL DEFAULT 20,
    "secondaryAreaWeight" INTEGER NOT NULL DEFAULT 10,
    "demandExpansionThreshold" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "nearbyAreaRadiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "maximumExpansionRadiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "maximumDriverDetourKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "maximumPickupETAMinutes" INTEGER NOT NULL DEFAULT 30,
    "maximumWaitTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "defaultPreferenceMode" "DriverPreferenceMode" NOT NULL DEFAULT 'BALANCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverPreferenceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandPressureSnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "zoneName" TEXT NOT NULL,
    "zoneLatitude" DOUBLE PRECISION NOT NULL,
    "zoneLongitude" DOUBLE PRECISION NOT NULL,
    "pendingBookings" INTEGER NOT NULL DEFAULT 0,
    "availableDrivers" INTEGER NOT NULL DEFAULT 0,
    "availableVehicles" INTEGER NOT NULL DEFAULT 0,
    "demandRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expansionLevel" INTEGER NOT NULL DEFAULT 0,
    "snapshotTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandPressureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchPreferenceAudit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT,
    "action" TEXT NOT NULL,
    "areaId" TEXT,
    "areaName" TEXT,
    "reason" TEXT,
    "expansionLevel" INTEGER,
    "assignmentScore" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchPreferenceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverComplianceStatus" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "licenseValid" BOOLEAN NOT NULL DEFAULT true,
    "licenseExpiryDate" TIMESTAMP(3),
    "pucValid" BOOLEAN NOT NULL DEFAULT true,
    "pucExpiryDate" TIMESTAMP(3),
    "insuranceValid" BOOLEAN NOT NULL DEFAULT true,
    "insuranceExpiryDate" TIMESTAMP(3),
    "permitValid" BOOLEAN NOT NULL DEFAULT true,
    "permitExpiryDate" TIMESTAMP(3),
    "fitnessValid" BOOLEAN NOT NULL DEFAULT true,
    "fitnessExpiryDate" TIMESTAMP(3),
    "shiftAssigned" BOOLEAN NOT NULL DEFAULT false,
    "shiftName" TEXT,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "maxDrivingHours" INTEGER NOT NULL DEFAULT 10,
    "drivingHoursToday" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "continuousDriving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastBreakTime" TIMESTAMP(3),
    "breakRequired" BOOLEAN NOT NULL DEFAULT false,
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overrideApprovedBy" TEXT,
    "overrideExpiry" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverComplianceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardingVerification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MANUAL',
    "expectedCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedCount" INTEGER NOT NULL DEFAULT 0,
    "boardedCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "extraPassengers" INTEGER NOT NULL DEFAULT 0,
    "otpCode" TEXT,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "discrepancyNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardingVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassengerBoarding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "qrVerified" BOOLEAN NOT NULL DEFAULT false,
    "driverConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "boardTime" TIMESTAMP(3),
    "seatNumber" INTEGER,
    "luggageCount" INTEGER NOT NULL DEFAULT 0,
    "accessibilityNeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassengerBoarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripChangeRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "changeType" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByRole" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "routeRecalculated" BOOLEAN NOT NULL DEFAULT false,
    "costRecalculated" BOOLEAN NOT NULL DEFAULT false,
    "capacityImpact" TEXT,
    "guardImpact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "recalculationLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedispatchTrigger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "originalDriverId" TEXT NOT NULL,
    "originalVehicleId" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeoutSeconds" INTEGER,
    "replacementDriverId" TEXT,
    "replacementVehicleId" TEXT,
    "replacementETA" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'TRIGGERED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedispatchTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "messageType" TEXT NOT NULL,
    "templateId" TEXT,
    "content" TEXT,
    "tripId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "externalId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyBroadcast" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "scope" TEXT NOT NULL,
    "zoneName" TEXT,
    "targetDriverIds" TEXT,
    "targetVehicleIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuedBy" TEXT NOT NULL,
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MassCancellation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "zoneName" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "affectedTripCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledTripCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MassCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWorkLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "totalDrivingMinutes" INTEGER NOT NULL DEFAULT 0,
    "continuousDrivingMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakCount" INTEGER NOT NULL DEFAULT 0,
    "totalBreakMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastBreakStart" TIMESTAMP(3),
    "lastBreakEnd" TIMESTAMP(3),
    "tripCount" INTEGER NOT NULL DEFAULT 0,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overTimeViolation" BOOLEAN NOT NULL DEFAULT false,
    "breakViolation" BOOLEAN NOT NULL DEFAULT false,
    "continuousViolation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverWorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "costPerLiter" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "stationName" TEXT,
    "odometerKm" DOUBLE PRECISION NOT NULL,
    "previousOdometer" DOUBLE PRECISION,
    "kmSinceLastFill" DOUBLE PRECISION,
    "fuelEfficiency" DOUBLE PRECISION,
    "socBefore" DOUBLE PRECISION,
    "socAfter" DOUBLE PRECISION,
    "chargingDuration" INTEGER,
    "chargingStation" TEXT,
    "driverId" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OdometerReading" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startKm" DOUBLE PRECISION NOT NULL,
    "endKm" DOUBLE PRECISION NOT NULL,
    "calculatedKm" DOUBLE PRECISION NOT NULL,
    "vendorReportedKm" DOUBLE PRECISION,
    "discrepancyKm" DOUBLE PRECISION,
    "tripId" TEXT,
    "driverId" TEXT NOT NULL,
    "tripDate" DATE NOT NULL,
    "photoUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdometerReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripExpense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tollAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parkingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waitingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "permitAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraKmAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherDescription" TEXT,
    "totalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receiptUrls" JSONB,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassengerContactAttempt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'PHONE_CALL',
    "callResult" TEXT,
    "callOutcome" TEXT,
    "notes" TEXT,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceTimestamp" TIMESTAMP(3),
    "callStartedAt" TIMESTAMP(3),
    "callEndedAt" TIMESTAMP(3),
    "callDurationSec" INTEGER,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT true,
    "evidenceStatus" TEXT NOT NULL DEFAULT 'REQUIRED',
    "evidenceDocumentId" TEXT,
    "evidenceUploadedAt" TIMESTAMP(3),
    "evidenceHash" TEXT,
    "nextAttemptAvailableAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassengerContactAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoShowEvidence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "contactAttemptId" TEXT,
    "evidenceType" TEXT NOT NULL,
    "documentId" TEXT,
    "storageKey" TEXT,
    "sha256" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "deviceTimestamp" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility" TEXT NOT NULL DEFAULT 'RESTRICTED',

    CONSTRAINT "NoShowEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoShowPolicyConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requiredCallAttempts" INTEGER NOT NULL DEFAULT 3,
    "minimumMinutesBetweenCalls" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 10,
    "callScreenshotRequired" BOOLEAN NOT NULL DEFAULT true,
    "supervisorCallEnabled" BOOLEAN NOT NULL DEFAULT true,
    "controlRoomConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "autoNoShowAfterEvidence" BOOLEAN NOT NULL DEFAULT false,
    "maxScreenshotSizeMB" INTEGER NOT NULL DEFAULT 10,
    "acceptedMimeTypes" TEXT NOT NULL DEFAULT 'image/png,image/jpeg,image/jpg,image/webp',
    "evidenceRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoShowPolicyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardRequirement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT,
    "bookingId" TEXT,
    "reason" TEXT NOT NULL,
    "requiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickupLocation" TEXT,
    "dropLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUIRED',
    "assignedGuardId" TEXT,
    "assignedGuardName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "optimizationAttempted" BOOLEAN NOT NULL DEFAULT false,
    "optimizationResult" TEXT,
    "originalSequence" JSONB,
    "optimizedSequence" JSONB,
    "cost" DOUBLE PRECISION,
    "vendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyOptimizationLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT,
    "bookingId" TEXT,
    "originalPickupSequence" JSONB,
    "optimizedPickupSequence" JSONB,
    "originalDropSequence" JSONB,
    "optimizedDropSequence" JSONB,
    "guardRequiredBefore" BOOLEAN NOT NULL,
    "guardRequiredAfter" BOOLEAN NOT NULL,
    "optimizationApplied" BOOLEAN NOT NULL,
    "optimizationReason" TEXT,
    "distanceDifferenceKm" DOUBLE PRECISION,
    "timeDifferenceMinutes" DOUBLE PRECISION,
    "malePassengerRepositioned" BOOLEAN NOT NULL DEFAULT false,
    "policyVersion" TEXT,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyOptimizationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCapacityConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "seatingCapacity" INTEGER NOT NULL,
    "passengerCapacity" INTEGER NOT NULL,
    "driverSeatIncluded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCapacityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverShift" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakDuration" INTEGER NOT NULL DEFAULT 60,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWorkSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "breakStartedAt" TIMESTAMP(3),
    "breakEndedAt" TIMESTAMP(3),
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "totalDrivingMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tripCount" INTEGER NOT NULL DEFAULT 0,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverWorkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverVehicleAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignmentType" TEXT NOT NULL DEFAULT 'PRIMARY',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleBreakdown" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "resolvedAt" TIMESTAMP(3),
    "repairNotes" TEXT,
    "reportedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWorkHoursPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "maxContinuousDrivingMin" INTEGER NOT NULL DEFAULT 240,
    "maxDailyDrivingMin" INTEGER NOT NULL DEFAULT 600,
    "minBreakDurationMin" INTEGER NOT NULL DEFAULT 30,
    "breakAfterDrivingMin" INTEGER NOT NULL DEFAULT 240,
    "maxAssignmentsPerShift" INTEGER NOT NULL DEFAULT 10,
    "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverWorkHoursPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeImportJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "importMode" TEXT NOT NULL DEFAULT 'IMPORT',
    "errorFileUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeImportRow" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "email" TEXT,
    "action" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportExpense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "bookingId" TEXT,
    "tripId" TEXT,
    "provider" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "fareAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "tollAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parkingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waitingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "claimedAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "rejectedAmount" DOUBLE PRECISION,
    "receiptUrl" TEXT,
    "receiptHash" TEXT,
    "receiptFileName" TEXT,
    "reason" TEXT NOT NULL,
    "reasonNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "partialApprovalReason" TEXT,
    "department" TEXT,
    "businessUnit" TEXT,
    "costCenter" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseDispute" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTransportLimit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "maxTripsPerDay" INTEGER,
    "maxTripsPerWeek" INTEGER,
    "maxTripsPerMonth" INTEGER,
    "maxDistancePerTrip" DOUBLE PRECISION,
    "maxSpendPerTrip" DOUBLE PRECISION,
    "maxSpendPerDay" DOUBLE PRECISION,
    "maxSpendPerWeek" DOUBLE PRECISION,
    "maxSpendPerMonth" DOUBLE PRECISION,
    "maxDistancePerDay" DOUBLE PRECISION,
    "maxDistancePerMonth" DOUBLE PRECISION,
    "tripsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "tripsThisWeek" INTEGER NOT NULL DEFAULT 0,
    "tripsToday" INTEGER NOT NULL DEFAULT 0,
    "spendThisMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spendThisWeek" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spendToday" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distanceThisMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "limitAction" TEXT NOT NULL DEFAULT 'REQUIRE_APPROVAL',
    "cabAllowed" BOOLEAN NOT NULL DEFAULT true,
    "shuttleAllowed" BOOLEAN NOT NULL DEFAULT true,
    "nodalAllowed" BOOLEAN NOT NULL DEFAULT true,
    "acAllowed" BOOLEAN NOT NULL DEFAULT true,
    "lastResetAt" TIMESTAMP(3),
    "resetPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTransportLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpensePolicyConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expenseApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "managerApprovalLimit" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "directorApprovalLimit" DOUBLE PRECISION NOT NULL DEFAULT 25000,
    "transportAdminApprovalLimit" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "maximumExpensePerTrip" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "maximumMonthlyExpense" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "allowedProviders" TEXT[] DEFAULT ARRAY['UBER', 'OLA', 'RAPIDO', 'LOCAL_CAB', 'EMERGENCY_CAB', 'OTHER']::TEXT[],
    "receiptMandatory" BOOLEAN NOT NULL DEFAULT true,
    "receiptSubmissionWindowDays" INTEGER NOT NULL DEFAULT 30,
    "lateSubmissionAllowed" BOOLEAN NOT NULL DEFAULT false,
    "emergencyExpenseAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpensePolicyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWallet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCredited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDebited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverWalletAdvance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "settlementId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverWalletAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSharingContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "relationship" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "shareLiveLocation" BOOLEAN NOT NULL DEFAULT true,
    "shareTripStatus" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripSharingContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupReminder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'PUSH',
    "offsetMins" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteMatchCandidate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "completingTripId" TEXT NOT NULL,
    "candidateBookingId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "pickupDistanceKm" DOUBLE PRECISION NOT NULL,
    "routeOverlapPercent" DOUBLE PRECISION,
    "timeGapMinutes" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteMatchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "sms" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "tripAssigned" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "tripArriving" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "tripCompleted" TEXT NOT NULL DEFAULT 'PUSH',
    "emergency" TEXT NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDevice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blockedAt" TIMESTAMP(3),
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMFASecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMFASecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAllocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "fiscalMonth" TEXT,
    "allocatedBudget" DOUBLE PRECISION NOT NULL,
    "spentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSLAPenalty" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "slaMetric" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "penaltyAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CALCULATED',
    "appliedAt" TIMESTAMP(3),
    "waivedBy" TEXT,
    "waivedReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorSLAPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReconciliation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorInvoiceId" TEXT NOT NULL,
    "tripId" TEXT,
    "dispatchRecordId" TEXT,
    "tripAmount" DOUBLE PRECISION,
    "dispatchAmount" DOUBLE PRECISION,
    "invoiceAmount" DOUBLE PRECISION NOT NULL,
    "kmDiscrepancy" DOUBLE PRECISION,
    "amountDiscrepancy" DOUBLE PRECISION,
    "vehicleMatch" BOOLEAN,
    "driverMatch" BOOLEAN,
    "dateMatch" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyEvacuation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "zoneName" TEXT,
    "officeIds" TEXT[],
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuedBy" TEXT NOT NULL,
    "affectedTrips" INTEGER NOT NULL DEFAULT 0,
    "evacuatedCount" INTEGER NOT NULL DEFAULT 0,
    "safeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyEvacuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportAccessRole" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "hierarchyLevel" INTEGER NOT NULL DEFAULT 0,
    "canManageVendors" BOOLEAN NOT NULL DEFAULT false,
    "canManageDrivers" BOOLEAN NOT NULL DEFAULT false,
    "canManageVehicles" BOOLEAN NOT NULL DEFAULT false,
    "canManageRoutes" BOOLEAN NOT NULL DEFAULT false,
    "canImportEmployees" BOOLEAN NOT NULL DEFAULT false,
    "canManagePolicies" BOOLEAN NOT NULL DEFAULT false,
    "canApproveBanRemoval" BOOLEAN NOT NULL DEFAULT false,
    "canApproveExpenses" BOOLEAN NOT NULL DEFAULT false,
    "canManageEmergency" BOOLEAN NOT NULL DEFAULT false,
    "canManageShuttles" BOOLEAN NOT NULL DEFAULT false,
    "canManageNodals" BOOLEAN NOT NULL DEFAULT false,
    "canViewAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "canManageSubAdmins" BOOLEAN NOT NULL DEFAULT false,
    "canManageAccessRoles" BOOLEAN NOT NULL DEFAULT false,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportAccessRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportAccessAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportAccessAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorManagement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "contractValue" DOUBLE PRECISION,
    "paymentTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "onboardedBy" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "offboardedBy" TEXT,
    "offboardedAt" TIMESTAMP(3),
    "offboardReason" TEXT,
    "rating" DOUBLE PRECISION,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slaScore" DOUBLE PRECISION,
    "complianceStatus" TEXT NOT NULL DEFAULT 'COMPLIANT',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorManagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverManagement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vendorId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "aadharNumber" TEXT,
    "panNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "bloodGroup" TEXT,
    "experience" INTEGER,
    "rating" DOUBLE PRECISION,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentLocation" JSONB,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,
    "preferredZones" TEXT,
    "preferredShifts" TEXT,
    "skills" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "bankAccount" TEXT,
    "ifscCode" TEXT,
    "monthlySalary" DOUBLE PRECISION,
    "perTripIncentive" DOUBLE PRECISION,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "onboardedBy" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "offboardedBy" TEXT,
    "offboardedAt" TIMESTAMP(3),
    "offboardReason" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverManagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleManagement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vendorId" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "seatingCapacity" INTEGER NOT NULL,
    "fuelType" TEXT NOT NULL DEFAULT 'PETROL',
    "color" TEXT,
    "insuranceNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "pucExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "permitExpiry" TIMESTAMP(3),
    "gpsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gpsDeviceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "currentSpeed" DOUBLE PRECISION,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastServiceKm" DOUBLE PRECISION,
    "nextServiceKm" DOUBLE PRECISION,
    "lastServiceDate" TIMESTAMP(3),
    "monthlyMaintenanceCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "onboardedBy" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "offboardedBy" TEXT,
    "offboardedAt" TIMESTAMP(3),
    "offboardReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleManagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteManagement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "routeCode" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "routeType" TEXT NOT NULL,
    "originLatitude" DOUBLE PRECISION NOT NULL,
    "originLongitude" DOUBLE PRECISION NOT NULL,
    "originAddress" TEXT,
    "destLatitude" DOUBLE PRECISION NOT NULL,
    "destLongitude" DOUBLE PRECISION NOT NULL,
    "destAddress" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "estimatedMinutes" INTEGER,
    "stopCount" INTEGER NOT NULL DEFAULT 0,
    "stops" JSONB NOT NULL DEFAULT '[]',
    "serviceDays" TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
    "operatingHours" JSONB NOT NULL DEFAULT '{}',
    "shiftAssignments" TEXT,
    "vehicleType" TEXT,
    "maxCapacity" INTEGER,
    "farePerKm" DOUBLE PRECISION,
    "fixedFare" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "assignedVehicles" TEXT,
    "assignedDrivers" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteManagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodalPoint" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nodalCode" TEXT NOT NULL,
    "nodalName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "landmark" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "operatingHours" JSONB NOT NULL DEFAULT '{}',
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "facilities" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedRoutes" TEXT,
    "zoneName" TEXT,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodalPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShuttleRoute" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shuttleCode" TEXT NOT NULL,
    "shuttleName" TEXT NOT NULL,
    "routeId" TEXT,
    "originName" TEXT NOT NULL,
    "originLatitude" DOUBLE PRECISION NOT NULL,
    "originLongitude" DOUBLE PRECISION NOT NULL,
    "destName" TEXT NOT NULL,
    "destLatitude" DOUBLE PRECISION NOT NULL,
    "destLongitude" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "estimatedMinutes" INTEGER,
    "stops" JSONB NOT NULL DEFAULT '[]',
    "frequencyMinutes" INTEGER NOT NULL DEFAULT 30,
    "operatingHours" JSONB NOT NULL DEFAULT '{}',
    "serviceDays" TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
    "vehicleType" TEXT,
    "maxCapacity" INTEGER NOT NULL DEFAULT 40,
    "farePerTrip" DOUBLE PRECISION,
    "assignedVehicles" TEXT,
    "assignedDrivers" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShuttleRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "operatingHours" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "shuttleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "nodalEnabled" BOOLEAN NOT NULL DEFAULT false,
    "parkingCapacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCSVImport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "importJobName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorFilePath" TEXT,
    "importedBy" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "validationErrors" JSONB NOT NULL DEFAULT '[]',
    "importConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCSVImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCSVRow" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "businessUnit" TEXT,
    "costCenter" TEXT,
    "teamName" TEXT,
    "managerId" TEXT,
    "managerName" TEXT,
    "officeLocation" TEXT,
    "shiftTiming" TEXT,
    "pickupAddress" TEXT,
    "dropAddress" TEXT,
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "dropLatitude" DOUBLE PRECISION,
    "dropLongitude" DOUBLE PRECISION,
    "gender" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "resolvedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCSVRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoShowPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "policyName" TEXT NOT NULL,
    "description" TEXT,
    "policyType" TEXT NOT NULL DEFAULT 'GLOBAL',
    "departmentId" TEXT,
    "shiftId" TEXT,
    "zoneName" TEXT,
    "maxNoShowsBeforeWarning" INTEGER NOT NULL DEFAULT 2,
    "maxNoShowsBeforeBan" INTEGER NOT NULL DEFAULT 3,
    "banDurationDays" INTEGER NOT NULL DEFAULT 7,
    "warningMessageTemplate" TEXT,
    "banMessageTemplate" TEXT,
    "autoBanEnabled" BOOLEAN NOT NULL DEFAULT true,
    "appealEnabled" BOOLEAN NOT NULL DEFAULT true,
    "appealCooldownDays" INTEGER NOT NULL DEFAULT 30,
    "noShowWindowMinutes" INTEGER NOT NULL DEFAULT 15,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoShowPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeNoShowRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "noShowTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyId" TEXT,
    "actionTaken" TEXT,
    "banExpiry" TIMESTAMP(3),
    "appealStatus" TEXT,
    "appealReason" TEXT,
    "appealedAt" TIMESTAMP(3),
    "appealDecidedBy" TEXT,
    "appealDecidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeNoShowRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportBanRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "banType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "banCount" INTEGER NOT NULL DEFAULT 1,
    "totalBanCount" INTEGER NOT NULL DEFAULT 0,
    "banStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "banEndDate" TIMESTAMP(3),
    "isPermanentBan" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bannedBy" TEXT NOT NULL,
    "policyId" TEXT,
    "noShowRecordIds" TEXT,
    "appealStatus" TEXT,
    "appealReason" TEXT,
    "appealDate" TIMESTAMP(3),
    "appealDecidedBy" TEXT,
    "appealDecidedAt" TIMESTAMP(3),
    "appealNotes" TEXT,
    "liftRequestStatus" TEXT,
    "liftRequestedBy" TEXT,
    "liftRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportBanRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentApproverId" TEXT,
    "currentApproverRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "maxEscalationLevel" INTEGER NOT NULL DEFAULT 3,
    "requestReason" TEXT,
    "comments" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decision" TEXT,
    "decisionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalLevel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL,
    "approverUserIds" TEXT,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "autoApproveAfterMinutes" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyBuzzer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "nearestOfficeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" TEXT NOT NULL DEFAULT 'HIGH',
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "dispatchedVehicles" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "falseAlarm" BOOLEAN NOT NULL DEFAULT false,
    "falseAlarmReason" TEXT,
    "nearbyDrivers" JSONB NOT NULL DEFAULT '[]',
    "nearbyVehicles" JSONB NOT NULL DEFAULT '[]',
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "responseTimeSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyBuzzer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencySystemContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "role" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "responseOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencySystemContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportPolicyConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "modifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportPolicyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupDropTiming" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "pickupStartTime" TEXT NOT NULL,
    "pickupEndTime" TEXT NOT NULL,
    "dropStartTime" TEXT NOT NULL,
    "dropEndTime" TEXT NOT NULL,
    "lastBookingCutoffMinutes" INTEGER NOT NULL DEFAULT 30,
    "earlyBookingWindowHours" INTEGER NOT NULL DEFAULT 24,
    "isFlexible" BOOLEAN NOT NULL DEFAULT false,
    "flexWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "applicableDays" TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupDropTiming_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportBoundary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "boundaryName" TEXT NOT NULL,
    "boundaryType" TEXT NOT NULL,
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "polygon" JSONB,
    "address" TEXT,
    "city" TEXT,
    "applicableShifts" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportBoundary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CabCapacityConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "configName" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "maxPassengers" INTEGER NOT NULL,
    "allowMixedGender" BOOLEAN NOT NULL DEFAULT false,
    "femaleOnlyCab" BOOLEAN NOT NULL DEFAULT false,
    "luxuryUpgrade" BOOLEAN NOT NULL DEFAULT false,
    "accessibility" BOOLEAN NOT NULL DEFAULT false,
    "acRequired" BOOLEAN NOT NULL DEFAULT true,
    "maxLuggageKg" DOUBLE PRECISION,
    "applicableShifts" TEXT,
    "fareMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CabCapacityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthyEmployee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "healthStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "medicalCondition" TEXT,
    "accommodationType" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "doctorNote" TEXT,
    "doctorNotePath" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthyEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardAnalytics" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "analyticsDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricType" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "metricData" JSONB NOT NULL DEFAULT '{}',
    "period" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPerformanceMetric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "completedTrips" INTEGER NOT NULL DEFAULT 0,
    "cancelledTrips" INTEGER NOT NULL DEFAULT 0,
    "noShowTrips" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION,
    "avgTripDuration" DOUBLE PRECISION,
    "avgRating" DOUBLE PRECISION,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slaCompliance" DOUBLE PRECISION,
    "penaltyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverPerformanceMetric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vendorId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "completedTrips" INTEGER NOT NULL DEFAULT 0,
    "cancelledTrips" INTEGER NOT NULL DEFAULT 0,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION,
    "onTimePercent" DOUBLE PRECISION,
    "safetyIncidents" INTEGER NOT NULL DEFAULT 0,
    "customerComplaints" INTEGER NOT NULL DEFAULT 0,
    "fuelEfficiency" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverPerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorUser" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VENDOR_ADMIN',
    "canManageDrivers" BOOLEAN NOT NULL DEFAULT true,
    "canManageVehicles" BOOLEAN NOT NULL DEFAULT true,
    "canViewTrips" BOOLEAN NOT NULL DEFAULT true,
    "canViewAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "canManagePayments" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorDriverProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vendorDriverCode" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "aadharNumber" TEXT,
    "panNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "experience" INTEGER,
    "rating" DOUBLE PRECISION,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,
    "preferredZones" TEXT,
    "skills" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "monthlySalary" DOUBLE PRECISION,
    "perTripIncentive" DOUBLE PRECISION,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "bankAccount" TEXT,
    "ifscCode" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "onboardedBy" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "offboardedBy" TEXT,
    "offboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorVehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "vendorVehicleCode" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "seatingCapacity" INTEGER NOT NULL,
    "fuelType" TEXT NOT NULL DEFAULT 'PETROL',
    "color" TEXT,
    "insuranceNumber" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "pucExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "permitExpiry" TIMESTAMP(3),
    "gpsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gpsDeviceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "totalKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "onboardedBy" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorTripRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "employeeId" TEXT,
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "dropLatitude" DOUBLE PRECISION,
    "dropLongitude" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "durationMinutes" INTEGER,
    "fare" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorTripRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPaymentRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "paymentPeriod" TEXT NOT NULL,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penalties" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceTeam" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'COMPLIANCE_OFFICER',
    "canApproveVehicles" BOOLEAN NOT NULL DEFAULT false,
    "canApproveDrivers" BOOLEAN NOT NULL DEFAULT false,
    "canApproveVendors" BOOLEAN NOT NULL DEFAULT false,
    "canAuditDocuments" BOOLEAN NOT NULL DEFAULT true,
    "canDelegateTasks" BOOLEAN NOT NULL DEFAULT false,
    "canApproveCabs" BOOLEAN NOT NULL DEFAULT false,
    "canManagePolicies" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyDocumentType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "forEntityType" TEXT NOT NULL,
    "validityDays" INTEGER,
    "alertBeforeDays" INTEGER NOT NULL DEFAULT 30,
    "renewalRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyComplianceDoc" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "documentNumber" TEXT,
    "issuedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "issuingAuthority" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "complianceScore" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyComplianceDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAudit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auditorId" TEXT NOT NULL,
    "auditorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "findings" TEXT,
    "complianceScore" DOUBLE PRECISION,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "issuesList" JSONB NOT NULL DEFAULT '[]',
    "actionRequired" BOOLEAN NOT NULL DEFAULT false,
    "actionDeadline" TIMESTAMP(3),
    "actionTaken" TEXT,
    "actionTakenBy" TEXT,
    "actionTakenAt" TIMESTAMP(3),
    "documents" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isRandom" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceTask" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "assignedTo" TEXT,
    "assignedToRole" TEXT,
    "delegatedBy" TEXT,
    "delegatedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "result" TEXT,
    "notes" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompliancePolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "policyName" TEXT NOT NULL,
    "policyCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "enforcementLevel" TEXT NOT NULL DEFAULT 'ADVISORY',
    "applicableTo" TEXT NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdBy" TEXT,
    "lastAuditedAt" TIMESTAMP(3),
    "lastAuditedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompliancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CabApproval" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "vendorId" TEXT,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "complianceCheck" BOOLEAN NOT NULL DEFAULT false,
    "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
    "vehicleInspected" BOOLEAN NOT NULL DEFAULT false,
    "driverVerified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceValid" BOOLEAN NOT NULL DEFAULT false,
    "pucValid" BOOLEAN NOT NULL DEFAULT false,
    "permitValid" BOOLEAN NOT NULL DEFAULT false,
    "fitnessValid" BOOLEAN NOT NULL DEFAULT false,
    "expiryDate" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CabApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperComplianceConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "modifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperComplianceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperComplianceAudit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "auditorId" TEXT NOT NULL,
    "auditorName" TEXT,
    "findings" TEXT,
    "complianceScore" DOUBLE PRECISION,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "issuesList" JSONB NOT NULL DEFAULT '[]',
    "companiesCovered" JSONB NOT NULL DEFAULT '[]',
    "actionItems" JSONB NOT NULL DEFAULT '[]',
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperComplianceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperComplianceAlert" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperComplianceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperComplianceScore" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "documentScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "vehicleScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "driverScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "vendorScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "auditScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "totalIssues" INTEGER NOT NULL DEFAULT 0,
    "resolvedIssues" INTEGER NOT NULL DEFAULT 0,
    "pendingIssues" INTEGER NOT NULL DEFAULT 0,
    "overdueIssues" INTEGER NOT NULL DEFAULT 0,
    "evaluationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedBy" TEXT,
    "period" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperComplianceScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformComplianceRule" (
    "id" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "autoEnforce" BOOLEAN NOT NULL DEFAULT true,
    "action" TEXT NOT NULL DEFAULT 'ALERT',
    "applicableTo" TEXT NOT NULL DEFAULT 'ALL',
    "threshold" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyComplianceStanding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "overallGrade" TEXT NOT NULL DEFAULT 'A',
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "documentCompliance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "vehicleCompliance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "driverCompliance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "vendorCompliance" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "validDocuments" INTEGER NOT NULL DEFAULT 0,
    "expiringDocuments" INTEGER NOT NULL DEFAULT 0,
    "expiredDocuments" INTEGER NOT NULL DEFAULT 0,
    "totalVehicles" INTEGER NOT NULL DEFAULT 0,
    "compliantVehicles" INTEGER NOT NULL DEFAULT 0,
    "totalDrivers" INTEGER NOT NULL DEFAULT 0,
    "compliantDrivers" INTEGER NOT NULL DEFAULT 0,
    "lastAuditDate" TIMESTAMP(3),
    "lastAuditScore" DOUBLE PRECISION,
    "nextAuditDate" TIMESTAMP(3),
    "suspensionRisk" BOOLEAN NOT NULL DEFAULT false,
    "suspensionRiskReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyComplianceStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessUnitId" TEXT,
    "regionId" TEXT,

    CONSTRAINT "CompanySite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineOfBusiness" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "lobCode" TEXT NOT NULL,
    "lobName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineOfBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgProcess" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "lobId" TEXT,
    "processCode" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessScope" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "lobId" TEXT,
    "processId" TEXT,
    "shiftId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermissionConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermissionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalLevelConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "approverRoleId" TEXT,
    "approverUserIds" TEXT[],
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "autoApproveAfterMinutes" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "slaMinutes" INTEGER NOT NULL DEFAULT 1440,
    "escalationMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalLevelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessScopeHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousScope" JSONB,
    "newScope" JSONB,
    "performedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessScopeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "regionName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeOrgAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "lobId" TEXT,
    "processId" TEXT,
    "shiftId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeOrgAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupArrivalEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "distanceFromPickupMeters" DOUBLE PRECISION,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geofenceMatched" BOOLEAN NOT NULL DEFAULT false,
    "gpsAccuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupArrivalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorCallRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "assignedSupervisorId" TEXT,
    "supervisorCallAt" TIMESTAMP(3),
    "supervisorOutcome" TEXT,
    "supervisorInstructions" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "maxEscalationLevel" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisorCallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoShowAppeal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "bookingId" TEXT,
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "noShowDate" TIMESTAMP(3) NOT NULL,
    "appealReason" TEXT NOT NULL,
    "appealDetails" TEXT,
    "evidenceDocumentIds" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerId" TEXT,
    "reviewerComments" TEXT,
    "decision" TEXT,
    "decidedAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "maxEscalationLevel" INTEGER NOT NULL DEFAULT 3,
    "slaDeadline" TIMESTAMP(3),
    "escalationDeadline" TIMESTAMP(3),
    "banTriggered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoShowAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_companyId_name_key" ON "BusinessUnit"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "Department"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_companyId_name_key" ON "Team"("companyId", "name");

-- CreateIndex
CREATE INDEX "CompanyMembership_companyId_idx" ON "CompanyMembership"("companyId");

-- CreateIndex
CREATE INDEX "CompanyMembership_userId_idx" ON "CompanyMembership"("userId");

-- CreateIndex
CREATE INDEX "CompanyMembership_role_idx" ON "CompanyMembership"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_userId_companyId_key" ON "CompanyMembership"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_companyId_idx" ON "Invitation"("companyId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_teamLeaderId_idx" ON "User"("teamLeaderId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Permission_module_idx" ON "Permission"("module");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_companyId_name_key" ON "Shift"("companyId", "name");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");

-- CreateIndex
CREATE INDEX "Vehicle_vendorId_idx" ON "Vehicle"("vendorId");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_companyId_registrationNo_key" ON "Vehicle"("companyId", "registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE INDEX "DriverProfile_companyId_idx" ON "DriverProfile"("companyId");

-- CreateIndex
CREATE INDEX "DriverProfile_vendorId_idx" ON "DriverProfile"("vendorId");

-- CreateIndex
CREATE INDEX "DriverProfile_status_idx" ON "DriverProfile"("status");

-- CreateIndex
CREATE INDEX "DriverProfile_availabilityStatus_idx" ON "DriverProfile"("availabilityStatus");

-- CreateIndex
CREATE INDEX "DriverProfile_driverCode_idx" ON "DriverProfile"("driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_companyId_driverCode_key" ON "DriverProfile"("companyId", "driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "DriverTrip_tripId_key" ON "DriverTrip"("tripId");

-- CreateIndex
CREATE INDEX "DriverTrip_driverId_idx" ON "DriverTrip"("driverId");

-- CreateIndex
CREATE INDEX "Vendor_companyId_idx" ON "Vendor"("companyId");

-- CreateIndex
CREATE INDEX "Route_companyId_idx" ON "Route"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_companyId_routeCode_key" ON "Route"("companyId", "routeCode");

-- CreateIndex
CREATE INDEX "RouteStop_routeId_idx" ON "RouteStop"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_sequence_key" ON "RouteStop"("routeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TransportService_companyId_name_key" ON "TransportService"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TransportPolicy_companyId_name_key" ON "TransportPolicy"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");

-- CreateIndex
CREATE INDEX "Booking_requesterId_idx" ON "Booking"("requesterId");

-- CreateIndex
CREATE INDEX "Booking_companyId_idx" ON "Booking"("companyId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");

-- CreateIndex
CREATE INDEX "Booking_serviceType_idx" ON "Booking"("serviceType");

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPassenger_bookingId_userId_key" ON "BookingPassenger"("bookingId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShuttleBooking_bookingId_key" ON "ShuttleBooking"("bookingId");

-- CreateIndex
CREATE INDEX "ShuttleBooking_routeId_idx" ON "ShuttleBooking"("routeId");

-- CreateIndex
CREATE INDEX "ShuttleBooking_pickupStopId_idx" ON "ShuttleBooking"("pickupStopId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalConfig_companyId_level_key" ON "ApprovalConfig"("companyId", "level");

-- CreateIndex
CREATE INDEX "ApprovalEntry_bookingId_idx" ON "ApprovalEntry"("bookingId");

-- CreateIndex
CREATE INDEX "ApprovalEntry_approverId_idx" ON "ApprovalEntry"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_tripCode_key" ON "Trip"("tripCode");

-- CreateIndex
CREATE INDEX "Trip_companyId_idx" ON "Trip"("companyId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_date_idx" ON "Trip"("date");

-- CreateIndex
CREATE INDEX "Trip_driverId_idx" ON "Trip"("driverId");

-- CreateIndex
CREATE INDEX "Trip_vehicleId_idx" ON "Trip"("vehicleId");

-- CreateIndex
CREATE INDEX "Trip_routeId_idx" ON "Trip"("routeId");

-- CreateIndex
CREATE INDEX "TripPassenger_tripId_idx" ON "TripPassenger"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripPassenger_tripId_userId_key" ON "TripPassenger"("tripId", "userId");

-- CreateIndex
CREATE INDEX "Boarding_tripId_idx" ON "Boarding"("tripId");

-- CreateIndex
CREATE INDEX "Boarding_passengerId_idx" ON "Boarding"("passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "LatestVehicleLocation_vehicleId_key" ON "LatestVehicleLocation"("vehicleId");

-- CreateIndex
CREATE INDEX "LatestVehicleLocation_vehicleId_idx" ON "LatestVehicleLocation"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationPing_eventId_key" ON "LocationPing"("eventId");

-- CreateIndex
CREATE INDEX "LocationPing_vehicleId_timestamp_idx" ON "LocationPing"("vehicleId", "timestamp");

-- CreateIndex
CREATE INDEX "LocationPing_tripId_timestamp_idx" ON "LocationPing"("tripId", "timestamp");

-- CreateIndex
CREATE INDEX "LocationPing_userId_idx" ON "LocationPing"("userId");

-- CreateIndex
CREATE INDEX "LocationPing_eventId_idx" ON "LocationPing"("eventId");

-- CreateIndex
CREATE INDEX "Geofence_companyId_idx" ON "Geofence"("companyId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_geofenceId_idx" ON "GeofenceEvent"("geofenceId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_vehicleId_timestamp_idx" ON "GeofenceEvent"("vehicleId", "timestamp");

-- CreateIndex
CREATE INDEX "SOSAlert_status_idx" ON "SOSAlert"("status");

-- CreateIndex
CREATE INDEX "SOSAlert_userId_idx" ON "SOSAlert"("userId");

-- CreateIndex
CREATE INDEX "Incident_companyId_idx" ON "Incident"("companyId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_tripId_idx" ON "Incident"("tripId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "SavedLocation_userId_idx" ON "SavedLocation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_companyId_code_key" ON "CostCenter"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_companyId_key" ON "PricingConfig"("companyId");

-- CreateIndex
CREATE INDEX "RateCard_companyId_idx" ON "RateCard"("companyId");

-- CreateIndex
CREATE INDEX "RateCard_companyId_serviceType_idx" ON "RateCard"("companyId", "serviceType");

-- CreateIndex
CREATE INDEX "RateCard_companyId_vendorId_idx" ON "RateCard"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "RateCard_isActive_idx" ON "RateCard"("isActive");

-- CreateIndex
CREATE INDEX "RateCard_effectiveFrom_effectiveTo_idx" ON "RateCard"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "RateCard_companyId_code_key" ON "RateCard"("companyId", "code");

-- CreateIndex
CREATE INDEX "RateCardHistory_rateCardId_idx" ON "RateCardHistory"("rateCardId");

-- CreateIndex
CREATE INDEX "RateCardHistory_changedAt_idx" ON "RateCardHistory"("changedAt");

-- CreateIndex
CREATE INDEX "TripCostSnapshot_tripId_idx" ON "TripCostSnapshot"("tripId");

-- CreateIndex
CREATE INDEX "TripCostSnapshot_costCenterId_idx" ON "TripCostSnapshot"("costCenterId");

-- CreateIndex
CREATE INDEX "TripCostSnapshot_vendorId_idx" ON "TripCostSnapshot"("vendorId");

-- CreateIndex
CREATE INDEX "TripCostSnapshot_department_idx" ON "TripCostSnapshot"("department");

-- CreateIndex
CREATE INDEX "TripCostSnapshot_serviceType_idx" ON "TripCostSnapshot"("serviceType");

-- CreateIndex
CREATE INDEX "TripCost_tripId_idx" ON "TripCost"("tripId");

-- CreateIndex
CREATE INDEX "TripCost_costCenterId_idx" ON "TripCost"("costCenterId");

-- CreateIndex
CREATE INDEX "VendorInvoice_vendorId_idx" ON "VendorInvoice"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceConfig_companyId_key" ON "ComplianceConfig"("companyId");

-- CreateIndex
CREATE INDEX "ComplianceRule_companyId_idx" ON "ComplianceRule"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRule_companyId_name_key" ON "ComplianceRule"("companyId", "name");

-- CreateIndex
CREATE INDEX "ComplianceDocument_entityType_entityId_idx" ON "ComplianceDocument"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ComplianceDocument_companyId_idx" ON "ComplianceDocument"("companyId");

-- CreateIndex
CREATE INDEX "ComplianceDocument_status_idx" ON "ComplianceDocument"("status");

-- CreateIndex
CREATE INDEX "ComplianceDocument_expiryDate_idx" ON "ComplianceDocument"("expiryDate");

-- CreateIndex
CREATE INDEX "ComplianceDocument_verificationStatus_idx" ON "ComplianceDocument"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DriverOnboarding_driverId_key" ON "DriverOnboarding"("driverId");

-- CreateIndex
CREATE INDEX "DriverOnboarding_companyId_idx" ON "DriverOnboarding"("companyId");

-- CreateIndex
CREATE INDEX "DriverOnboarding_vendorId_idx" ON "DriverOnboarding"("vendorId");

-- CreateIndex
CREATE INDEX "DriverOnboarding_status_idx" ON "DriverOnboarding"("status");

-- CreateIndex
CREATE INDEX "DriverOnboarding_complianceScore_idx" ON "DriverOnboarding"("complianceScore");

-- CreateIndex
CREATE UNIQUE INDEX "DriverOnboarding_companyId_driverId_key" ON "DriverOnboarding"("companyId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOnboarding_vehicleId_key" ON "VehicleOnboarding"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleOnboarding_companyId_idx" ON "VehicleOnboarding"("companyId");

-- CreateIndex
CREATE INDEX "VehicleOnboarding_vendorId_idx" ON "VehicleOnboarding"("vendorId");

-- CreateIndex
CREATE INDEX "VehicleOnboarding_status_idx" ON "VehicleOnboarding"("status");

-- CreateIndex
CREATE INDEX "VehicleOnboarding_complianceScore_idx" ON "VehicleOnboarding"("complianceScore");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOnboarding_companyId_vehicleId_key" ON "VehicleOnboarding"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "EmployeeOnboarding_companyId_idx" ON "EmployeeOnboarding"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeOnboarding_status_idx" ON "EmployeeOnboarding"("status");

-- CreateIndex
CREATE INDEX "EmployeeOnboarding_department_idx" ON "EmployeeOnboarding"("department");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOnboarding_companyId_employeeId_key" ON "EmployeeOnboarding"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "ComplianceAlert_companyId_idx" ON "ComplianceAlert"("companyId");

-- CreateIndex
CREATE INDEX "ComplianceAlert_entityType_entityId_idx" ON "ComplianceAlert"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ComplianceAlert_status_idx" ON "ComplianceAlert"("status");

-- CreateIndex
CREATE INDEX "ComplianceAlert_alertType_idx" ON "ComplianceAlert"("alertType");

-- CreateIndex
CREATE INDEX "ComplianceAlert_expiryDate_idx" ON "ComplianceAlert"("expiryDate");

-- CreateIndex
CREATE INDEX "VendorOnboarding_companyId_idx" ON "VendorOnboarding"("companyId");

-- CreateIndex
CREATE INDEX "VendorOnboarding_status_idx" ON "VendorOnboarding"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorOnboarding_companyId_vendorCode_key" ON "VendorOnboarding"("companyId", "vendorCode");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "RecurringBooking_companyId_employeeId_idx" ON "RecurringBooking"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "RecurringBooking_status_idx" ON "RecurringBooking"("status");

-- CreateIndex
CREATE INDEX "TripStop_tripId_idx" ON "TripStop"("tripId");

-- CreateIndex
CREATE INDEX "TripStop_companyId_idx" ON "TripStop"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TripStop_tripId_sequence_key" ON "TripStop"("tripId", "sequence");

-- CreateIndex
CREATE INDEX "DispatchAssignment_companyId_tripId_idx" ON "DispatchAssignment"("companyId", "tripId");

-- CreateIndex
CREATE INDEX "DispatchAssignment_driverId_idx" ON "DispatchAssignment"("driverId");

-- CreateIndex
CREATE INDEX "DispatchAssignment_vehicleId_idx" ON "DispatchAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "ReplacementAssignment_companyId_incidentId_idx" ON "ReplacementAssignment"("companyId", "incidentId");

-- CreateIndex
CREATE INDEX "RouteDeviation_companyId_tripId_idx" ON "RouteDeviation"("companyId", "tripId");

-- CreateIndex
CREATE INDEX "RouteDeviation_status_idx" ON "RouteDeviation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportBanPolicy_companyId_key" ON "TransportBanPolicy"("companyId");

-- CreateIndex
CREATE INDEX "TransportBan_companyId_employeeId_idx" ON "TransportBan"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "TransportBan_status_idx" ON "TransportBan"("status");

-- CreateIndex
CREATE INDEX "TransportBan_companyId_status_idx" ON "TransportBan"("companyId", "status");

-- CreateIndex
CREATE INDEX "TransportBanRemovalRequest_companyId_banId_idx" ON "TransportBanRemovalRequest"("companyId", "banId");

-- CreateIndex
CREATE INDEX "TransportBanRemovalRequest_status_idx" ON "TransportBanRemovalRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportBanApproval_emailToken_key" ON "TransportBanApproval"("emailToken");

-- CreateIndex
CREATE INDEX "TransportBanApproval_companyId_removalRequestId_idx" ON "TransportBanApproval"("companyId", "removalRequestId");

-- CreateIndex
CREATE INDEX "TransportBanApproval_emailToken_idx" ON "TransportBanApproval"("emailToken");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_companyId_delegatorId_idx" ON "ApprovalDelegation"("companyId", "delegatorId");

-- CreateIndex
CREATE INDEX "Feedback_companyId_tripId_idx" ON "Feedback"("companyId", "tripId");

-- CreateIndex
CREATE INDEX "Feedback_companyId_employeeId_idx" ON "Feedback"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "Complaint_companyId_status_idx" ON "Complaint"("companyId", "status");

-- CreateIndex
CREATE INDEX "Complaint_companyId_employeeId_idx" ON "Complaint"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "LostFound_companyId_status_idx" ON "LostFound"("companyId", "status");

-- CreateIndex
CREATE INDEX "VehicleInspection_companyId_vehicleId_idx" ON "VehicleInspection"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "VehicleInspection_type_idx" ON "VehicleInspection"("type");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_companyId_vehicleId_idx" ON "VehicleMaintenance"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_status_idx" ON "VehicleMaintenance"("status");

-- CreateIndex
CREATE INDEX "Job_status_scheduledAt_idx" ON "Job"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "AIConversation_companyId_userId_idx" ON "AIConversation"("companyId", "userId");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AIUsage_companyId_createdAt_idx" ON "AIUsage"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsage_provider_idx" ON "AIUsage"("provider");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_companyId_category_idx" ON "KnowledgeDocument"("companyId", "category");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");

-- CreateIndex
CREATE INDEX "ManagerRelationship_companyId_managerId_idx" ON "ManagerRelationship"("companyId", "managerId");

-- CreateIndex
CREATE INDEX "ManagerRelationship_companyId_employeeId_idx" ON "ManagerRelationship"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerRelationship_companyId_employeeId_managerId_key" ON "ManagerRelationship"("companyId", "employeeId", "managerId");

-- CreateIndex
CREATE INDEX "EmployeeTransportEligibility_companyId_status_idx" ON "EmployeeTransportEligibility"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTransportEligibility_companyId_employeeId_key" ON "EmployeeTransportEligibility"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "Office_companyId_idx" ON "Office"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Office_companyId_name_key" ON "Office"("companyId", "name");

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_idx" ON "EmergencyContact"("userId");

-- CreateIndex
CREATE INDEX "DocumentUpload_companyId_entityType_entityId_idx" ON "DocumentUpload"("companyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "DocumentUpload_status_idx" ON "DocumentUpload"("status");

-- CreateIndex
CREATE INDEX "DocumentUpload_expiryDate_idx" ON "DocumentUpload"("expiryDate");

-- CreateIndex
CREATE INDEX "DriverPreferredArea_companyId_driverId_idx" ON "DriverPreferredArea"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverPreferredArea_active_idx" ON "DriverPreferredArea"("active");

-- CreateIndex
CREATE UNIQUE INDEX "DriverPreferredArea_companyId_driverId_name_key" ON "DriverPreferredArea"("companyId", "driverId", "name");

-- CreateIndex
CREATE INDEX "DriverAreaPreferenceSchedule_driverId_startAt_endAt_idx" ON "DriverAreaPreferenceSchedule"("driverId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "DriverAreaPreferenceSchedule_areaId_idx" ON "DriverAreaPreferenceSchedule"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverHomeBase_driverId_key" ON "DriverHomeBase"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverPreferenceConfig_companyId_key" ON "DriverPreferenceConfig"("companyId");

-- CreateIndex
CREATE INDEX "DemandPressureSnapshot_companyId_zoneName_idx" ON "DemandPressureSnapshot"("companyId", "zoneName");

-- CreateIndex
CREATE INDEX "DemandPressureSnapshot_companyId_snapshotTime_idx" ON "DemandPressureSnapshot"("companyId", "snapshotTime");

-- CreateIndex
CREATE INDEX "DispatchPreferenceAudit_companyId_driverId_idx" ON "DispatchPreferenceAudit"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DispatchPreferenceAudit_action_idx" ON "DispatchPreferenceAudit"("action");

-- CreateIndex
CREATE INDEX "DispatchPreferenceAudit_createdAt_idx" ON "DispatchPreferenceAudit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DriverComplianceStatus_driverId_key" ON "DriverComplianceStatus"("driverId");

-- CreateIndex
CREATE INDEX "DriverComplianceStatus_isBlocked_idx" ON "DriverComplianceStatus"("isBlocked");

-- CreateIndex
CREATE INDEX "DriverComplianceStatus_companyId_idx" ON "DriverComplianceStatus"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverComplianceStatus_companyId_driverId_key" ON "DriverComplianceStatus"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "BoardingVerification_tripId_idx" ON "BoardingVerification"("tripId");

-- CreateIndex
CREATE INDEX "BoardingVerification_companyId_idx" ON "BoardingVerification"("companyId");

-- CreateIndex
CREATE INDEX "PassengerBoarding_tripId_idx" ON "PassengerBoarding"("tripId");

-- CreateIndex
CREATE INDEX "PassengerBoarding_userId_idx" ON "PassengerBoarding"("userId");

-- CreateIndex
CREATE INDEX "TripChangeRequest_tripId_idx" ON "TripChangeRequest"("tripId");

-- CreateIndex
CREATE INDEX "TripChangeRequest_companyId_idx" ON "TripChangeRequest"("companyId");

-- CreateIndex
CREATE INDEX "TripChangeRequest_status_idx" ON "TripChangeRequest"("status");

-- CreateIndex
CREATE INDEX "RedispatchTrigger_tripId_idx" ON "RedispatchTrigger"("tripId");

-- CreateIndex
CREATE INDEX "RedispatchTrigger_companyId_idx" ON "RedispatchTrigger"("companyId");

-- CreateIndex
CREATE INDEX "CommunicationLog_companyId_channel_idx" ON "CommunicationLog"("companyId", "channel");

-- CreateIndex
CREATE INDEX "CommunicationLog_recipientId_idx" ON "CommunicationLog"("recipientId");

-- CreateIndex
CREATE INDEX "CommunicationLog_messageType_idx" ON "CommunicationLog"("messageType");

-- CreateIndex
CREATE INDEX "CommunicationLog_status_idx" ON "CommunicationLog"("status");

-- CreateIndex
CREATE INDEX "EmergencyBroadcast_companyId_idx" ON "EmergencyBroadcast"("companyId");

-- CreateIndex
CREATE INDEX "EmergencyBroadcast_status_idx" ON "EmergencyBroadcast"("status");

-- CreateIndex
CREATE INDEX "MassCancellation_companyId_idx" ON "MassCancellation"("companyId");

-- CreateIndex
CREATE INDEX "MassCancellation_status_idx" ON "MassCancellation"("status");

-- CreateIndex
CREATE INDEX "DriverWorkLog_companyId_shiftDate_idx" ON "DriverWorkLog"("companyId", "shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "DriverWorkLog_companyId_driverId_shiftDate_key" ON "DriverWorkLog"("companyId", "driverId", "shiftDate");

-- CreateIndex
CREATE INDEX "FuelEntry_vehicleId_idx" ON "FuelEntry"("vehicleId");

-- CreateIndex
CREATE INDEX "FuelEntry_companyId_idx" ON "FuelEntry"("companyId");

-- CreateIndex
CREATE INDEX "OdometerReading_vehicleId_idx" ON "OdometerReading"("vehicleId");

-- CreateIndex
CREATE INDEX "OdometerReading_companyId_idx" ON "OdometerReading"("companyId");

-- CreateIndex
CREATE INDEX "TripExpense_tripId_idx" ON "TripExpense"("tripId");

-- CreateIndex
CREATE INDEX "TripExpense_driverId_idx" ON "TripExpense"("driverId");

-- CreateIndex
CREATE INDEX "TripExpense_companyId_idx" ON "TripExpense"("companyId");

-- CreateIndex
CREATE INDEX "PassengerContactAttempt_tripId_passengerId_idx" ON "PassengerContactAttempt"("tripId", "passengerId");

-- CreateIndex
CREATE INDEX "PassengerContactAttempt_driverId_idx" ON "PassengerContactAttempt"("driverId");

-- CreateIndex
CREATE INDEX "PassengerContactAttempt_companyId_idx" ON "PassengerContactAttempt"("companyId");

-- CreateIndex
CREATE INDEX "NoShowEvidence_tripId_passengerId_idx" ON "NoShowEvidence"("tripId", "passengerId");

-- CreateIndex
CREATE INDEX "NoShowEvidence_companyId_idx" ON "NoShowEvidence"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "NoShowPolicyConfig_companyId_key" ON "NoShowPolicyConfig"("companyId");

-- CreateIndex
CREATE INDEX "GuardRequirement_companyId_status_idx" ON "GuardRequirement"("companyId", "status");

-- CreateIndex
CREATE INDEX "GuardRequirement_tripId_idx" ON "GuardRequirement"("tripId");

-- CreateIndex
CREATE INDEX "GuardRequirement_companyId_requiredAt_idx" ON "GuardRequirement"("companyId", "requiredAt");

-- CreateIndex
CREATE INDEX "SafetyOptimizationLog_companyId_tripId_idx" ON "SafetyOptimizationLog"("companyId", "tripId");

-- CreateIndex
CREATE INDEX "SafetyOptimizationLog_companyId_createdAt_idx" ON "SafetyOptimizationLog"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCapacityConfig_companyId_vehicleType_key" ON "VehicleCapacityConfig"("companyId", "vehicleType");

-- CreateIndex
CREATE INDEX "DriverShift_companyId_driverId_idx" ON "DriverShift"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverShift_isActive_idx" ON "DriverShift"("isActive");

-- CreateIndex
CREATE INDEX "DriverWorkSession_companyId_driverId_idx" ON "DriverWorkSession"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverWorkSession_status_idx" ON "DriverWorkSession"("status");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_companyId_driverId_idx" ON "DriverVehicleAssignment"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_companyId_vehicleId_idx" ON "DriverVehicleAssignment"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "DriverVehicleAssignment_status_idx" ON "DriverVehicleAssignment"("status");

-- CreateIndex
CREATE INDEX "VehicleBreakdown_companyId_vehicleId_idx" ON "VehicleBreakdown"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "VehicleBreakdown_status_idx" ON "VehicleBreakdown"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DriverWorkHoursPolicy_companyId_key" ON "DriverWorkHoursPolicy"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeImportJob_companyId_status_idx" ON "EmployeeImportJob"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmployeeImportJob_companyId_createdAt_idx" ON "EmployeeImportJob"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeImportRow_importJobId_status_idx" ON "EmployeeImportRow"("importJobId", "status");

-- CreateIndex
CREATE INDEX "TransportExpense_companyId_employeeId_idx" ON "TransportExpense"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "TransportExpense_companyId_status_idx" ON "TransportExpense"("companyId", "status");

-- CreateIndex
CREATE INDEX "TransportExpense_companyId_expenseDate_idx" ON "TransportExpense"("companyId", "expenseDate");

-- CreateIndex
CREATE INDEX "TransportExpense_bookingId_idx" ON "TransportExpense"("bookingId");

-- CreateIndex
CREATE INDEX "TransportExpense_tripId_idx" ON "TransportExpense"("tripId");

-- CreateIndex
CREATE INDEX "TransportExpense_receiptHash_idx" ON "TransportExpense"("receiptHash");

-- CreateIndex
CREATE INDEX "ExpenseDispute_companyId_expenseId_idx" ON "ExpenseDispute"("companyId", "expenseId");

-- CreateIndex
CREATE INDEX "ExpenseDispute_companyId_status_idx" ON "ExpenseDispute"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTransportLimit_employeeId_key" ON "EmployeeTransportLimit"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeTransportLimit_companyId_employeeId_idx" ON "EmployeeTransportLimit"("companyId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpensePolicyConfig_companyId_key" ON "ExpensePolicyConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverWallet_driverId_key" ON "DriverWallet"("driverId");

-- CreateIndex
CREATE INDEX "DriverWallet_companyId_driverId_idx" ON "DriverWallet"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverWalletTransaction_walletId_idx" ON "DriverWalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "DriverWalletTransaction_walletId_type_idx" ON "DriverWalletTransaction"("walletId", "type");

-- CreateIndex
CREATE INDEX "DriverWalletAdvance_companyId_driverId_idx" ON "DriverWalletAdvance"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverWalletAdvance_companyId_status_idx" ON "DriverWalletAdvance"("companyId", "status");

-- CreateIndex
CREATE INDEX "TripSharingContact_companyId_userId_idx" ON "TripSharingContact"("companyId", "userId");

-- CreateIndex
CREATE INDEX "PickupReminder_companyId_scheduledAt_status_idx" ON "PickupReminder"("companyId", "scheduledAt", "status");

-- CreateIndex
CREATE INDEX "PickupReminder_bookingId_idx" ON "PickupReminder"("bookingId");

-- CreateIndex
CREATE INDEX "RouteMatchCandidate_companyId_completingTripId_idx" ON "RouteMatchCandidate"("companyId", "completingTripId");

-- CreateIndex
CREATE INDEX "RouteMatchCandidate_companyId_driverId_status_idx" ON "RouteMatchCandidate"("companyId", "driverId", "status");

-- CreateIndex
CREATE INDEX "RouteMatchCandidate_companyId_status_idx" ON "RouteMatchCandidate"("companyId", "status");

-- CreateIndex
CREATE INDEX "CommunicationPreference_companyId_idx" ON "CommunicationPreference"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationPreference_companyId_userId_key" ON "CommunicationPreference"("companyId", "userId");

-- CreateIndex
CREATE INDEX "DriverDevice_companyId_driverId_idx" ON "DriverDevice"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverDevice_driverId_isActive_idx" ON "DriverDevice"("driverId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DriverDevice_companyId_driverId_deviceFingerprint_key" ON "DriverDevice"("companyId", "driverId", "deviceFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "AdminMFASecret_userId_key" ON "AdminMFASecret"("userId");

-- CreateIndex
CREATE INDEX "BudgetAllocation_companyId_level_idx" ON "BudgetAllocation"("companyId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAllocation_companyId_level_levelId_fiscalYear_fiscalM_key" ON "BudgetAllocation"("companyId", "level", "levelId", "fiscalYear", "fiscalMonth");

-- CreateIndex
CREATE INDEX "VendorSLAPenalty_companyId_vendorId_period_idx" ON "VendorSLAPenalty"("companyId", "vendorId", "period");

-- CreateIndex
CREATE INDEX "VendorSLAPenalty_companyId_status_idx" ON "VendorSLAPenalty"("companyId", "status");

-- CreateIndex
CREATE INDEX "InvoiceReconciliation_companyId_vendorInvoiceId_idx" ON "InvoiceReconciliation"("companyId", "vendorInvoiceId");

-- CreateIndex
CREATE INDEX "InvoiceReconciliation_companyId_status_idx" ON "InvoiceReconciliation"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmergencyEvacuation_companyId_status_idx" ON "EmergencyEvacuation"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmergencyEvacuation_companyId_effectiveFrom_idx" ON "EmergencyEvacuation"("companyId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "TransportAccessRole_companyId_idx" ON "TransportAccessRole"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportAccessRole_companyId_roleName_key" ON "TransportAccessRole"("companyId", "roleName");

-- CreateIndex
CREATE INDEX "TransportAccessAssignment_companyId_userId_idx" ON "TransportAccessAssignment"("companyId", "userId");

-- CreateIndex
CREATE INDEX "TransportAccessAssignment_companyId_roleId_idx" ON "TransportAccessAssignment"("companyId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportAccessAssignment_companyId_userId_roleId_key" ON "TransportAccessAssignment"("companyId", "userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorManagement_vendorId_key" ON "VendorManagement"("vendorId");

-- CreateIndex
CREATE INDEX "VendorManagement_companyId_status_idx" ON "VendorManagement"("companyId", "status");

-- CreateIndex
CREATE INDEX "VendorManagement_companyId_vendorId_idx" ON "VendorManagement"("companyId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverManagement_driverId_key" ON "DriverManagement"("driverId");

-- CreateIndex
CREATE INDEX "DriverManagement_companyId_status_idx" ON "DriverManagement"("companyId", "status");

-- CreateIndex
CREATE INDEX "DriverManagement_companyId_vendorId_idx" ON "DriverManagement"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "DriverManagement_companyId_isAvailable_idx" ON "DriverManagement"("companyId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleManagement_vehicleId_key" ON "VehicleManagement"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleManagement_companyId_status_idx" ON "VehicleManagement"("companyId", "status");

-- CreateIndex
CREATE INDEX "VehicleManagement_companyId_vehicleType_idx" ON "VehicleManagement"("companyId", "vehicleType");

-- CreateIndex
CREATE INDEX "VehicleManagement_companyId_isAvailable_idx" ON "VehicleManagement"("companyId", "isAvailable");

-- CreateIndex
CREATE INDEX "RouteManagement_companyId_routeType_idx" ON "RouteManagement"("companyId", "routeType");

-- CreateIndex
CREATE INDEX "RouteManagement_companyId_status_idx" ON "RouteManagement"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RouteManagement_companyId_routeCode_key" ON "RouteManagement"("companyId", "routeCode");

-- CreateIndex
CREATE INDEX "NodalPoint_companyId_isActive_idx" ON "NodalPoint"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NodalPoint_companyId_nodalCode_key" ON "NodalPoint"("companyId", "nodalCode");

-- CreateIndex
CREATE INDEX "ShuttleRoute_companyId_isActive_idx" ON "ShuttleRoute"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShuttleRoute_companyId_shuttleCode_key" ON "ShuttleRoute"("companyId", "shuttleCode");

-- CreateIndex
CREATE INDEX "OfficeLocation_companyId_isActive_idx" ON "OfficeLocation"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeLocation_companyId_locationCode_key" ON "OfficeLocation"("companyId", "locationCode");

-- CreateIndex
CREATE INDEX "EmployeeCSVImport_companyId_status_idx" ON "EmployeeCSVImport"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmployeeCSVImport_companyId_importedBy_idx" ON "EmployeeCSVImport"("companyId", "importedBy");

-- CreateIndex
CREATE INDEX "EmployeeCSVRow_importJobId_status_idx" ON "EmployeeCSVRow"("importJobId", "status");

-- CreateIndex
CREATE INDEX "EmployeeCSVRow_companyId_employeeId_idx" ON "EmployeeCSVRow"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "NoShowPolicy_companyId_isActive_idx" ON "NoShowPolicy"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "NoShowPolicy_companyId_policyType_idx" ON "NoShowPolicy"("companyId", "policyType");

-- CreateIndex
CREATE INDEX "EmployeeNoShowRecord_companyId_userId_idx" ON "EmployeeNoShowRecord"("companyId", "userId");

-- CreateIndex
CREATE INDEX "EmployeeNoShowRecord_companyId_tripDate_idx" ON "EmployeeNoShowRecord"("companyId", "tripDate");

-- CreateIndex
CREATE INDEX "EmployeeNoShowRecord_companyId_actionTaken_idx" ON "EmployeeNoShowRecord"("companyId", "actionTaken");

-- CreateIndex
CREATE INDEX "TransportBanRecord_companyId_userId_idx" ON "TransportBanRecord"("companyId", "userId");

-- CreateIndex
CREATE INDEX "TransportBanRecord_companyId_status_idx" ON "TransportBanRecord"("companyId", "status");

-- CreateIndex
CREATE INDEX "TransportBanRecord_companyId_banType_idx" ON "TransportBanRecord"("companyId", "banType");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_companyId_workflowType_status_idx" ON "ApprovalWorkflow"("companyId", "workflowType", "status");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_companyId_requestedBy_idx" ON "ApprovalWorkflow"("companyId", "requestedBy");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_companyId_currentApproverId_idx" ON "ApprovalWorkflow"("companyId", "currentApproverId");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_companyId_status_idx" ON "ApprovalWorkflow"("companyId", "status");

-- CreateIndex
CREATE INDEX "ApprovalLevel_companyId_workflowType_idx" ON "ApprovalLevel"("companyId", "workflowType");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalLevel_companyId_workflowType_level_key" ON "ApprovalLevel"("companyId", "workflowType", "level");

-- CreateIndex
CREATE INDEX "EmergencyBuzzer_companyId_status_idx" ON "EmergencyBuzzer"("companyId", "status");

-- CreateIndex
CREATE INDEX "EmergencyBuzzer_companyId_userId_idx" ON "EmergencyBuzzer"("companyId", "userId");

-- CreateIndex
CREATE INDEX "EmergencyBuzzer_companyId_triggerType_idx" ON "EmergencyBuzzer"("companyId", "triggerType");

-- CreateIndex
CREATE INDEX "EmergencySystemContact_companyId_isActive_idx" ON "EmergencySystemContact"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "TransportPolicyConfig_companyId_category_idx" ON "TransportPolicyConfig"("companyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "TransportPolicyConfig_companyId_configKey_key" ON "TransportPolicyConfig"("companyId", "configKey");

-- CreateIndex
CREATE INDEX "PickupDropTiming_companyId_isActive_idx" ON "PickupDropTiming"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PickupDropTiming_companyId_shiftCode_key" ON "PickupDropTiming"("companyId", "shiftCode");

-- CreateIndex
CREATE INDEX "TransportBoundary_companyId_boundaryType_idx" ON "TransportBoundary"("companyId", "boundaryType");

-- CreateIndex
CREATE INDEX "TransportBoundary_companyId_isActive_idx" ON "TransportBoundary"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "CabCapacityConfig_companyId_isActive_idx" ON "CabCapacityConfig"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CabCapacityConfig_companyId_vehicleType_configName_key" ON "CabCapacityConfig"("companyId", "vehicleType", "configName");

-- CreateIndex
CREATE INDEX "HealthyEmployee_companyId_userId_idx" ON "HealthyEmployee"("companyId", "userId");

-- CreateIndex
CREATE INDEX "HealthyEmployee_companyId_healthStatus_idx" ON "HealthyEmployee"("companyId", "healthStatus");

-- CreateIndex
CREATE INDEX "HealthyEmployee_companyId_isActive_idx" ON "HealthyEmployee"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "DashboardAnalytics_companyId_analyticsDate_idx" ON "DashboardAnalytics"("companyId", "analyticsDate");

-- CreateIndex
CREATE INDEX "DashboardAnalytics_companyId_metricType_idx" ON "DashboardAnalytics"("companyId", "metricType");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardAnalytics_companyId_analyticsDate_metricType_metri_key" ON "DashboardAnalytics"("companyId", "analyticsDate", "metricType", "metricKey");

-- CreateIndex
CREATE INDEX "VendorPerformanceMetric_companyId_vendorId_idx" ON "VendorPerformanceMetric"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "VendorPerformanceMetric_companyId_periodStart_idx" ON "VendorPerformanceMetric"("companyId", "periodStart");

-- CreateIndex
CREATE INDEX "DriverPerformanceMetric_companyId_driverId_idx" ON "DriverPerformanceMetric"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "DriverPerformanceMetric_companyId_periodStart_idx" ON "DriverPerformanceMetric"("companyId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "VendorUser_userId_key" ON "VendorUser"("userId");

-- CreateIndex
CREATE INDEX "VendorUser_companyId_vendorId_idx" ON "VendorUser"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "VendorUser_userId_idx" ON "VendorUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDriverProfile_driverId_key" ON "VendorDriverProfile"("driverId");

-- CreateIndex
CREATE INDEX "VendorDriverProfile_companyId_vendorId_idx" ON "VendorDriverProfile"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "VendorDriverProfile_companyId_status_idx" ON "VendorDriverProfile"("companyId", "status");

-- CreateIndex
CREATE INDEX "VendorDriverProfile_companyId_isAvailable_idx" ON "VendorDriverProfile"("companyId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "VendorVehicle_vehicleId_key" ON "VendorVehicle"("vehicleId");

-- CreateIndex
CREATE INDEX "VendorVehicle_companyId_vendorId_idx" ON "VendorVehicle"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "VendorVehicle_companyId_status_idx" ON "VendorVehicle"("companyId", "status");

-- CreateIndex
CREATE INDEX "VendorVehicle_companyId_isAvailable_idx" ON "VendorVehicle"("companyId", "isAvailable");

-- CreateIndex
CREATE INDEX "VendorTripRecord_companyId_vendorId_idx" ON "VendorTripRecord"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "VendorTripRecord_companyId_status_idx" ON "VendorTripRecord"("companyId", "status");

-- CreateIndex
CREATE INDEX "VendorTripRecord_vendorId_createdAt_idx" ON "VendorTripRecord"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "VendorPaymentRecord_companyId_vendorId_idx" ON "VendorPaymentRecord"("companyId", "vendorId");

-- CreateIndex
CREATE INDEX "VendorPaymentRecord_companyId_status_idx" ON "VendorPaymentRecord"("companyId", "status");

-- CreateIndex
CREATE INDEX "ComplianceTeam_companyId_isActive_idx" ON "ComplianceTeam"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceTeam_companyId_userId_key" ON "ComplianceTeam"("companyId", "userId");

-- CreateIndex
CREATE INDEX "CompanyDocumentType_companyId_forEntityType_idx" ON "CompanyDocumentType"("companyId", "forEntityType");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDocumentType_companyId_documentType_forEntityType_key" ON "CompanyDocumentType"("companyId", "documentType", "forEntityType");

-- CreateIndex
CREATE INDEX "CompanyComplianceDoc_companyId_entityType_entityId_idx" ON "CompanyComplianceDoc"("companyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "CompanyComplianceDoc_companyId_status_idx" ON "CompanyComplianceDoc"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanyComplianceDoc_companyId_documentType_idx" ON "CompanyComplianceDoc"("companyId", "documentType");

-- CreateIndex
CREATE INDEX "CompanyComplianceDoc_companyId_expiryDate_idx" ON "CompanyComplianceDoc"("companyId", "expiryDate");

-- CreateIndex
CREATE INDEX "ComplianceAudit_companyId_status_idx" ON "ComplianceAudit"("companyId", "status");

-- CreateIndex
CREATE INDEX "ComplianceAudit_companyId_entityType_entityId_idx" ON "ComplianceAudit"("companyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ComplianceAudit_companyId_auditType_idx" ON "ComplianceAudit"("companyId", "auditType");

-- CreateIndex
CREATE INDEX "ComplianceAudit_companyId_auditorId_idx" ON "ComplianceAudit"("companyId", "auditorId");

-- CreateIndex
CREATE INDEX "ComplianceTask_companyId_status_idx" ON "ComplianceTask"("companyId", "status");

-- CreateIndex
CREATE INDEX "ComplianceTask_companyId_assignedTo_idx" ON "ComplianceTask"("companyId", "assignedTo");

-- CreateIndex
CREATE INDEX "ComplianceTask_companyId_taskType_idx" ON "ComplianceTask"("companyId", "taskType");

-- CreateIndex
CREATE INDEX "CompliancePolicy_companyId_category_idx" ON "CompliancePolicy"("companyId", "category");

-- CreateIndex
CREATE INDEX "CompliancePolicy_companyId_isActive_idx" ON "CompliancePolicy"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CompliancePolicy_companyId_policyCode_key" ON "CompliancePolicy"("companyId", "policyCode");

-- CreateIndex
CREATE INDEX "CabApproval_companyId_status_idx" ON "CabApproval"("companyId", "status");

-- CreateIndex
CREATE INDEX "CabApproval_companyId_vehicleId_idx" ON "CabApproval"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "CabApproval_companyId_requestType_idx" ON "CabApproval"("companyId", "requestType");

-- CreateIndex
CREATE UNIQUE INDEX "SuperComplianceConfig_configKey_key" ON "SuperComplianceConfig"("configKey");

-- CreateIndex
CREATE INDEX "SuperComplianceConfig_category_idx" ON "SuperComplianceConfig"("category");

-- CreateIndex
CREATE INDEX "SuperComplianceAudit_companyId_status_idx" ON "SuperComplianceAudit"("companyId", "status");

-- CreateIndex
CREATE INDEX "SuperComplianceAudit_auditorId_idx" ON "SuperComplianceAudit"("auditorId");

-- CreateIndex
CREATE INDEX "SuperComplianceAudit_status_scheduledDate_idx" ON "SuperComplianceAudit"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "SuperComplianceAlert_companyId_status_idx" ON "SuperComplianceAlert"("companyId", "status");

-- CreateIndex
CREATE INDEX "SuperComplianceAlert_companyId_alertType_idx" ON "SuperComplianceAlert"("companyId", "alertType");

-- CreateIndex
CREATE INDEX "SuperComplianceAlert_companyId_severity_idx" ON "SuperComplianceAlert"("companyId", "severity");

-- CreateIndex
CREATE INDEX "SuperComplianceScore_companyId_overallScore_idx" ON "SuperComplianceScore"("companyId", "overallScore");

-- CreateIndex
CREATE INDEX "SuperComplianceScore_evaluationDate_idx" ON "SuperComplianceScore"("evaluationDate");

-- CreateIndex
CREATE UNIQUE INDEX "SuperComplianceScore_companyId_period_key" ON "SuperComplianceScore"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformComplianceRule_ruleCode_key" ON "PlatformComplianceRule"("ruleCode");

-- CreateIndex
CREATE INDEX "PlatformComplianceRule_category_severity_idx" ON "PlatformComplianceRule"("category", "severity");

-- CreateIndex
CREATE INDEX "PlatformComplianceRule_isActive_idx" ON "PlatformComplianceRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyComplianceStanding_companyId_key" ON "CompanyComplianceStanding"("companyId");

-- CreateIndex
CREATE INDEX "CompanyComplianceStanding_companyId_overallGrade_idx" ON "CompanyComplianceStanding"("companyId", "overallGrade");

-- CreateIndex
CREATE INDEX "CompanyComplianceStanding_companyId_overallScore_idx" ON "CompanyComplianceStanding"("companyId", "overallScore");

-- CreateIndex
CREATE INDEX "CompanySite_companyId_idx" ON "CompanySite"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySite_companyId_siteCode_key" ON "CompanySite"("companyId", "siteCode");

-- CreateIndex
CREATE INDEX "LineOfBusiness_companyId_idx" ON "LineOfBusiness"("companyId");

-- CreateIndex
CREATE INDEX "LineOfBusiness_siteId_idx" ON "LineOfBusiness"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "LineOfBusiness_companyId_lobCode_key" ON "LineOfBusiness"("companyId", "lobCode");

-- CreateIndex
CREATE INDEX "OrgProcess_companyId_idx" ON "OrgProcess"("companyId");

-- CreateIndex
CREATE INDEX "OrgProcess_lobId_idx" ON "OrgProcess"("lobId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgProcess_companyId_processCode_key" ON "OrgProcess"("companyId", "processCode");

-- CreateIndex
CREATE INDEX "AccessScope_companyId_userId_idx" ON "AccessScope"("companyId", "userId");

-- CreateIndex
CREATE INDEX "AccessScope_userId_idx" ON "AccessScope"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessScope_userId_siteId_lobId_processId_shiftId_key" ON "AccessScope"("userId", "siteId", "lobId", "processId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionDefinition_code_key" ON "PermissionDefinition"("code");

-- CreateIndex
CREATE INDEX "PermissionDefinition_module_idx" ON "PermissionDefinition"("module");

-- CreateIndex
CREATE INDEX "PermissionDefinition_category_idx" ON "PermissionDefinition"("category");

-- CreateIndex
CREATE INDEX "RolePermissionConfig_companyId_roleId_idx" ON "RolePermissionConfig"("companyId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermissionConfig_companyId_roleId_permissionId_key" ON "RolePermissionConfig"("companyId", "roleId", "permissionId");

-- CreateIndex
CREATE INDEX "ApprovalLevelConfig_companyId_workflowType_idx" ON "ApprovalLevelConfig"("companyId", "workflowType");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalLevelConfig_companyId_workflowType_level_key" ON "ApprovalLevelConfig"("companyId", "workflowType", "level");

-- CreateIndex
CREATE INDEX "UserAccessScopeHistory_companyId_userId_idx" ON "UserAccessScopeHistory"("companyId", "userId");

-- CreateIndex
CREATE INDEX "UserAccessScopeHistory_createdAt_idx" ON "UserAccessScopeHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Region_companyId_idx" ON "Region"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_companyId_regionCode_key" ON "Region"("companyId", "regionCode");

-- CreateIndex
CREATE INDEX "EmployeeOrgAssignment_companyId_userId_idx" ON "EmployeeOrgAssignment"("companyId", "userId");

-- CreateIndex
CREATE INDEX "EmployeeOrgAssignment_userId_idx" ON "EmployeeOrgAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeOrgAssignment_userId_siteId_lobId_processId_shiftId_key" ON "EmployeeOrgAssignment"("userId", "siteId", "lobId", "processId", "shiftId");

-- CreateIndex
CREATE INDEX "PickupArrivalEvent_companyId_tripId_idx" ON "PickupArrivalEvent"("companyId", "tripId");

-- CreateIndex
CREATE INDEX "PickupArrivalEvent_companyId_driverId_idx" ON "PickupArrivalEvent"("companyId", "driverId");

-- CreateIndex
CREATE INDEX "PickupArrivalEvent_tripId_idx" ON "PickupArrivalEvent"("tripId");

-- CreateIndex
CREATE INDEX "SupervisorCallRequest_companyId_tripId_idx" ON "SupervisorCallRequest"("companyId", "tripId");

-- CreateIndex
CREATE INDEX "SupervisorCallRequest_companyId_status_idx" ON "SupervisorCallRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "SupervisorCallRequest_companyId_assignedSupervisorId_idx" ON "SupervisorCallRequest"("companyId", "assignedSupervisorId");

-- CreateIndex
CREATE INDEX "NoShowAppeal_companyId_status_idx" ON "NoShowAppeal"("companyId", "status");

-- CreateIndex
CREATE INDEX "NoShowAppeal_companyId_passengerId_idx" ON "NoShowAppeal"("companyId", "passengerId");

-- CreateIndex
CREATE INDEX "NoShowAppeal_companyId_tripId_idx" ON "NoShowAppeal"("companyId", "tripId");

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_buId_fkey" FOREIGN KEY ("buId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTrip" ADD CONSTRAINT "DriverTrip_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTrip" ADD CONSTRAINT "DriverTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportPolicy" ADD CONSTRAINT "TransportPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_managerBookerId_fkey" FOREIGN KEY ("managerBookerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPassenger" ADD CONSTRAINT "BookingPassenger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShuttleBooking" ADD CONSTRAINT "ShuttleBooking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShuttleBooking" ADD CONSTRAINT "ShuttleBooking_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShuttleBooking" ADD CONSTRAINT "ShuttleBooking_pickupStopId_fkey" FOREIGN KEY ("pickupStopId") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShuttleBooking" ADD CONSTRAINT "ShuttleBooking_dropStopId_fkey" FOREIGN KEY ("dropStopId") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEntry" ADD CONSTRAINT "ApprovalEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEntry" ADD CONSTRAINT "ApprovalEntry_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEntry" ADD CONSTRAINT "ApprovalEntry_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ApprovalConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPassenger" ADD CONSTRAINT "TripPassenger_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPassenger" ADD CONSTRAINT "TripPassenger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boarding" ADD CONSTRAINT "Boarding_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boarding" ADD CONSTRAINT "Boarding_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boarding" ADD CONSTRAINT "Boarding_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatestVehicleLocation" ADD CONSTRAINT "LatestVehicleLocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOSAlert" ADD CONSTRAINT "SOSAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOSAlert" ADD CONSTRAINT "SOSAlert_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOSAlert" ADD CONSTRAINT "SOSAlert_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCardHistory" ADD CONSTRAINT "RateCardHistory_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCostSnapshot" ADD CONSTRAINT "TripCostSnapshot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCostSnapshot" ADD CONSTRAINT "TripCostSnapshot_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCostSnapshot" ADD CONSTRAINT "TripCostSnapshot_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCost" ADD CONSTRAINT "TripCost_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCost" ADD CONSTRAINT "TripCost_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceConfig" ADD CONSTRAINT "ComplianceConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRule" ADD CONSTRAINT "ComplianceRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "ComplianceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverOnboarding" ADD CONSTRAINT "DriverOnboarding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOnboarding" ADD CONSTRAINT "VehicleOnboarding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOnboarding" ADD CONSTRAINT "EmployeeOnboarding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAlert" ADD CONSTRAINT "ComplianceAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOnboarding" ADD CONSTRAINT "VendorOnboarding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAreaPreferenceSchedule" ADD CONSTRAINT "DriverAreaPreferenceSchedule_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "DriverPreferredArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverComplianceStatus" ADD CONSTRAINT "DriverComplianceStatus_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverShift" ADD CONSTRAINT "DriverShift_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWorkSession" ADD CONSTRAINT "DriverWorkSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleBreakdown" ADD CONSTRAINT "VehicleBreakdown_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleBreakdown" ADD CONSTRAINT "VehicleBreakdown_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverWalletTransaction" ADD CONSTRAINT "DriverWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "DriverWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportAccessAssignment" ADD CONSTRAINT "TransportAccessAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TransportAccessRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySite" ADD CONSTRAINT "CompanySite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySite" ADD CONSTRAINT "CompanySite_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySite" ADD CONSTRAINT "CompanySite_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineOfBusiness" ADD CONSTRAINT "LineOfBusiness_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineOfBusiness" ADD CONSTRAINT "LineOfBusiness_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgProcess" ADD CONSTRAINT "OrgProcess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgProcess" ADD CONSTRAINT "OrgProcess_lobId_fkey" FOREIGN KEY ("lobId") REFERENCES "LineOfBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessScope" ADD CONSTRAINT "AccessScope_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessScope" ADD CONSTRAINT "AccessScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessScope" ADD CONSTRAINT "AccessScope_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessScope" ADD CONSTRAINT "AccessScope_lobId_fkey" FOREIGN KEY ("lobId") REFERENCES "LineOfBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessScope" ADD CONSTRAINT "AccessScope_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OrgProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessScope" ADD CONSTRAINT "AccessScope_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissionConfig" ADD CONSTRAINT "RolePermissionConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissionConfig" ADD CONSTRAINT "RolePermissionConfig_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TransportAccessRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissionConfig" ADD CONSTRAINT "RolePermissionConfig_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "PermissionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalLevelConfig" ADD CONSTRAINT "ApprovalLevelConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalLevelConfig" ADD CONSTRAINT "ApprovalLevelConfig_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "TransportAccessRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrgAssignment" ADD CONSTRAINT "EmployeeOrgAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrgAssignment" ADD CONSTRAINT "EmployeeOrgAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CompanySite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrgAssignment" ADD CONSTRAINT "EmployeeOrgAssignment_lobId_fkey" FOREIGN KEY ("lobId") REFERENCES "LineOfBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrgAssignment" ADD CONSTRAINT "EmployeeOrgAssignment_processId_fkey" FOREIGN KEY ("processId") REFERENCES "OrgProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeOrgAssignment" ADD CONSTRAINT "EmployeeOrgAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;


