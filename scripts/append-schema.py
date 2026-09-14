import os

schema_path = os.path.join(os.path.dirname(__file__), '..', 'packages', 'database', 'prisma', 'schema.prisma')

# Read current file
with open(schema_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the truncated line and fix it
# Remove everything from the last incomplete model
idx = content.rfind('driver          DriverProfile @rela')
if idx > 0:
    content = content[:idx]

# Check what models already got added
new_models = [
    'TransportScheduleSlot', 'CabAvailability', 'ShuttleAvailability',
    'AdminDelegation', 'AdminScopeAssignment', 'ClubbingConfig',
    'DriverAvailabilityEvent', 'DriverShiftAssignment', 'DriverAreaPreference',
    'DriverDevice', 'DriverLocationPoint', 'PassengerMovement',
    'TripAssignmentHistory', 'DispatchOptimizationRun', 'EmployeeTransportStatusHistory',
]

already_added = [m for m in new_models if f'model {m} ' in content]
print(f"Already added: {len(already_added)} models: {already_added}")

# Build the remaining schema
remaining = """
// ============================================================
// PHASE 41: TRANSPORT SCHEDULE BUILDER + AVAILABILITY ENGINE
// ============================================================

model TransportScheduleSlot {
  id              String   @id @default(uuid())
  companyId       String
  siteId          String?
  processId       String?
  shiftId         String?
  slotTime        String
  transportType   String
  vehicleType     String?
  capacity        Int      @default(4)
  isAC            Boolean  @default(true)
  vendorId        String?
  driverPoolId    String?
  availableFrom   DateTime
  availableUntil  DateTime
  bookingCutoff   String
  cancellationCutoff String
  isActive        Boolean  @default(true)
  createdByUserId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, siteId, processId])
}

model CabAvailability {
  id              String   @id @default(uuid())
  companyId       String
  siteId          String
  processId       String?
  shiftId         String?
  date            DateTime @db.Date
  timeSlot        String
  transportType   String
  vehicleType     String?
  capacity        Int
  isAC            Boolean  @default(true)
  vendorId        String?
  assignedDriverId String?
  assignedVehicleId String?
  status          String   @default("AVAILABLE")
  totalBookings   Int      @default(0)
  maxBookings     Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, siteId, date, timeSlot])
}

model ShuttleAvailability {
  id              String   @id @default(uuid())
  companyId       String
  routeId         String
  departureTime   String
  returnTime      String?
  frequency       Int?
  stops           Json
  capacity        Int
  vehicleId       String?
  driverId        String?
  boardingWindow  Int      @default(5)
  bookingRequired Boolean  @default(true)
  seatReservation Boolean  @default(false)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, routeId])
}

// ============================================================
// PHASE 42: ENTERPRISE ARCHITECTURE HARDENING
// ============================================================

model AdminDelegation {
  id              String   @id @default(uuid())
  companyId       String
  delegatorUserId String
  delegateUserId  String
  scope           String   @default("COMBINATION")
  siteIds         String[]
  processIds      String[]
  shiftIds        String[]
  permissions     String[]
  reason          String?
  startAt         DateTime
  expiresAt       DateTime
  isActive        Boolean  @default(true)
  revokedAt       DateTime?
  revokedByUserId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, delegatorUserId])
  @@index([companyId, delegateUserId])
}

model AdminScopeAssignment {
  id              String   @id @default(uuid())
  companyId       String
  userId          String
  assignedByUserId String
  action          String
  previousScope   Json?
  newScope        Json?
  reason          String?
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, userId])
}

// ============================================================
// PHASE 43: CROSS-PROCESS CLUBBING
// ============================================================

model ClubbingConfig {
  id              String   @id @default(uuid())
  companyId       String
  siteId          String?
  processId       String?
  policy          String   @default("SAME_PROCESS_ONLY")
  allowedCombinations Json?
  billingSeparation  Boolean @default(true)
  safetyOverride     Boolean @default(false)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, siteId, processId])
}

// ============================================================
// PHASE 44: DRIVER AVAILABILITY + GPS + DYNAMIC DISPATCH
// ============================================================

model DriverAvailabilityEvent {
  id              String   @id @default(uuid())
  companyId       String
  driverId        String
  status          String
  previousStatus  String?
  reason          String?
  latitude        Float?
  longitude       Float?
  accuracy        Float?
  triggerSource   String   @default("MOBILE")
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, driverId, createdAt])
  @@index([companyId, status])
}

model DriverShiftAssignment {
  id              String   @id @default(uuid())
  companyId       String
  driverId        String
  shiftId         String
  date            DateTime @db.Date
  startTime       String
  endTime         String
  isFreelance     Boolean  @default(false)
  status          String   @default("ASSIGNED")
  checkedInAt     DateTime?
  checkedOutAt    DateTime?
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, driverId, date])
  @@index([companyId, date])
}

model DriverAreaPreference {
  id              String   @id @default(uuid())
  companyId       String
  driverId        String
  areaName        String
  latitude        Float
  longitude       Float
  radiusMeters    Int      @default(5000)
  level           String   @default("PREFERRED")
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, driverId])
}

model DriverDevice {
  id              String   @id @default(uuid())
  companyId       String
  driverId        String
  deviceType      String
  deviceToken     String
  deviceModel     String?
  osVersion       String?
  appVersion      String?
  isActive        Boolean  @default(true)
  lastSeenAt      DateTime?
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@unique([companyId, driverId, deviceToken])
  @@index([companyId, driverId])
}

model DriverLocationPoint {
  id              String   @id @default(uuid())
  companyId       String
  driverId        String
  latitude        Float
  longitude       Float
  accuracy        Float?
  speed           Float?
  heading         Float?
  batteryLevel    Int?
  signalStrength  String?
  isOfflineBuffered Boolean @default(false)
  transmittedAt   DateTime
  receivedAt      DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, driverId, receivedAt])
  @@index([companyId, receivedAt])
}

model PassengerMovement {
  id              String   @id @default(uuid())
  companyId       String
  employeeId      String
  fromTripId      String?
  toTripId        String
  action          String
  reason          String?
  performedByUserId String
  previousVehicleId String?
  newVehicleId    String?
  previousDriverId String?
  newDriverId     String?
  previousRoute   Json?
  newRoute        Json?
  etaImpact       Float?
  costImpact      Int?
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, employeeId, createdAt])
  @@index([companyId, toTripId])
}

model TripAssignmentHistory {
  id              String   @id @default(uuid())
  companyId       String
  tripId          String
  action          String
  previousDriverId String?
  newDriverId     String?
  previousVehicleId String?
  newVehicleId    String?
  reason          String?
  performedByUserId String
  tripState       String
  gpsSnapshot     Json?
  affectedPassengerCount Int @default(0)
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, tripId])
}

model DispatchOptimizationRun {
  id              String   @id @default(uuid())
  companyId       String
  triggerType     String
  candidatesEvaluated Int  @default(0)
  bestCandidateId String?
  decision        String
  failureReason   String?
  durationMs      Int?
  inputs          Json
  outputs         Json
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, createdAt])
}

model EmployeeTransportStatusHistory {
  id              String   @id @default(uuid())
  companyId       String
  employeeId      String
  action          String
  previousStatus  String?
  newStatus       String?
  reason          String?
  performedByUserId String
  impactPreview   Json?
  createdAt       DateTime @default(now())

  company         Company  @relation(fields: [companyId], references: [id])

  @@index([companyId, employeeId])
}
"""

# Add Company relations for new models
company_relations = """  // Phase 41-44
  transportScheduleSlots TransportScheduleSlot[]
  cabAvailability        CabAvailability[]
  shuttleAvailability    ShuttleAvailability[]
  adminDelegations       AdminDelegation[]
  adminScopeAssignments  AdminScopeAssignment[]
  clubbingConfigs        ClubbingConfig[]
  driverAvailabilityEvents DriverAvailabilityEvent[]
  driverShiftAssignments DriverShiftAssignment[]
  driverAreaPreferences  DriverAreaPreference[]
  driverDevices          DriverDevice[]
  driverLocationPoints   DriverLocationPoint[]
  passengerMovements     PassengerMovement[]
  tripAssignmentHistories TripAssignmentHistory[]
  dispatchOptimizationRuns DispatchOptimizationRun[]
  employeeTransportStatusHistories EmployeeTransportStatusHistory[]
"""

# Insert company relations before closing brace
company_close = content.rfind('}\n\nenum CompanyStatus')
if company_close > 0:
    content = content[:company_close] + '\n' + company_relations + content[company_close:]

# Append remaining schema
content = content.rstrip() + '\n\n' + remaining

with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Schema written successfully")
print(f"Total lines: {len(content.splitlines())}")
