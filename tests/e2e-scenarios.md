# E2E Test Scenarios

## Authentication Flow
1. Login with valid credentials → redirect to dashboard
2. Login with invalid credentials → show error message
3. Token refresh → seamless continuation
4. Logout → clear session, redirect to login
5. Session expiry → auto redirect to login

## Booking Management
1. Create booking → show in list, status=DRAFT
2. Approve booking → status=APPROVED
3. Assign driver/vehicle → booking linked
4. Cancel booking → status=CANCELLED
5. Filter bookings by date/status → correct results

## Trip Lifecycle
1. Trip created from booking → status=SCHEDULED
2. Driver accepts → status=DRIVER_ACCEPTED
3. Driver en route → status=EN_ROUTE_TO_PICKUP
4. Trip started → status=IN_TRANSIT
5. Trip completed → status=COMPLETED
6. GPS tracking during trip → live updates
7. Route deviation alert → notification sent

## Fleet Management
1. Add vehicle → vehicle appears in list
2. Update vehicle details → changes reflected
3. Vehicle compliance check → alert if expired
4. Driver onboarding → create profile + KYC
5. Vehicle assignment → link to driver

## Dispatch & Scheduling
1. Create dispatch → assign vehicles
2. Bulk schedule import → process CSV
3. Drag-drop reschedule → update trip times
4. Conflict detection → prevent double-booking
5. Optimization run → suggest improvements

## Billing & Invoicing
1. Generate invoice → correct amounts
2. Apply pricing rules → tiered pricing
3. Mark as paid → status updated
4. Reconciliation → match payments
5. Export invoice → PDF generation

## Notifications
1. Email notification → sent via SendGrid
2. SMS notification → sent via Twilio
3. Push notification → delivered to device
4. In-app notification → visible in bell icon
5. Bulk notification → sent to all recipients

## Reports & Analytics
1. Booking summary report → correct data
2. Trip analytics → distance/duration
3. Driver performance → ratings/scores
4. Export to CSV → downloadable file
5. Scheduled report → sent on schedule

## Platform Admin
1. Create company → company created
2. Manage users → CRUD operations
3. Role assignment → permissions updated
4. Impersonate user → logged in as user
5. Subscription management → plan changes

## Mobile App
1. Offline queue → actions queued when offline
2. Sync on reconnect → pending actions sent
3. Biometric auth → Face ID/fingerprint
4. GPS tracking → background updates
5. Deep linking → opens correct screen
