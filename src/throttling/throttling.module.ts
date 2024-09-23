import { Module } from '@nestjs/common';

import { ThrottlingService } from '@/throttling/throttling.service';
import { ThrottlingGrpcGuard } from '@/throttling/throttling.grpc.guard';

@Module({
  providers: [ThrottlingService, ThrottlingGrpcGuard],
  exports: [ThrottlingService, ThrottlingGrpcGuard],
  controllers: [],
  imports: [],
})
export class ThrottlingModule {}
