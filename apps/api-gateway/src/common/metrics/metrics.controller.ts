import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Get('metrics')
  @Roles('NAVIRA_PLATFORM_ADMINISTRATOR', 'COMPANY_ADMIN', 'TRANSPORT_ADMIN')
  @Header('Content-Type', 'text/plain')
  getMetrics() {
    return this.metrics.getMetrics();
  }
}
