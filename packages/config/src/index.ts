export const AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: '24h',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  routing: {
    provider: process.env.ROUTING_PROVIDER || 'osrm',
    fallbacks: [
      process.env.ROUTING_FALLBACK_1,
      process.env.ROUTING_FALLBACK_2,
      process.env.ROUTING_FALLBACK_3,
    ].filter(Boolean),
    timeoutMs: parseInt(process.env.ROUTING_TIMEOUT_MS || '3000', 10),
    cacheTtlSeconds: parseInt(process.env.ROUTING_CACHE_TTL_SECONDS || '3600', 10),
  },
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  },
} as const;
