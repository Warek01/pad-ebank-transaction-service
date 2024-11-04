import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { MetricsService } from '@/metrics/metrics.service';

@Injectable()
export class TotalRequestsMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    this.metricsService.onRequest();
    return next.handle();
  }
}
