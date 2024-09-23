import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  minutes,
  seconds,
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import path from 'path';

import { ACCOUNT_SERVICE_PACKAGE_NAME } from '@/generated/proto/account_service';
import { HealthModule } from '@/health/health-module';
import { TransactionModule } from '@/transaction/transaction.module';
import { AppController } from '@/app.controller';
import { AppEnv } from '@/types/app-env';
import { ServiceDiscoveryModule } from '@/service-discovery/service-discovery.module';
import { TimeoutInterceptor } from '@/interceptors/timeout.interceptor';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { ConcurrencyInterceptor } from '@/concurrency/concurrency.interceptor';
import { ConcurrencyModule } from '@/concurrency/concurrency.module';
import { ThrottlingModule } from '@/throttling/throttling.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: false,
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (conf: ConfigService<AppEnv>) => ({
        type: 'postgres',
        host: conf.get('DB_HOST'),
        port: conf.get('DB_PORT'),
        database: conf.get('DB_NAME'),
        username: conf.get('DB_USER'),
        password: conf.get('DB_PASSWORD'),
        entities: ['**/*.entity.js'],
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),
    ClientsModule.registerAsync({
      isGlobal: true,
      clients: [
        {
          name: ACCOUNT_SERVICE_PACKAGE_NAME,
          inject: [ConfigService],
          useFactory: (conf: ConfigService<AppEnv>) => ({
            name: ACCOUNT_SERVICE_PACKAGE_NAME,
            options: {
              package: ACCOUNT_SERVICE_PACKAGE_NAME,
              protoPath: path.join(__dirname, 'proto', 'account_service.proto'),
              loader: {
                includeDirs: [path.join(__dirname, 'proto')],
              },
              url: conf.get('ACCOUNT_SERVICE_GRPC_URL'),
            },
            transport: Transport.GRPC,
          }),
        },
      ],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (conf: ConfigService<AppEnv>) => [
        {
          name: 'default',
          ttl: minutes(1),
          limit: 100,
        },
        {
          name: 'throttle-test',
          ttl: seconds(1),
          limit: 10,
        },
      ],
    }),
    HealthModule,
    TransactionModule,
    ServiceDiscoveryModule,
    ConcurrencyModule,
    ThrottlingModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ConcurrencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useValue: new TimeoutInterceptor(seconds(10)),
    },
  ],
  exports: [],
})
export class AppModule {}
