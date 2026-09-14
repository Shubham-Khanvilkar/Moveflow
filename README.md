# NAVIRA — Intelligent Enterprise Mobility

> Enterprise multi-tenant employee transportation and mobility platform

![NAVIRA Logo](https://via.placeholder.com/200x80?text=NAVIRA)

## Features

### Transport Operations
- Booking management with approval workflows
- Trip lifecycle with passenger-level operations
- Dispatch and control room
- GPS live tracking and route optimization
- Vehicle duty QR generation and scanning
- Driver and vehicle compliance management

### Platform Administration
- Multi-tenant company management
- NAVIRA Owner-only internal workforce administration
- Role-based access control with 200+ permission toggles
- Company contact directory with 100+ contacts
- Impersonation and support sessions
- Release management and rollback

### Billing and Finance
- NAVIRA SaaS billing (separate domain)
- External transport billing with rate cards
- Invoice reconciliation
- Vendor payment management

### Reporting and Analytics
- 30+ report types with drag-and-drop builder
- Excel/PDF/CSV export with background jobs
- Scheduled reports with authorization revalidation
- Real-time dashboards with drill-down

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Mobile** | React Native, Expo |
| **Backend** | NestJS, Node.js |
| **ML/AI** | Python, FastAPI |
| **Database** | PostgreSQL 16, Redis 7 |
| **Search** | Elasticsearch 8 |
| **Infrastructure** | Docker, Kubernetes |
| **CI/CD** | GitHub Actions |

## Project Structure

```
moveflow/
├── apps/
│   ├── web/                    # Next.js 14 web application
│   ├── mobile/                 # React Native Expo app
│   ├── api-gateway/            # NestJS API gateway (all business logic)
│   └── ml-service/             # Python/FastAPI ML service
├── packages/
│   ├── ui/                     # Shared React components
│   ├── types/                  # TypeScript type definitions
│   ├── database/               # Prisma schema & migrations
│   ├── utils/                  # Shared utilities
│   └── config/                 # Shared configuration
├── infra/
│   ├── kubernetes/             # K8s manifests
│   └── docker/                 # Dockerfiles
└── docs/                       # Documentation
```

## Getting Started

### Prerequisites
- **Node.js** 20+
- **Docker** & Docker Compose
- **Python** 3.11+ (for ML service)
- **PostgreSQL** 16 (or use Docker)
- **Redis** 7 (or use Docker)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/navira.git
   cd navira
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start development environment**
   ```bash
   # Start databases
   docker-compose up -d postgres redis
   
   # Run database migrations
   cd packages/database && npx prisma migrate dev
   
   # Seed the database
   npx prisma db seed
   
   # Start all services
   cd ../.. && npm run dev
   ```

5. **Access the applications**
   - Web App: http://localhost:3000
   - API Gateway: http://localhost:3001
   - API Docs: http://localhost:3001/docs (non-production only)
   - Health Check: http://localhost:3001/health

### Running Tests

```bash
# Run all tests
npm test

# Run API Gateway tests only
cd apps/api-gateway && npm test
```

## API Documentation

Interactive API documentation is available at `/docs` when running in non-production mode.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Get current user context |
| GET | `/api/v1/platform/companies/:id/contacts` | Company contact directory |
| POST | `/api/v1/platform/companies/:id/contacts` | Create company contact |
| GET | `/api/v1/platform/releases` | List releases |
| POST | `/api/v1/platform/releases` | Create release |
| POST | `/api/v1/platform/releases/rollback` | Rollback release |
| POST | `/api/v1/platform/impersonation/start` | Start impersonation |
| POST | `/api/v1/platform/impersonation/:id/end` | End impersonation |
| GET | `/api/health` | Health check (DB + Redis) |

### Authentication

All protected endpoints require a Bearer token:
```bash
Authorization: Bearer <access_token>
```

## Docker Deployment

```bash
# Start databases only
docker-compose up -d postgres redis

# Start all services
docker-compose up -d

# Stop services
docker-compose down
```

## Database Management

```bash
# Generate Prisma client
cd packages/database && npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | Yes |
| `PORT` | API server port (default: 3001) | No |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | No |

## Security

- Helmet security headers on all responses
- JWT authentication with refresh tokens
- Role-based access control (RBAC) with 200+ permission toggles
- Server-side authorization (no frontend-only RBAC)
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- CORS configuration
- Request ID tracking (X-Request-ID)
- Structured JSON logging

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
