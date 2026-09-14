import { SetMetadata } from '@nestjs/common';
import { OWNER_ONLY_KEY } from '../guards/owner-only.guard';

export const OwnerOnly = () => SetMetadata(OWNER_ONLY_KEY, true);
