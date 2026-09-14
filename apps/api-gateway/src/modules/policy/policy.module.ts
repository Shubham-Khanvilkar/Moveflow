import { Module } from '@nestjs/common';
import { PolicyEnforcementService } from './policy-enforcement.service';
import { DatabaseModule } from '../../common/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PolicyEnforcementService],
  exports: [PolicyEnforcementService],
})
export class PolicyModule {}
