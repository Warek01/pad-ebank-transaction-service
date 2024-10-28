import { ReflectionService } from '@grpc/reflection';
import { NestFactory } from '@nestjs/core';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { INestApplication, Logger, ShutdownSignal } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Express } from 'express';
import fs from 'fs/promises';
import path from 'path';

import { AppModule } from '@/app.module';
import { AppEnv } from '@/types/app-env';
import { TRANSACTION_SERVICE_PACKAGE_NAME } from '@/generated/proto/transaction_service';

async function bootstrap() {
  const logger = new Logger(bootstrap.name, { timestamp: true });
  const app = await NestFactory.create<INestApplication<Express>>(AppModule, {
    logger,
  });
  const config = app.get(ConfigService<AppEnv>);
  const httpPort = config.get('HTTP_PORT');
  const httpHost = config.get('HTTP_HOST');
  const grpcHost = config.get('GRPC_HOST');
  const grpcPort = config.get('GRPC_PORT');
  const hostname = config.get('HOSTNAME');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('eBank transaction service')
    .setVersion('1.0.0')
    .addTag('Test', 'Test methods for testing the features')
    .addTag(
      'Health',
      'Healthcheck methods for service discovery and load balancing',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument);

  const protosPath: string = path.join(__dirname, 'proto');
  const protoFiles: string[] = await fs.readdir(protosPath);

  const transactionGrpcOptions: GrpcOptions = {
    options: {
      protoPath: protoFiles,
      loader: {
        defaults: true,
        includeDirs: [protosPath],
      },
      package: TRANSACTION_SERVICE_PACKAGE_NAME,
      url: `${grpcHost}:${grpcPort}`,
      onLoadPackageDefinition: (pkg, server) =>
        new ReflectionService(pkg).addToServer(server),
    },
    transport: Transport.GRPC,
  };

  app.connectMicroservice(transactionGrpcOptions);
  app.enableCors({
    origin: '*',
    allowedHeaders: '*',
    methods: '*',
  });
  app.enableShutdownHooks([ShutdownSignal.SIGTERM, ShutdownSignal.SIGINT]);

  await Promise.all([
    app.startAllMicroservices(),
    app.listen(httpPort, httpHost, () =>
      logger.log(`HTTP listening to ${httpHost}:${httpPort}`),
    ),
  ]);

  logger.log(`========== Container hostname: ${hostname} ==========`);
}

bootstrap();
