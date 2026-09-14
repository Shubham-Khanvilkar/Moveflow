import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects tenant context. Bare `@Tenant()` returns the companyId string
 * (the shape all services expect); `@Tenant('companyCode')` etc. returns
 * the named field.
 */
export const Tenant = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant;
    if (!tenant) return undefined;
    if (data) return tenant[data];
    return tenant.companyId;
  },
);
