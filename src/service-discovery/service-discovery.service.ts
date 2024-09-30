import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

import { AppEnv } from '@/types/app-env';
import { TRANSACTION_SERVICE_NAME } from '@/generated/proto/transaction_service';
import {
  ServiceDiscoveryRequest,
  ServiceInstance,
  ServiceInstancesResponse,
} from '@/service-discovery/service-discovery.types';

@Injectable()
export class ServiceDiscoveryService {
  private readonly logger = new Logger(ServiceDiscoveryService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<AppEnv>,
  ) {}

  async getInstances(serviceName: string): Promise<ServiceInstance[]> {
    const url =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') +
      `/api/service/${serviceName}`;

    const res = await firstValueFrom(
      this.http.get<ServiceInstancesResponse>(url),
    );

    return res.data.instances;
  }

  async registerService(retryAttempts = 10): Promise<void> {
    const hostname = this.config.get('HOSTNAME');
    const grpcPort = parseInt(this.config.get('TRANSACTION_SERVICE_GRPC_PORT'));
    const serviceUrl = `${hostname}:${grpcPort}`;

    const httpPort = parseInt(this.config.get('HTTP_PORT'));
    const httpScheme = this.config.get('HTTP_SCHEME');
    const healthcheckUrl = `${httpScheme}://${hostname}:${httpPort}/health`;

    const healthcheckInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_HEALTHCHECK_INTERVAL'),
    );

    const data: ServiceDiscoveryRequest = {
      serviceName: TRANSACTION_SERVICE_NAME,
      serviceId: uuid(),
      url: serviceUrl,
      healthcheck: {
        url: healthcheckUrl,
        checkInterval: healthcheckInterval,
      },
    };

    const retryInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_RETRY_INTERVAL'),
    );
    const requestTimeout = parseInt(
      this.config.get('SERVICE_DISCOVERY_REQUEST_TIMEOUT'),
    );
    const requestUrl =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') + '/api/service/register';

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
}
