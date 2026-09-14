import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessScopeGuard } from './access-scope.guard';

function contextFor(request: any): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AccessScopeGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  it('allows owner roles without querying scopes', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireSite: true });
    const prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      accessScope: { findMany: jest.fn() },
    } as any;
    const guard = new AccessScopeGuard(reflector, prisma);

    await expect(guard.canActivate(contextFor({ user: { role: 'NAVIRA_OWNER', companyId: 'company-1' } }))).resolves.toBe(true);
    expect(prisma.accessScope.findMany).not.toHaveBeenCalled();
  });

  it('denies a required scope when no active scope is assigned', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireSite: true });
    const prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      accessScope: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const guard = new AccessScopeGuard(reflector, prisma);

    await expect(guard.canActivate(contextFor({ user: { sub: 'user-1', companyId: 'company-1' }, tenant: {} })))
      .rejects.toThrow(ForbiddenException);
  });

  it('fails closed when the database is unavailable in production', async () => {
    process.env.NODE_ENV = 'production';
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireSite: true });
    const prisma = {
      isConnected: jest.fn().mockReturnValue(false),
      accessScope: { findMany: jest.fn() },
    } as any;
    const guard = new AccessScopeGuard(reflector, prisma);

    await expect(guard.canActivate(contextFor({ user: { sub: 'user-1', companyId: 'company-1' } })))
      .rejects.toThrow('Access denied');
  });

  it('enforces shift identifiers when requested', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue({ requireShift: true });
    const prisma = {
      isConnected: jest.fn().mockReturnValue(true),
      accessScope: { findMany: jest.fn().mockResolvedValue([{ shiftId: 'shift-1' }]) },
    } as any;
    const guard = new AccessScopeGuard(reflector, prisma);

    await expect(guard.canActivate(contextFor({
      user: { sub: 'user-1', companyId: 'company-1' },
      params: { shiftId: 'shift-2' },
      tenant: {},
    }))).rejects.toThrow('not authorized for this shift');
  });
});
