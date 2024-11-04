import { Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeGaugeProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';

import { MetricsService } from '@/metrics/metrics.service';
import { TotalRequestsMetricsInterceptor } from '@/metrics/total-requests-metrics.interceptor';
import { MetricName } from '@/metrics/metric-name.enum';

@Module({
  imports: [
    PrometheusModule.register({
      global: true,
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    MetricsService,
    TotalRequestsMetricsInterceptor,
    makeCounterProvider({
      name: MetricName.TotalRequests,
      help: 'Total requests received',
    }),
    makeGaugeProvider({
      name: MetricName.RequestsPerMinute,
      help: 'Requests per minute',
    }),
  ],
  controllers: [],
  exports: [MetricsService, TotalRequestsMetricsInterceptor],
})
export class MetricsModule {}
