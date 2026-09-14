import { SetMetadata } from '@nestjs/common';
import { ACCESSSCOPE_KEY, AccessScopeRequirement } from '../../common/guards/access-scope.guard';

export { AccessScopeRequirement };

export const RequireAccessScope = (requirement: AccessScopeRequirement = {}) =>
  SetMetadata(ACCESSSCOPE_KEY, requirement);
