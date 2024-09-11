import { ReflectionService } from '@grpc/reflection';
import { NestFactory } from '@nestjs/core';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { INestApplication } from '@nestjs/common';
import { Express } from 'express';
import fs from 'fs/promises';
import path from 'path';

import { SHARED_PACKAGE_NAME } from '@ebank-transaction/generated/proto/currency';
import { TRANSACTION_SERVICE_PACKAGE_NAME } from '@ebank-transaction/generated/proto/transacton_service';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<INestApplication<Express>>(AppModule);

  const protosPath: string = path.join(__dirname, 'proto');
  const protoFiles: string[] = await fs.readdir(protosPath);

  const transactionMicroserviceGrpcOptions: GrpcOptions = {
    options: {
      protoPath: protoFiles,
      loader: {
        includeDirs: [protosPath],
      },
      package: [SHARED_PACKAGE_NAME, TRANSACTION_SERVICE_PACKAGE_NAME],
      url: '0.0.0.0:3001',
      onLoadPackageDefinition: (pkg, server) =>
        new ReflectionService(pkg).addToServer(server),
    },
    transport: Transport.GRPC,
  };

  app.connectMicroservice(transactionMicroserviceGrpcOptions);

  await Promise.all([app.startAllMicroservices(), app.listen(3000)]);
}

bootstrap();
