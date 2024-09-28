import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

import { AppEnv } from '@/types/app-env';
import { TRANSACTION_SERVICE_NAME } from '@/generated/proto/transacton_service';

import { ServiceDiscoveryRequest } from './service-discovery.types';

@Injectable()
export class ServiceDiscoveryService implements OnModuleInit {
  healthcheckInterval: number = 60;
  private readonly logger = new Logger(ServiceDiscoveryService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<AppEnv>,
  ) {}

  onModuleInit() {
    this.healthcheckInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_HEALTHCHECK_INTERVAL'),
    );
  }

  async registerService(retryAttempts = 5): Promise<void> {
    const hostname = this.config.get('HOSTNAME');
    const grpcPort = parseInt(this.config.get('TRANSACTION_SERVICE_GRPC_PORT'));
    const serviceUrl = `${hostname}:${grpcPort}`;

    const httpPort = parseInt(this.config.get('HTTP_PORT'));
    const httpScheme = this.config.get('HTTP_SCHEME');
    const healthcheckUrl = `${httpScheme}://${hostname}:${httpPort}/health`;

    const data: ServiceDiscoveryRequest = {
      serviceName: TRANSACTION_SERVICE_NAME,
      serviceId: uuid(),
      url: serviceUrl,
      healthcheck: {
        url: healthcheckUrl,
        checkInterval: this.healthcheckInterval,
      },
    };

    const requestUrl =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') + '/api/service/register';

    try {
      await firstValueFrom(
        this.http.post(requestUrl, data, {
          timeout: 5000,
        }),
      );

      this.logger.log('Service registered');
    } catch (e) {
      this.logger.error(e);

      if (retryAttempts <= 0) {
        this.logger.error('Error registering service');
        return;
      }

      await new Promise((res) => setTimeout(res, 5000));
      await this.registerService(retryAttempts - 1);
    }
  }
}
