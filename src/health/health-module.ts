import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ConcurrencyModule } from '@/concurrency/concurrency.module';

import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, ConcurrencyModule],
  exports: [],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
