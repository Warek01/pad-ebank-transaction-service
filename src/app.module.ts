import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { minutes, seconds, ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { HealthModule } from '@/health/health-module';
import { TransactionModule } from '@/transaction/transaction.module';
import { AppController } from '@/app.controller';
import { AppEnv } from '@/types/app-env';
import { ServiceDiscoveryModule } from '@/service-discovery/service-discovery.module';
import { TimeoutInterceptor } from '@/interceptors/timeout.interceptor';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { ConcurrencyModule } from '@/concurrency/concurrency.module';
import { ThrottlingModule } from '@/throttling/throttling.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.production'],
      expandVariables: true,
      ignoreEnvVars: false,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (conf: ConfigService<AppEnv>): TypeOrmModuleOptions => ({
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
    PrometheusModule.register(),
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
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useValue: new TimeoutInterceptor(seconds(10)),
    },
  ],
  exports: [],
})
export class AppModule {}
