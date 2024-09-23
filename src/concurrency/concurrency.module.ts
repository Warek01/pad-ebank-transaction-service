import { Module } from '@nestjs/common';

import { ConcurrencyService } from '@/concurrency/concurrency.service';
import { ConcurrencyInterceptor } from '@/concurrency/concurrency.interceptor';
import { ConcurrencyGrpcInterceptor } from '@/concurrency/concurrency.grpc.interceptor';

@Module({
  providers: [
    ConcurrencyService,
    ConcurrencyInterceptor,
    ConcurrencyGrpcInterceptor,
  ],
  exports: [
    ConcurrencyService,
    ConcurrencyInterceptor,
    ConcurrencyGrpcInterceptor,
  ],
  controllers: [],
  imports: [],
})
export class ConcurrencyModule {}
