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
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  public intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const startTime = Date.now();
    const contextType = context.getType();

    switch (context.getType()) {
      case 'http':
        return this.handleHttp(context, next, startTime);
      case 'rpc':
        return this.handleRpc(context, next, startTime);
      default:
        this.logger.error(`Unknown context ${contextType}`);
        return next.handle();
    }
  }

  private handleHttp(
    context: ExecutionContext,
    next: CallHandler<any>,
    startTime: number,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        this.logger.log(`HTTP ${method} ${url} took ${endTime - startTime}ms`);
      }),
    );
  }

  private handleRpc(
    context: ExecutionContext,
    next: CallHandler<any>,
    startTime: number,
  ): Observable<any> {
    const impl: ServerWritableStreamImpl<any, any> = context.getArgByIndex(2);
    const path = impl.getPath();

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        this.logger.log(`${path} took ${endTime - startTime}ms`);
      }),
    );
  }
}
