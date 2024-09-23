import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ConcurrencyService } from '@/concurrency/concurrency.service';
import { RpcException } from '@nestjs/microservices';
import { GrpcStatus } from '@/enums/grpc-status.enum';

@Injectable()
export class ConcurrencyGrpcInterceptor implements NestInterceptor {
  constructor(private readonly concurrencyService: ConcurrencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.concurrencyService.canRegister()) {
      throw new RpcException({
        code: GrpcStatus.UNAVAILABLE,
        message: 'Too many concurrent requests being processed',
      });
    }

    this.concurrencyService.register();

    return next
      .handle()
      .pipe(finalize(() => this.concurrencyService.unregister()));
  }
}
