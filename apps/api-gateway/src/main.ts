import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { DenialExplanationMiddleware } from './common/middleware/denial-explanation.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Security headers via Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "http://localhost:3001", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Body size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Enable CORS (configurable via env, supports comma-separated origins)
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3080,http://localhost:61578';
  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Navira-API-Key', 'X-Request-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor(), new LoggingInterceptor());

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Request ID middleware
  app.use(new RequestIdMiddleware().use);

  // Denial explanation middleware — enriches 403 responses with structured data
  app.use(new DenialExplanationMiddleware().use);

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger / OpenAPI documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NAVIRA API')
      .setDescription('NAVIRA Enterprise Employee Transportation Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Health endpoint (no prefix)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', async (_req: any, res: any) => {
    const checks: Record<string, string> = { api: 'up' };
    let overallStatus = 'healthy';

    // Check database connectivity
    try {
      const { PrismaService } = await import('./common/prisma.service');
      const prisma = app.get(PrismaService);
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {
      checks.database = 'down';
      overallStatus = 'degraded';
    }

    // Check Redis connectivity
    try {
      const Redis = await import('ioredis');
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redis = new Redis.default(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000 });
      await redis.ping();
      await redis.quit();
      checks.redis = 'up';
    } catch {
      checks.redis = 'down';
      overallStatus = 'degraded';
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: checks,
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Startup DB connectivity check
  try {
    const { PrismaService } = await import('./common/prisma.service');
    const prisma = app.get(PrismaService);
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connectivity verified');
  } catch (err) {
    console.error('❌ Database connectivity check failed at startup:', err.message);
    console.error('   The server will start but JWT validation will fail for all requests.');
    console.error('   Ensure the database is running and accessible.');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`NAVIRA API running on: http://localhost:${port}`);
}
bootstrap();
