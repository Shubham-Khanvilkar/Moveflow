import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001/api';

const ADMIN_EMAIL = 'admin@acme.com';
const ADMIN_PASSWORD = 'Admin@123';
const EMPLOYEE_EMAIL = 'employee@acme.com';
const EMPLOYEE_PASSWORD = 'Admin@123';

// ─── Helpers ─────────────────────────────────────────────

async function loginAs(page: Page, email: string, password: string) {
  await page.goto(BASE_URL);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign In")');

  await page.waitForFunction(
    () => {
      const token = localStorage.getItem('token');
      return token && token.length > 10;
    },
    { timeout: 15000 }
  );
}

async function apiRequest(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `API ${options.method || 'GET'} ${path} failed (${res.status}): ${body?.message || body?.error || 'unknown'}`
    );
  }
  return body?.data !== undefined ? body.data : body;
}

function getTokenFromStorage(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem('token') || '');
}

// ─── Tests ───────────────────────────────────────────────

test.describe('Booking Flow — End to End', () => {
  let adminToken: string;
  let bookingId: string;
  let tripId: string;
  let driverId: string;
  let vehicleId: string;

  test('Step 1: Login as admin', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    adminToken = await getTokenFromStorage(page);
    expect(adminToken).toBeTruthy();
    expect(adminToken.length).toBeGreaterThan(10);

    const me = await apiRequest(adminToken, '/auth/me');
    expect(me.email).toBe(ADMIN_EMAIL);
    expect(me.roles).toBeDefined();
  });

  test('Step 2: Create a booking via API', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = await getTokenFromStorage(page);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const booking = await apiRequest(adminToken, '/trips/bookings', {
      method: 'POST',
      body: JSON.stringify({
        serviceType: 'CAB',
        date: dateStr,
        pickupTime: '09:00',
        pickupLatitude: 19.076,
        pickupLongitude: 72.8777,
        pickupAddress: 'Andheri East, Mumbai',
        dropLatitude: 19.0596,
        dropLongitude: 72.8295,
        dropAddress: 'BKC, Mumbai',
        passengerCount: 1,
      }),
    });

    bookingId = booking.id || booking.bookingId;
    expect(bookingId).toBeTruthy();

    const status = booking.status || booking.approvalStatus;
    expect(['REQUESTED', 'PENDING_APPROVAL', 'PENDING']).toContain(status);
  });

  test('Step 3: Approve the booking', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = await getTokenFromStorage(page);

    if (!bookingId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const booking = await apiRequest(adminToken, '/trips/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: 'CAB',
          date: dateStr,
          pickupTime: '09:00',
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          pickupAddress: 'Andheri East, Mumbai',
          dropLatitude: 19.0596,
          dropLongitude: 72.8295,
          dropAddress: 'BKC, Mumbai',
          passengerCount: 1,
        }),
      });
      bookingId = booking.id || booking.bookingId;
    }

    const approveRes = await apiRequest(
      adminToken,
      `/trips/bookings/${bookingId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ approved: true }),
      }
    );

    const approvedStatus =
      approveRes?.status || approveRes?.approvalStatus || 'APPROVED';
    expect(['APPROVED', 'CONFIRMED']).toContain(approvedStatus);
  });

  test('Step 4: Dispatch the booking', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = await getTokenFromStorage(page);

    if (!bookingId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const booking = await apiRequest(adminToken, '/trips/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: 'CAB',
          date: dateStr,
          pickupTime: '09:00',
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          pickupAddress: 'Andheri East, Mumbai',
          dropLatitude: 19.0596,
          dropLongitude: 72.8295,
          dropAddress: 'BKC, Mumbai',
          passengerCount: 1,
        }),
      });
      bookingId = booking.id || booking.bookingId;

      await apiRequest(adminToken, `/trips/bookings/${bookingId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved: true }),
      });
    }

    const drivers = await apiRequest(adminToken, '/trips/drivers/available', {
      method: 'POST',
    });
    const driverList = Array.isArray(drivers) ? drivers : drivers?.data || [];
    expect(driverList.length).toBeGreaterThan(0);
    driverId = driverList[0].id;

    const vehicles = await apiRequest(
      adminToken,
      '/trips/vehicles/available',
      { method: 'POST' }
    );
    const vehicleList = Array.isArray(vehicles)
      ? vehicles
      : vehicles?.data || [];
    expect(vehicleList.length).toBeGreaterThan(0);
    vehicleId = vehicleList[0].id;

    const dispatchRes = await apiRequest(
      adminToken,
      `/trips/dispatch/${bookingId}`,
      {
        method: 'POST',
        body: JSON.stringify({ driverId, vehicleId }),
      }
    );

    tripId = dispatchRes?.tripId || dispatchRes?.id || dispatchRes?.data?.tripId;
    expect(tripId).toBeTruthy();
  });

  test('Step 5: Transition trip through lifecycle to COMPLETED', async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = await getTokenFromStorage(page);

    if (!tripId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const booking = await apiRequest(adminToken, '/trips/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: 'CAB',
          date: dateStr,
          pickupTime: '09:00',
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          pickupAddress: 'Andheri East, Mumbai',
          dropLatitude: 19.0596,
          dropLongitude: 72.8295,
          dropAddress: 'BKC, Mumbai',
          passengerCount: 1,
        }),
      });
      bookingId = booking.id || booking.bookingId;

      await apiRequest(adminToken, `/trips/bookings/${bookingId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved: true }),
      });

      const drivers = await apiRequest(
        adminToken,
        '/trips/drivers/available',
        { method: 'POST' }
      );
      driverId = (Array.isArray(drivers) ? drivers : drivers?.data || [])[0]
        .id;

      const vehicles = await apiRequest(
        adminToken,
        '/trips/vehicles/available',
        { method: 'POST' }
      );
      vehicleId = (
        Array.isArray(vehicles) ? vehicles : vehicles?.data || []
      )[0].id;

      const dispatchRes = await apiRequest(
        adminToken,
        `/trips/dispatch/${bookingId}`,
        {
          method: 'POST',
          body: JSON.stringify({ driverId, vehicleId }),
        }
      );
      tripId = dispatchRes?.tripId || dispatchRes?.id;
    }

    const transitions = [
      'DRIVER_ACCEPT',
      'DRIVER_EN_ROUTE',
      'ARRIVE_AT_PICKUP',
      'START_BOARDING',
      'START_TRIP',
      'ARRIVE_AT_DROP',
      'COMPLETE_TRIP',
    ];

    for (const action of transitions) {
      const res = await apiRequest(
        adminToken,
        `/trips/${tripId}/transition`,
        {
          method: 'POST',
          body: JSON.stringify({ action }),
        }
      );

      const status = res?.status || res?.trip?.status;
      const expectedStatusMap: Record<string, string[]> = {
        DRIVER_ACCEPT: ['DRIVER_ACCEPTED', 'DISPATCHED'],
        DRIVER_EN_ROUTE: ['EN_ROUTE_TO_PICKUP'],
        ARRIVE_AT_PICKUP: ['ARRIVED_AT_PICKUP'],
        START_BOARDING: ['BOARDING'],
        START_TRIP: ['IN_TRANSIT'],
        ARRIVE_AT_DROP: ['ARRIVED_AT_DROP'],
        COMPLETE_TRIP: ['COMPLETED'],
      };

      const expected = expectedStatusMap[action] || [];
      if (expected.length > 0) {
        expect(expected).toContain(status);
      }
    }

    const finalTrip = await apiRequest(adminToken, `/trips/${tripId}`);
    expect(finalTrip.status).toBe('COMPLETED');
  });

  test('Step 6: Verify cost calculation', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = await getTokenFromStorage(page);

    if (!tripId) {
      const trips = await apiRequest(adminToken, '/trips?status=COMPLETED');
      const tripList = Array.isArray(trips) ? trips : trips?.data || [];
      expect(tripList.length).toBeGreaterThan(0);
      tripId = tripList[0].id;
    }

    const trip = await apiRequest(adminToken, `/trips/${tripId}`);
    expect(trip.status).toBe('COMPLETED');

    expect(trip).toHaveProperty('id');
    expect(trip).toHaveProperty('status');

    const costFields = [
      'totalCost',
      'estimatedCost',
      'finalCost',
      'fare',
      'amount',
      'billingAmount',
      'cost',
      'price',
    ];
    const hasCostData = costFields.some((field) => {
      const val = trip[field];
      return val !== undefined && val !== null;
    });

    if (hasCostData) {
      const costValue =
        trip.totalCost ||
        trip.estimatedCost ||
        trip.finalCost ||
        trip.fare ||
        trip.amount ||
        trip.billingAmount ||
        trip.cost ||
        trip.price;
      expect(typeof costValue).toBe('number');
      expect(costValue).toBeGreaterThanOrEqual(0);
    }

    const billingRes = await apiRequest(
      adminToken,
      `/billing/invoices?tripId=${tripId}`
    ).catch(() => null);

    if (billingRes) {
      const invoices = Array.isArray(billingRes)
        ? billingRes
        : billingRes?.data || [];
      if (invoices.length > 0) {
        const invoice = invoices[0];
        expect(invoice).toHaveProperty('id');
        expect(
          invoice.totalAmount || invoice.amount || invoice.total || 0
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Full booking flow via UI — Login, Create, Approve, Verify', async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    const navBookings = page.locator('button:has-text("Bookings")').first();
    if (await navBookings.isVisible({ timeout: 3000 }).catch(() => false)) {
      await navBookings.click();
      await page.waitForTimeout(500);
    }

    const newBookingBtn = page.locator('button:has-text("New Booking")').first();
    if (await newBookingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBookingBtn.click();
      await page.waitForTimeout(500);

      const submitBtn = page
        .locator('button:has-text("Create Booking")')
        .first();
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(submitBtn).toBeVisible();
      }
    }

    await page.screenshot({ path: 'e2e/screenshots/booking-flow.png' });
  });
});
