import { Module, Global } from '@nestjs/common';

/**
 * No-op cache module. cache-manager v5 is ESM-only and incompatible
 * with @nestjs/cache-manager v2.  The app functions correctly without
 * in-memory caching; Redis can be wired later with a compatible store.
 */
@Global()
@Module({
  providers: [],
  exports: [],
})
export class RedisCacheModule {}
