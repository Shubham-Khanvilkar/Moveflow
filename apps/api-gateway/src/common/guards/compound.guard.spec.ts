import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompoundGuard } from './compound.guard';

describe('CompoundGuard', () => {
  let guard: CompoundGuard;
  let reflector: Reflector;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(null),
    } as any;
    mockPrisma = {
      isConnected: jest.fn().mockReturnValue(true),
      accessScope: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    guard = new CompoundGuard(reflector, mockPrisma);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should fail when no auth header', async () => {
      const noAuthContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {},
            user: null,
          }),
          getResponse: jest.fn(),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(noAuthContext)).rejects.toThrow();
    });
  });
});
