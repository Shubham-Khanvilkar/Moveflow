# NAVIRA API Documentation

## Base URL
```
Production: https://api.navira.io
Staging: https://api-staging.navira.io
Local: http://localhost:3001
```

## Authentication
All API requests require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { ... }
  }
}
```

## Bookings
```http
GET /api/bookings                    # List bookings
POST /api/bookings                   # Create booking
GET /api/bookings/:id                # Get booking
PATCH /api/bookings/:id              # Update booking
POST /api/bookings/:id/approve       # Approve booking
POST /api/bookings/:id/cancel        # Cancel booking
```

## Trips
```http
GET /api/trips                       # List trips
POST /api/trips                      # Create trip
GET /api/trips/:id                   # Get trip
PATCH /api/trips/:id                 # Update trip
POST /api/trips/:id/start            # Start trip
POST /api/trips/:id/complete         # Complete trip
POST /api/trips/:id/cancel           # Cancel trip
GET /api/trips/:id/track             # Get GPS track
```

## Fleet
```http
GET /api/fleet/vehicles              # List vehicles
POST /api/fleet/vehicles             # Create vehicle
GET /api/fleet/vehicles/:id          # Get vehicle
PATCH /api/fleet/vehicles/:id        # Update vehicle
GET /api/fleet/drivers               # List drivers
POST /api/fleet/drivers              # Create driver
GET /api/fleet/drivers/:id           # Get driver
```

## Employees
```http
GET /api/employees                   # List employees
POST /api/employees                  # Create employee
GET /api/employees/:id               # Get employee
PATCH /api/employees/:id             # Update employee
```

## Billing
```http
GET /api/billing/invoices            # List invoices
POST /api/billing/invoices           # Create invoice
GET /api/billing/invoices/:id        # Get invoice
POST /api/billing/invoices/:id/pay   # Mark as paid
GET /api/billing/pricing-rules       # List pricing rules
POST /api/billing/pricing-rules      # Create pricing rule
```

## Dashboard
```http
GET /api/dashboard/kpi               # Get KPI data
GET /api/dashboard/operational       # Get operational metrics
```

## Reports
```http
GET /api/reports                     # List available reports
POST /api/reports/generate           # Generate report
GET /api/reports/:id/export          # Export report (CSV/PDF)
```

## GPS Tracking
```http
POST /api/gps/location               # Submit GPS location
GET /api/gps/vehicle/:id             # Get vehicle location
GET /api/gps/trip/:id                # Get trip track
```

## Platform Admin
```http
GET /api/platform/companies          # List companies
POST /api/platform/companies         # Create company
GET /api/platform/users              # List users
POST /api/platform/users             # Create user
GET /api/platform/subscriptions      # List subscriptions
POST /api/platform/subscriptions     # Create subscription
```

## WebSocket Events
Connect to `ws://api.navira.io/socket.io`

### Client Events
- `join:trip` - Join trip tracking room
- `leave:trip` - Leave trip tracking room
- `gps:update` - Send GPS location

### Server Events
- `trip:location` - Vehicle location update
- `trip:status` - Trip status change
- `trip:deviation` - Route deviation alert
- `geofence:enter` - Geofence entry
- `geofence:exit` - Geofence exit

## Error Responses
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Rate Limits
- **Default**: 100 requests/minute
- **Auth**: 10 requests/15 minutes
- **GPS**: 300 requests/minute
- **API**: 200 requests/minute

## Pagination
```http
GET /api/bookings?page=1&limit=20&sortBy=createdAt&sortOrder=desc

Response:
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```
