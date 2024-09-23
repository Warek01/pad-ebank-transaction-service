import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ConcurrencyService } from '@/concurrency/concurrency.service';

@Injectable()
export class ConcurrencyInterceptor implements NestInterceptor {
  constructor(private readonly concurrencyService: ConcurrencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.concurrencyService.canRegister()) {
      throw new ServiceUnavailableException();
    }

    this.concurrencyService.register();

    return next
      .handle()
      .pipe(finalize(() => this.concurrencyService.unregister()));
  }
}
