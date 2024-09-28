import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ServerWritableStreamImpl } from '@grpc/grpc-js/build/src/server-call';

@Injectable()
export class LoggingGrpcInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingGrpcInterceptor.name);

  public intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const impl: ServerWritableStreamImpl<any, any> = context.getArgByIndex(2);
    const path = impl.getPath();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        this.logger.log(`${path} took ${endTime - startTime}ms`);
      }),
    );
  }
}
