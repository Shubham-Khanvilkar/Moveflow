import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService } from '../../common/health-check.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    const status = await this.healthCheckService.check();
    this.healthCheckService.logHealthCheck(status);

    const httpStatus =
      status.status === 'healthy'
        ? HttpStatus.OK
        : status.status === 'degraded'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;

    return {
      statusCode: httpStatus,
      ...status,
    };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  async ready() {
    const status = await this.healthCheckService.check();
    if (status.status === 'unhealthy') {
      throw new ServiceUnavailableException({ ready: false, status: status.status });
    }
    return { ready: true, status: status.status };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return { alive: true, timestamp: new Date().toISOString() };
  }
}
