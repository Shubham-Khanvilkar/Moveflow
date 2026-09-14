import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('RolesGuard - Critical Bug Fix', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const mockContext = (user: any, requiredRoles: string[] | undefined) => {
    const context: any = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    };

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    return context;
  };

  it('should allow access when no roles are required', () => {
    const result = guard.canActivate(mockContext({ role: 'USER' }, undefined));
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user is missing', () => {
    expect(() => {
      guard.canActivate(mockContext(null, ['ADMIN']));
    }).toThrow(ForbiddenException);
  });

  it('CRITICAL FIX: should allow admin even with roles: [] empty array', () => {
    const adminUser = {
      role: 'ADMIN',
      roles: [],
    };
    const result = guard.canActivate(mockContext(adminUser, ['ADMIN']));
    expect(result).toBe(true);
  });

  it('CRITICAL FIX: should allow admin via roles array', () => {
    const adminUser = {
      role: 'USER',
      roles: ['ADMIN', 'USER'],
    };
    const result = guard.canActivate(mockContext(adminUser, ['ADMIN']));
    expect(result).toBe(true);
  });

  it('CRITICAL FIX: should deny user with wrong role', () => {
    const user = {
      role: 'EMPLOYEE',
      roles: ['EMPLOYEE'],
    };
    expect(() => {
      guard.canActivate(mockContext(user, ['ADMIN']));
    }).toThrow(ForbiddenException);
  });

  it('CRITICAL FIX: should deny when user has no role at all', () => {
    const user = {};
    expect(() => {
      guard.canActivate(mockContext(user, ['ADMIN']));
    }).toThrow(ForbiddenException);
  });

  it('should allow multi-role check', () => {
    const user = {
      role: 'EMPLOYEE',
      roles: ['EMPLOYEE', 'DRIVER'],
    };
    const result = guard.canActivate(mockContext(user, ['ADMIN', 'EMPLOYEE']));
    expect(result).toBe(true);
  });

  it('should handle undefined roles array gracefully', () => {
    const user = {
      role: 'ADMIN',
      roles: undefined,
    };
    const result = guard.canActivate(mockContext(user, ['ADMIN']));
    expect(result).toBe(true);
  });
});
