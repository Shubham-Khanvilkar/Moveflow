# NAVIRA Platform Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────┬─────────────────┬─────────────────┬──────────┤
│   Web App       │   Mobile App    │   ML Service    │ Admin    │
│   (Next.js)     │   (React Native)│   (Python)      │ Portal   │
└────────┬────────┴────────┬────────┴────────┬────────┴────┬─────┘
         │                 │                 │              │
         ▼                 ▼                 ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (NestJS)                        │
├─────────────────────────────────────────────────────────────────┤
│  Auth │ Booking │ Trip │ Fleet │ Billing │ Reports │ GPS Track  │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   PostgreSQL   │  │     Redis      │  │  External APIs │
│   (Primary)    │  │   (Cache)      │  │  - SendGrid    │
│                │  │                │  │  - Twilio      │
└────────────────┘  └────────────────┘  │  - Google Maps │
                                        │  - Mapbox      │
                                        └────────────────┘
```

## Module Architecture

### API Gateway Modules
- **Auth**: JWT tokens, OAuth, MFA, SSO
- **Booking**: CRUD, approval workflows, bulk operations
- **Trip**: Lifecycle management, GPS tracking, route optimization
- **Fleet**: Vehicles, drivers, onboarding, compliance
- **Billing**: Invoices, pricing rules, reconciliation
- **Reports**: Analytics, scheduled reports, KPIs
- **Platform**: Multi-tenant, SaaS subscriptions, webhooks

### Data Flow
1. Client sends request to API Gateway
2. JWT middleware validates token
3. AccessScopeGuard enforces tenant isolation
4. Rate limiter checks request limits
5. Controller processes business logic
6. Service layer interacts with database
7. Response cached in Redis (if applicable)
8. Audit log written for sensitive operations
9. Webhooks dispatched for external notifications

## Security Layers
1. **Transport**: HTTPS/TLS 1.3
2. **Authentication**: JWT + Refresh tokens
3. **Authorization**: RBAC + AccessScopeGuard
4. **Data Protection**: Encryption at rest, PII masking
5. **Rate Limiting**: Per-user, per-IP, per-endpoint
6. **Audit Logging**: All data modifications tracked
7. **Input Validation**: DTOs with class-validator

## Deployment Architecture
- **Container**: Docker with multi-stage builds
- **Orchestration**: AWS ECS Fargate
- **Database**: AWS RDS PostgreSQL 15
- **Cache**: AWS ElastiCache Redis 7
- **CDN**: CloudFront for static assets
- **Monitoring**: CloudWatch + PagerDuty

## Scaling Strategy
- **Horizontal**: ECS auto-scaling (2-10 instances)
- **Database**: Read replicas for reporting
- **Cache**: Redis cluster for high throughput
- **Background Jobs**: SQS + Lambda for async tasks

## Disaster Recovery
- **RPO**: 1 hour (automated backups)
- **RTO**: 30 minutes (failover to standby)
- **Backup**: Daily snapshots, 30-day retention
- **Multi-AZ**: Production database in 2 AZs
