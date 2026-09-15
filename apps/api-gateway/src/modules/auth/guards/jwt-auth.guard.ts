import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard {
  constructor(private moduleRef: ModuleRef) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid token');

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (!payload.sub) throw new UnauthorizedException('Invalid token: no subject');

      // Verify with JWKS or HMAC
      const supabaseUrl = process.env.SUPABASE_URL;
      if (supabaseUrl && payload.iss) {
        let verified = false;
        try {
          const { createRemoteJWKSet, jwtVerify } = await import('jose');
          const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
          await jwtVerify(token, jwks, { issuer: `${supabaseUrl}/auth/v1` });
          verified = true;
        } catch {
          // JWKS failed, try HMAC
          const crypto = await import('crypto');
          const hmacSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
          if (hmacSecret) {
            const hmac = crypto.createHmac('sha256', hmacSecret);
            hmac.update(`${parts[0]}.${parts[1]}`);
            if (parts[2] === hmac.digest('base64url')) verified = true;
          }
        }
        if (!verified) throw new UnauthorizedException('Token verification failed');
      }

      // Build full user context using JwtStrategy
      try {
        const { JwtStrategy } = await import('../strategies/jwt.strategy');
        const strategy = this.moduleRef.get(JwtStrategy, { strict: false });
        const userContext = await strategy.validate(payload);
        request.user = userContext;
      } catch {
        // Fallback: use raw payload if strategy unavailable
        request.user = payload;
      }

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid token');
    }
  }
}

