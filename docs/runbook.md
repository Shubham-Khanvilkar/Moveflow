# NAVIRA Platform - Deployment Runbook

## Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

## Local Development Setup

```bash
# Install dependencies
npm install

# Set up database
cd packages/database
npx prisma migrate dev
npx prisma db seed

# Start services
docker-compose up -d db redis
cd ../..
npm run dev
```

## Environment Variables

### API Gateway
| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://localhost:5432/moveflow |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| JWT_SECRET | JWT signing secret | dev-secret |
| PORT | API port | 3001 |
| CORS_ORIGIN | Allowed origins | http://localhost:3000 |
| SENDGRID_API_KEY | SendGrid email API key | - |
| TWILIO_ACCOUNT_SID | Twilio SMS account SID | - |
| TWILIO_AUTH_TOKEN | Twilio SMS auth token | - |
| GOOGLE_MAPS_API_KEY | Google Maps API key | - |

### Web Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | API base URL | http://localhost:3001 |
| NEXT_PUBLIC_SOCKET_URL | WebSocket URL | http://localhost:3001 |

## Deployment Commands

### Staging
```bash
# Build and deploy
docker-compose -f docker-compose.staging.yml build
docker-compose -f docker-compose.staging.yml up -d

# Run migrations
docker-compose -f docker-compose.staging.yml exec api npx prisma migrate deploy
```

### Production
```bash
# Using ECS
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com

docker build -t navira-api -f apps/api-gateway/Dockerfile .
docker tag navira-api:latest ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/navira-api:latest
docker push ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/navira-api:latest

aws ecs update-service --cluster navira-production --service navira-api --force-new-deployment
```

## Health Checks
- **Liveness**: GET /health/live
- **Readiness**: GET /health/ready
- **Full Health**: GET /health

## Rollback Procedure
1. Identify last known good deployment tag
2. Update ECS task definition with previous image
3. Deploy: `aws ecs update-service --cluster navira-production --service navira-api --task-definition navira-api:PREV`
4. Verify health checks pass
5. Monitor error rates

## Database Rollback
```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Restore from backup
pg_restore -d moveflow backup.dump
```

## Monitoring
- CloudWatch Logs: `/ecs/navira-api-*`
- Metrics: API latency, error rate, connection pool
- Alerts: PagerDuty for CRITICAL, Slack for WARNING

## Troubleshooting
| Issue | Solution |
|-------|----------|
| High latency | Check DB connection pool, Redis cache hit rate |
| 502 errors | Verify target group health, check container health |
| Auth failures | Check JWT_SECRET, token expiry |
| Email not sending | Verify SENDGRID_API_KEY, check spam folder |
