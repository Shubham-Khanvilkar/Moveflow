// ============================================================
// Move In Sync - Complete Type Definitions
// ============================================================

// ============================================================
// AUTH & USER TYPES
// ============================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'TRANSPORT_ADMIN'
  | 'DISPATCHER'
  | 'MANAGER'
  | 'TEAM_LEADER'
  | 'EMPLOYEE'
  | 'DRIVER'
  | 'GUARD';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ON_LEAVE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
export type TransportEligibility = 'ELIGIBLE' | 'INELIGIBLE' | 'TEMPORARY';

export interface User {
  id: string;
  employeeId?: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  gender?: Gender;
  companyId: string;
  businessUnitId?: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  teamLeaderId?: string;
  designation?: string;
  employmentType?: EmploymentType;
  shiftId?: string;
  homeLatitude?: number;
  homeLongitude?: number;
  homeAddress?: string;
  defaultPickup?: string;
  defaultDrop?: string;
  transportEligibility: TransportEligibility;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: UserStatus;
  roles: string[];
}

// ============================================================
// ORGANIZATION TYPES
// ============================================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  settings: Record<string, unknown>;
}

export interface BusinessUnit {
  id: string;
  name: string;
  companyId: string;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
  buId?: string;
}

export interface Team {
  id: string;
  name: string;
  companyId: string;
  departmentId?: string;
}

// ============================================================
// VEHICLE TYPES
// ============================================================

export type VehicleType = 'CAB' | 'SEDAN' | 'SUV' | 'VAN' | 'SHUTTLE' | 'BUS';
export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'CNG';
export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'MAINTENANCE' | 'OFFLINE' | 'RETIRED';

export interface Vehicle {
  id: string;
  registrationNo: string;
  vehicleType: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  capacity: number;
  fuelType?: FuelType;
  color?: string;
  gpsDeviceId?: string;
  vendorId?: string;
  companyId: string;
  status: VehicleStatus;
  insuranceExpiry?: string;
  permitExpiry?: string;
  fitnessExpiry?: string;
  pollutionExpiry?: string;
  latitude?: number;
  longitude?: number;
  heading?: number;
  speed?: number;
  lastLocationUpdate?: string;
}

// ============================================================
// DRIVER TYPES
// ============================================================

export type DriverStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'OFFLINE' | 'SUSPENDED';

export interface DriverProfile {
  id: string;
  userId: string;
  licenseNo: string;
  licenseExpiry: string;
  vendorId?: string;
  rating: number;
  totalTrips: number;
  status: DriverStatus;
  vehicleId?: string;
  companyId: string;
  user?: User;
  vehicle?: Vehicle;
}

// ============================================================
// VENDOR TYPES
// ============================================================

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contractStart?: string;
  contractEnd?: string;
  billingModel?: string;
  status: VendorStatus;
  companyId: string;
}

// ============================================================
// ROUTE TYPES
// ============================================================

export type RouteStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Route {
  id: string;
  routeCode: string;
  routeName: string;
  origin?: string;
  destination?: string;
  distanceKm?: number;
  estimatedDuration?: number;
  companyId: string;
  status: RouteStatus;
  stops: RouteStop[];
}

export interface RouteStop {
  id: string;
  routeId: string;
  sequence: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  arrivalOffset?: number;
  departureOffset?: number;
  isPickup: boolean;
  isDrop: boolean;
}

// ============================================================
// SERVICE TYPES
// ============================================================

export type ServiceType = 'CAB' | 'SHUTTLE' | 'BUS';

// ============================================================
// BOOKING TYPES
// ============================================================

export type BookingType = 'CAB' | 'SHUTTLE' | 'BUS';

export type BookingStatus =
  | 'REQUESTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISPATCHING'
  | 'ASSIGNED'
  | 'DRIVER_CONFIRMED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'BOARDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED';

export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface Booking {
  id: string;
  bookingCode: string;
  type: BookingType;
  status: BookingStatus;
  requesterId: string;
  passengerCount: number;
  serviceType: ServiceType;
  routeId?: string;
  date: string;
  pickupTime: string;
  returnTrip: boolean;
  returnTime?: string;
  isRecurring: boolean;
  recurrencePattern?: Record<string, unknown>;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupLandmark?: string;
  pickupRadius?: number;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
  dropLandmark?: string;
  purpose?: string;
  department?: string;
  costCenter?: string;
  project?: string;
  specialRequirements?: string;
  notes?: string;
  approvalStatus: ApprovalStatus;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  tripId?: string;
  companyId: string;
  costCenterId?: string;
  // Pricing snapshot at booking time
  rateCardId?: string;
  estimatedCost?: number;
  acType?: AcType;
  createdAt: string;
  updatedAt: string;
}

export interface BookingPassenger {
  id: string;
  bookingId: string;
  userId: string;
}

// ============================================================
// SHUTTLE BOOKING TYPES
// ============================================================

export type ShuttleBookingStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'BOARDED' | 'NO_SHOW';

export interface ShuttleBooking {
  id: string;
  bookingId: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  seatNumber?: number;
  status: ShuttleBookingStatus;
}

// ============================================================
// TRIP TYPES
// ============================================================

export type TripStatus =
  | 'SCHEDULED'
  | 'DISPATCHED'
  | 'DRIVER_ACCEPTED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'BOARDING'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_DROP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DELAYED';

export type BoardingStatus = 'SCHEDULED' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';

export interface Trip {
  id: string;
  tripCode: string;
  status: TripStatus;
  type: BookingType;
  routeId?: string;
  routePolyline?: string;
  plannedPolyline?: string;
  vehicleId?: string;
  driverId?: string;
  date: string;
  scheduledPickupTime: string;
  actualPickupTime?: string;
  scheduledDropTime?: string;
  actualDropTime?: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  dropAddress: string;
  distanceKm?: number;
  plannedDuration?: number;
  actualDuration?: number;
  estimatedCost?: number;
  actualCost?: number;
  passengerCount: number;
  boardedCount: number;
  noShowCount: number;
  isTracking: boolean;
  startedAt?: string;
  completedAt?: string;
  companyId: string;
}

export interface TripPassenger {
  id: string;
  tripId: string;
  userId: string;
  boardingStatus: BoardingStatus;
  boardedImage?: string;
  boardedImageAt?: string;
}

// ============================================================
// PRICING ENGINE TYPES
// ============================================================

export type AcType = 'AC' | 'NON_AC';

export type NightChargeType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'PER_KM';

export type RoundingMode = 'ROUND_TO_NEAREST_1' | 'ROUND_TO_NEAREST_5' | 'ROUND_TO_NEAREST_10' | 'NO_ROUNDING';

export type TollPolicy = 'NOT_INCLUDED' | 'INCLUDED' | 'VENDOR_REPORTED' | 'MANUALLY_ENTERED';

export type ParkingPolicy = 'NOT_INCLUDED' | 'INCLUDED' | 'VENDOR_REPORTED' | 'MANUALLY_ENTERED';

export type TripCostStatus = 'ESTIMATED' | 'FINAL' | 'DISPUTED' | 'VOIDED';

// ============================================================
// RATE CARD
// ============================================================

export interface RateCard {
  id: string;
  name: string;
  code?: string;
  companyId: string;

  // Classification
  serviceType: ServiceType;
  vehicleType?: VehicleType;
  acType?: AcType;
  vendorId?: string;
  vendor?: Vendor;
  city?: string;
  routeCode?: string;
  costCenterId?: string;

  // Pricing
  baseFare: number;
  perKmRate: number;           // PRIMARY: cost per kilometer
  perHourRate: number;
  minimumKm: number;           // minimum billable km
  minimumFare: number;         // minimum total fare
  waitingChargePerMin: number;
  freeWaitingMinutes: number;

  // Night charge
  nightChargeType: NightChargeType;
  nightChargeValue: number;    // % or flat amount

  // Additional charges
  airportCharge: number;
  additionalPassengerCharge: number;

  // Toll & Parking policy
  tollPolicy: TollPolicy;
  tollAmount: number;
  parkingPolicy: ParkingPolicy;
  parkingAmount: number;

  // Validity
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  priority: number;

  // Metadata
  version: number;
  createdById?: string;
  lastModifiedById?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface RateCardCreateInput {
  name: string;
  code?: string;
  serviceType: ServiceType;
  vehicleType?: VehicleType;
  acType?: AcType;
  vendorId?: string;
  city?: string;
  routeCode?: string;
  costCenterId?: string;
  baseFare: number;
  perKmRate: number;
  perHourRate: number;
  minimumKm: number;
  minimumFare: number;
  waitingChargePerMin: number;
  freeWaitingMinutes: number;
  nightChargeType: NightChargeType;
  nightChargeValue: number;
  airportCharge: number;
  additionalPassengerCharge: number;
  tollPolicy: TollPolicy;
  tollAmount: number;
  parkingPolicy: ParkingPolicy;
  parkingAmount: number;
  effectiveFrom: string;
  effectiveTo?: string;
  priority?: number;
  notes?: string;
}

export interface RateCardUpdateInput extends Partial<RateCardCreateInput> {
  isActive?: boolean;
  changeReason?: string;
}

// ============================================================
// RATE CARD HISTORY
// ============================================================

export interface RateCardHistory {
  id: string;
  rateCardId: string;
  version: number;
  snapshot: RateCard; // full rate card data at this version
  changedById?: string;
  changedByName?: string;
  changeReason?: string;
  changedAt: string;
}

// ============================================================
// PRICING CONFIGURATION
// ============================================================

export interface PricingConfig {
  id: string;
  companyId: string;
  roundingMode: RoundingMode;
  roundingPrecision: number;
  nightChargeStart: number;
  nightChargeEnd: number;
  defaultFreeWaitingMinutes: number;
  defaultWaitingRatePerMin: number;
  gpsTrackingIntervalSeconds: number;
  gpsRetentionDays: number;
  defaultTollPolicy: TollPolicy;
  defaultParkingPolicy: ParkingPolicy;
}

// ============================================================
// COST CALCULATION
// ============================================================

export interface CostCalculationInput {
  // Route
  pickupLatitude: number;
  pickupLongitude: number;
  dropLatitude: number;
  dropLongitude: number;

  // Service
  serviceType: ServiceType;
  vehicleType?: VehicleType;
  acType: AcType;
  vendorId?: string;
  city?: string;

  // Waiting
  waitingMinutes?: number;

  // Additional
  isNightTrip?: boolean;
  isAirportTrip?: boolean;
  additionalPassengers?: number;

  // Manual overrides
  tollCost?: number;
  parkingCost?: number;
}

export interface CostBreakdown {
  // Distance
  plannedDistanceKm: number;
  actualDistanceKm?: number;
  billableDistanceKm: number;

  // Rate card snapshot
  rateCardId: string;
  rateCardName: string;
  ratePerKm: number;
  baseFare: number;
  minimumKm: number;
  minimumFare: number;

  // Line items
  baseFareAmount: number;
  distanceCost: number;        // billableDistanceKm * ratePerKm
  waitingCost: number;
  waitingMinutes: number;
  freeWaitingMinutes: number;
  waitingRatePerMin: number;
  nightChargeAmount: number;
  tollCost: number;
  parkingCost: number;
  airportCharge: number;
  additionalPassengerCharge: number;
  additionalCharges: number;
  discount: number;
  taxAmount: number;

  // Totals
  subtotalBeforeMinimum: number;
  finalAmount: number;
  meetsMinimumFare: boolean;

  // Rounding
  roundingMode: RoundingMode;
  roundedAmount: number;

  // Estimated vs actual
  isEstimated: boolean;
  distanceDifferenceKm?: number;
  additionalDistanceCost?: number;
}

export interface CostBreakdownLineItem {
  label: string;
  amount: number;
  detail?: string;
  isNegative?: boolean;
}

// ============================================================
// TRIP COST SNAPSHOT (stored with booking/trip)
// ============================================================

export interface TripCostSnapshot {
  id: string;
  tripId: string;
  rateCardId?: string;
  costCenterId?: string;

  // Snapshot of rate card at booking time
  ratePerKm: number;
  baseFare: number;
  minimumKm: number;
  minimumFare: number;
  waitingChargePerMin: number;
  freeWaitingMinutes: number;
  nightChargeType?: string;
  nightChargeValue?: number;
  acType?: string;

  // Distance
  plannedDistanceKm: number;
  actualDistanceKm?: number;
  billableDistanceKm: number;

  // Cost breakdown
  baseFareAmount: number;
  distanceCost: number;
  waitingCost: number;
  waitingMinutes: number;
  nightChargeAmount: number;
  tollCost: number;
  parkingCost: number;
  airportCharge: number;
  additionalCharges: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;

  // Finance
  department?: string;
  businessUnit?: string;
  project?: string;
  vendorId?: string;
  vehicleType?: string;
  serviceType?: string;

  status: TripCostStatus;
}

// ============================================================
// BILLING TYPES
// ============================================================

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  companyId: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';

export interface VendorInvoice {
  id: string;
  vendorId: string;
  vehicleId?: string;
  costCenterId?: string;
  amount: number;
  tripCount: number;
  period: string;
  status: InvoiceStatus;
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface CostAnalyticsFilter {
  startDate: string;
  endDate: string;
  departmentId?: string;
  managerId?: string;
  vendorId?: string;
  vehicleId?: string;
  serviceType?: ServiceType;
  acType?: AcType;
  costCenterId?: string;
}

export interface CostSummary {
  totalTrips: number;
  totalCost: number;
  averageCostPerTrip: number;
  averageCostPerKm: number;
  acCost: number;
  nonAcCost: number;
  acTrips: number;
  nonAcTrips: number;
}

export interface CostByDepartment {
  departmentId: string;
  departmentName: string;
  totalTrips: number;
  totalCost: number;
  averageCost: number;
}

export interface CostByVendor {
  vendorId: string;
  vendorName: string;
  totalTrips: number;
  totalCost: number;
  averageCost: number;
  averageCostPerKm: number;
}

export interface CostByRoute {
  routeId: string;
  routeName: string;
  totalTrips: number;
  totalCost: number;
  averageDistance: number;
  averageCost: number;
}

export interface MonthlyCostTrend {
  month: string;
  totalCost: number;
  tripCount: number;
  averageCost: number;
}

export interface CostComparison {
  acVsNonAc: {
    ac: CostSummary;
    nonAc: CostSummary;
  };
  byDepartment: CostByDepartment[];
  byVendor: CostByVendor[];
  byRoute: CostByRoute[];
  monthlyTrend: MonthlyCostTrend[];
}

// ============================================================
// TRACKING TYPES
// ============================================================

export interface LocationPing {
  id: string;
  vehicleId: string;
  tripId?: string;
  userId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  eventId?: string;
  anomaly?: string;
  timestamp: string;
}

export interface LatestVehicleLocation {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  timestamp: string;
}

// ============================================================
// GEOFENCING TYPES
// ============================================================

export type GeofenceType = 'PICKUP_OFFICE' | 'DEPOT' | 'RESTRICTED' | 'CUSTOM';
export type GeofenceAction = 'ENTER' | 'EXIT';

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  latitude: number;
  longitude: number;
  radius: number;
  companyId: string;
  isActive: boolean;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  vehicleId: string;
  action: GeofenceAction;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// ============================================================
// ETA TYPES
// ============================================================

export interface ETAResult {
  distanceKm: number;
  durationMinutes: number;
  eta: string; // ISO timestamp
  trafficLevel: 'CLEAR' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'GRIDLOCK';
  polyline?: string;
}

// ============================================================
// SOS / INCIDENT TYPES
// ============================================================

export type SOSStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED';
export type IncidentType =
  | 'ACCIDENT'
  | 'VEHICLE_BREAKDOWN'
  | 'DRIVER_ISSUE'
  | 'PASSENGER_ISSUE'
  | 'GPS_FAILURE'
  | 'ROUTE_BLOCKED'
  | 'SECURITY'
  | 'OTHER';
export type IncidentStatus = 'REPORTED' | 'ASSIGNED' | 'INVESTIGATING' | 'RESOLVED';

export interface SOSAlert {
  id: string;
  userId: string;
  tripId?: string;
  vehicleId?: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  description?: string;
  status: SOSStatus;
  acknowledgedById?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'DRIVER_ASSIGNED'
  | 'VEHICLE_APPROACHING'
  | 'VEHICLE_ARRIVED'
  | 'TRIP_DELAYED'
  | 'TRIP_COMPLETED'
  | 'BOOKING_CANCELLED'
  | 'SOS_ALERT'
  | 'SYSTEM'
  | 'COST_ALERT';

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS' | 'WHATSAPP';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  channel: NotificationChannel;
  createdAt: string;
}

// ============================================================
// AUDIT TYPES
// ============================================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

// ============================================================
// WEBSOCKET EVENT TYPES
// ============================================================

export type WSEventType =
  | 'vehicle.location'
  | 'vehicle.online'
  | 'vehicle.offline'
  | 'trip.started'
  | 'trip.arrived'
  | 'trip.boarding'
  | 'trip.completed'
  | 'trip.cancelled'
  | 'trip.updated'
  | 'booking.updated'
  | 'geofence.entered'
  | 'geofence.exited'
  | 'sos.created'
  | 'sos.acknowledged'
  | 'notification.new'
  | 'incident.new';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================
// DISPATCH BOARD TYPES
// ============================================================

export type DispatchColumn = 'UNASSIGNED' | 'READY' | 'ASSIGNED' | 'DRIVER_CONFIRMED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED';

export interface DispatchBoardItem {
  booking: Booking;
  trip?: Trip;
  column: DispatchColumn;
  vehicle?: Vehicle;
  driver?: DriverProfile;
}

// ============================================================
// POLICY TYPES
// ============================================================

export interface TransportPolicy {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  minAdvanceBookingMinutes: number;
  maxAdvanceBookingDays: number;
  cancellationDeadlineMinutes: number;
  allowLateBooking: boolean;
  requireApproval: boolean;
  approvalLevels: number;
  eligibleDepartments: string[];
  eligibleDesignations: string[];
  femaleGuardRequired: boolean;
  guardStartHour: number;
  guardEndHour: number;
}

// ============================================================
// DASHBOARD / KPI TYPES
// ============================================================

export interface TransportKPIs {
  activeTrips: number;
  pendingBookings: number;
  unassignedBookings: number;
  delayedTrips: number;
  sosAlerts: number;
  offlineVehicles: number;
  totalVehicles: number;
  vehicleUtilization: number;
  driverAvailability: number;
  totalDrivers: number;
  completedToday: number;
  cancelledToday: number;
  noShowsToday: number;
  onTimePercentage: number;
  averageDelay: number;
  totalCostToday: number;
  averageCostPerTrip: number;
}

export interface DashboardData {
  kpis: TransportKPIs;
  recentBookings: Booking[];
  activeTrips: Trip[];
  alerts: Notification[];
  costSummary: CostSummary;
}
