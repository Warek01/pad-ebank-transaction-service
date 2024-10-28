import { Controller, Get, UseInterceptors } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ConcurrencyService } from '@/concurrency/concurrency.service';
import { HealthPingDto } from '@/dtos/response/health-ping.dto';

@Controller('health')
@ApiTags('Health')
@UseInterceptors()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly concurrencyService: ConcurrencyService,
  ) {}

  @ApiOperation({ description: 'Get current running tasks count' })
  @ApiResponse({ type: HealthPingDto })
  @Get('ping')
  loadAwarePing() {
    return {
      runningTasksCount: this.concurrencyService.runningTasksCount,
    } as HealthPingDto;
  }

  @ApiOperation({ description: 'Healthcheck' })
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      () => this.memory.checkRSS('memory', 512 * 1024 * 1024),
    ]);
  }
}
