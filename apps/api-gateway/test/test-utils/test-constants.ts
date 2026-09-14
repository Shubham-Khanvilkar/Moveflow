export const TEST_COMPANY = {
  id: 'test-company-001',
  code: 'TEST',
  name: 'Test Corp',
};

export const TEST_ADMIN = {
  id: 'test-admin-001',
  email: 'admin@test.com',
  password: 'Test@12345',
  name: 'Test Admin',
  employeeId: 'ADM-001',
};

export const TEST_EMPLOYEE = {
  id: 'test-employee-001',
  email: 'emp@test.com',
  password: 'Test@12345',
  name: 'Test Employee',
  employeeId: 'EMP-001',
};

export const TEST_DRIVER = {
  email: 'driver@test.com',
  name: 'Test Driver',
  driverCode: 'DRV-001',
  licenseNo: 'DL-TEST-001',
  mobile: '7777777777',
};

export const TEST_VEHICLE = {
  id: 'test-vehicle-001',
  registrationNo: 'MH-01-TEST',
  vehicleType: 'SEDAN',
  capacity: 4,
};

export const TEST_VEHICLE_2 = {
  id: 'test-vehicle-002',
  registrationNo: 'MH-02-TEST',
  vehicleType: 'SUV',
  capacity: 6,
};

export const TEST_SITE = {
  id: 'test-site-001',
  siteCode: 'MUM',
  siteName: 'Mumbai Office',
};

export const TEST_SITE_2 = {
  id: 'test-site-002',
  siteCode: 'PUN',
  siteName: 'Pune Office',
};

export const TEST_SHIFT = {
  id: 'test-shift-001',
  name: 'Morning',
  startTime: '06:00',
  endTime: '15:00',
};

export const TEST_RATE_CARD = {
  id: 'test-ratecard-001',
  code: 'RC-SEDAN-001',
  name: 'Sedan Rate',
  baseFare: 100,
  perKmRate: 12,
  minimumKm: 4,
  minimumFare: 150,
  freeWaitingMinutes: 15,
  waitingChargePerMin: 5,
};
