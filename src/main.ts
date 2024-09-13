import { ReflectionService } from '@grpc/reflection';
import { NestFactory } from '@nestjs/core';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { INestApplication } from '@nestjs/common';
import { Express } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import fs from 'fs/promises';
import path from 'path';

import { TRANSACTION_SERVICE_PACKAGE_NAME } from '@ebank-transaction/generated/proto/transacton_service';
import { AppEnv } from '@ebank-transaction/types/app-env';
import { AppModule } from '@ebank-transaction/app.module';

async function bootstrap() {
  const app = await NestFactory.create<INestApplication<Express>>(AppModule);
  const config = app.get(ConfigService<AppEnv>);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('eBank transaction service')
    .setVersion('1.0.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument);

  const protosPath: string = path.join(__dirname, 'proto');
  const protoFiles: string[] = await fs.readdir(protosPath);

  const transactionMicroserviceGrpcOptions: GrpcOptions = {
    options: {
      protoPath: protoFiles,
      loader: {
        includeDirs: [protosPath],
      },
      package: TRANSACTION_SERVICE_PACKAGE_NAME,
      url: config.get('TRANSACTION_SERVICE_GRPC_URL'),
      onLoadPackageDefinition: (pkg, server) =>
        new ReflectionService(pkg).addToServer(server),
    },
    transport: Transport.GRPC,
  };

  app.connectMicroservice(transactionMicroserviceGrpcOptions);

  await Promise.all([
    app.startAllMicroservices(),
    app.listen(config.get('HTTP_PORT')),
  ]);
}

bootstrap();
