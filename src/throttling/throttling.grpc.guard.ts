import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ServerWritableStreamImpl } from '@grpc/grpc-js/build/src/server-call';
import { RpcException } from '@nestjs/microservices';

import { ThrottlingService } from '@/throttling/throttling.service';
import { GrpcStatus } from '@/enums/grpc-status.enum';

@Injectable()
export class ThrottlingGrpcGuard implements CanActivate {
  constructor(private readonly throttlingService: ThrottlingService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const impl: ServerWritableStreamImpl<any, any> = context.getArgByIndex(2);
    const ip = impl.getPeer();
    const path = impl.getPath();

    if (!this.throttlingService.canUse(ip, path)) {
      throw new RpcException({
        code: GrpcStatus.UNAVAILABLE,
        message: 'Too many requests, please try again later.',
      });
    }

    this.throttlingService.use(ip, path);

    return true;
  }
}
