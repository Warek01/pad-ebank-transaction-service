import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

import { MetricName } from '@/metrics/metric-name.enum';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private requestsThisMinute = 0;
  private requestsPerMinuteInterval: NodeJS.Timeout;

  constructor(
    @InjectMetric(MetricName.TotalRequests)
    private readonly totalRequestsCounter: Counter<string>,
    @InjectMetric(MetricName.RequestsPerMinute)
    private readonly requestsPerMinuteGauge: Gauge<string>,
  ) {}

  onModuleInit() {
    this.requestsPerMinuteInterval = setInterval(() => {
      this.requestsPerMinuteGauge.set(this.requestsThisMinute);
      this.requestsThisMinute = 0;
    }, 60_000);
  }

  public onModuleDestroy() {
    clearTimeout(this.requestsPerMinuteInterval);
  }

  onRequest() {
    this.totalRequestsCounter.inc();
    this.requestsThisMinute++;
  }
}
