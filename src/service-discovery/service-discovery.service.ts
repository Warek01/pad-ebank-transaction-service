import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

import { AppEnv } from '@/types/app-env';
import {
  ServiceDiscoveryRequest,
  ServiceInstance,
} from '@/service-discovery/service-discovery.types';
import { TRANSACTION_SERVICE_NAME } from '@/generated/proto/transaction_service';

@Injectable()
export class ServiceDiscoveryService {
  healthcheckInterval: number = 60;

  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly id: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<AppEnv>,
  ) {
    this.healthcheckInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_HEALTHCHECK_INTERVAL'),
    );
    this.id = uuid();
  }

  async getInstances(name: string): Promise<ServiceInstance[]> {
    const url =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') +
      `/api/v1/registry/${name}`;

    const res = await firstValueFrom(this.http.get<ServiceInstance[]>(url));

    return res.data;
  }

  async registerService(retryAttempts = 5): Promise<void> {
    const hostname = this.config.get('HOSTNAME');
    const grpcPort = this.config.get('GRPC_PORT');
    const serviceUrl = `${hostname}:${grpcPort}`;

    const httpPort = parseInt(this.config.get('HTTP_PORT'));
    const httpScheme = this.config.get('HTTP_SCHEME');
    const healthCheckUrl = `${httpScheme}://${hostname}:${httpPort}/health`;

    const data: ServiceDiscoveryRequest = {
      name: TRANSACTION_SERVICE_NAME,
      id: this.id,
      url: serviceUrl,
      healthCheckUrl: healthCheckUrl,
      healthCheckInterval: this.healthcheckInterval,
    };

    const retryInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_RETRY_INTERVAL'),
    );
    const requestTimeout = parseInt(
      this.config.get('SERVICE_DISCOVERY_REQUEST_TIMEOUT'),
    );
    const requestUrl =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') + '/api/v1/registry';

    try {
      await firstValueFrom(
        this.http.post(requestUrl, data, {
          timeout: requestTimeout,
        }),
      );

      this.logger.log('Service registered');
    } catch (e) {
      this.logger.error(e);

      if (retryAttempts <= 0) {
        this.logger.error('Error registering service');
        this.logger.log('Shutting down the application...');
        process.kill(process.pid, 'SIGINT');
        return;
      }

      await new Promise((res) => setTimeout(res, retryInterval));
      await this.registerService(retryAttempts - 1);
    }
  }

  async unregisterService() {
    const requestUrl =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') +
      '/api/v1/registry/' +
      this.id;

    await firstValueFrom(this.http.delete(requestUrl));
  }
}
