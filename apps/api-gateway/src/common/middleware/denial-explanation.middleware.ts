import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that intercepts 403 responses and enriches them with structured
 * denial explanation data. This allows the frontend to show a helpful toast
 * explaining exactly why access was denied.
 */
@Injectable()
export class DenialExplanationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Intercept the json/send methods to enrich 403 responses
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let currentStatus = 200;

    res.status = (code: number) => {
      currentStatus = code;
      return originalStatus(code);
    };

    res.json = (body: any) => {
      if (currentStatus === 403 && body && typeof body === 'object') {
        const message = body.message || '';
        const user = (req as any).user;
        const tenant = (req as any).tenant;

        if (user && !body.denial) {
          const required = extractRequiredPermission(message);
          body.denial = {
            required: required || 'unknown',
            userRoles: user.roles || (user.role ? [user.role] : []),
            userScope: {
              sites: extractSiteCodes(tenant?.accessScopes || []),
              processes: extractProcessCodes(tenant?.accessScopes || []),
            },
            reason: message,
            suggestion: generateSuggestion(message, user),
          };
        }
      }
      return originalJson(body);
    };

    next();
  }
}

function extractRequiredPermission(message: string): string | null {
  // Match patterns like "Required: vehicles:manage" or "Required: dispatch.manage"
  const match = message.match(/Required:\s*([a-zA-Z_.*]+:[a-zA-Z_.*]+)/);
  return match ? match[1] : null;
}

function extractSiteCodes(scopes: any[]): string[] {
  return scopes
    .filter((s: any) => s.siteCode || s.site?.siteCode)
    .map((s: any) => s.siteCode || s.site?.siteCode);
}

function extractProcessCodes(scopes: any[]): string[] {
  return scopes
    .filter((s: any) => s.processCode || s.process?.processCode)
    .map((s: any) => s.processCode || s.process?.processCode);
}

function generateSuggestion(message: string, user: any): string {
  if (message.includes('no access scopes')) {
    return 'Contact your administrator to assign site/process access scopes to your profile.';
  }
  if (message.includes('Insufficient permissions')) {
    return 'Contact your administrator to request the required permission for your role.';
  }
  if (message.includes('not authorized for this site')) {
    return 'You do not have access to this site. Contact your administrator to add this site to your scope.';
  }
  if (message.includes('not authorized for this process')) {
    return 'You do not have access to this process. Contact your administrator to add this process to your scope.';
  }
  if (message.includes('Insufficient role')) {
    return 'Your current role does not have access. Contact your administrator to assign the required role.';
  }
  return 'Contact your administrator for access.';
}
