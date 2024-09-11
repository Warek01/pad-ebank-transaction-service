import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import path from 'path';

import { ACCOUNT_SERVICE_PACKAGE_NAME } from '@ebank-transaction/generated/proto/account_service';

import { AppEnv } from './types/app-env';
import { AppController } from './app.controller';
import { StatusModule } from './status/status.module';

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
    ClientsModule.register({
      clients: [
        {
          name: ACCOUNT_SERVICE_PACKAGE_NAME,
          options: {
            package: ACCOUNT_SERVICE_PACKAGE_NAME,
            protoPath: path.join(__dirname, 'proto', 'account_service.proto'),
            url: 'account-service:3000',
          },
          transport: Transport.GRPC,
        },
      ],
    }),
    StatusModule,
  ],
  controllers: [AppController],
  providers: [],
  exports: [],
})
export class AppModule {}
