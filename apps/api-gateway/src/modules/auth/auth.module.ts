import { AuthorizationService } from '../../common/services/authorization.service';
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { PasswordPolicyService } from './password-policy.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { DashboardRegistryService } from '../dashboard/dashboard-registry.service';
import { AccessControlService } from '../dashboard/access-control.service';
import { DatabaseModule } from '../../common/database.module';
import { PrismaService } from '../../common/prisma.service';
import { PermissionComposerService } from './permission-composer.service';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ScheduledTasksService } from '../../common/scheduled-tasks.service';
import { SignupController } from './signup.controller';
import { SecurityEventService } from '../security/security-event.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('SUPABASE_JWT_SECRET')
          || configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('SUPABASE_JWT_SECRET or JWT_SECRET environment variable is required');
        }
        return {
          secret,
          signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') || '24h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, ApiKeyController, SignupController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    AuditService,
    ApiKeyService,
    PasswordPolicyService,
    ApiKeyGuard,
    DashboardRegistryService,
    AccessControlService,
    PrismaService,
    AuthorizationService,
    PermissionComposerService,
    ApprovalWorkflowService,
    ScheduledTasksService,
    SecurityEventService,
  ],
  exports: [AuthService, ApiKeyGuard, PermissionComposerService, ApprovalWorkflowService, ScheduledTasksService, JwtStrategy, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
