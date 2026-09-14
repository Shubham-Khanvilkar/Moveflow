import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private store: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    this.configs.set('default', { windowMs: 60000, maxRequests: 100 });
    this.configs.set('auth', { windowMs: 900000, maxRequests: 10 });
    this.configs.set('api', { windowMs: 60000, maxRequests: 200 });
    this.configs.set('gps', { windowMs: 60000, maxRequests: 300 });

    setInterval(() => this.cleanup(), 60000);
  }

  checkLimit(key: string, configName: string = 'default'): { allowed: boolean; remaining: number; resetAt: number } {
    const config = this.configs.get(configName) || this.configs.get('default')!;
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
    }

    if (entry.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
  }

  getLimitInfo(key: string, configName: string = 'default') {
    const config = this.configs.get(configName) || this.configs.get('default')!;
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetAt) {
      return { used: 0, limit: config.maxRequests, remaining: config.maxRequests, resetAt: now + config.windowMs };
    }

    return {
      used: entry.count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  getStats(): { totalKeys: number; activeKeys: number } {
    const now = Date.now();
    let activeKeys = 0;
    for (const entry of this.store.values()) {
      if (now <= entry.resetAt) activeKeys++;
    }
    return { totalKeys: this.store.size, activeKeys };
  }
}

export const rateLimiter = new RateLimiterService();
