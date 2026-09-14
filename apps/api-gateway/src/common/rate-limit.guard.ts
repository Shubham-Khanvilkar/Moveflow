import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests = 100;
  private readonly windowMs = 60000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxRequests) {
      throw new HttpException('Rate limit exceeded. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    record.count++;
    return true;
  }
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = `auth:${request.ip || 'unknown'}`;
    const now = Date.now();

    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.maxRequests) {
      throw new HttpException('Too many login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    record.count++;
    return true;
  }
}
