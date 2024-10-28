import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { AppEnv } from '@/types/app-env';
import { ACCOUNT_SERVICE_NAME } from '@/generated/proto/account_service';
import {
  ServiceDiscoveryRequest,
  ServiceInstance,
} from '@/service-discovery/service-discovery.types';

@Injectable()
export class ServiceDiscoveryService {
  healthcheckInterval: number = 60;

  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly hostname: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<AppEnv>,
  ) {
    this.healthcheckInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_HEALTHCHECK_INTERVAL'),
    );
    this.hostname = this.config.get('HOSTNAME');
  }

  async getInstances(serviceName: string): Promise<ServiceInstance[]> {
    const url =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') +
      `/api/v1/registry/${serviceName}`;

    const res = await firstValueFrom(this.http.get<ServiceInstance[]>(url));

    return res.data;
  }

  async registerService(retryAttempts = 5): Promise<boolean> {
    const grpcPort = this.config.get('GRPC_PORT');
    const grpcScheme = this.config.get('GRPC_SCHEME');

    const httpPort = parseInt(this.config.get('HTTP_PORT'));
    const httpScheme = this.config.get('HTTP_SCHEME');
    const healthCheckUrl = `${httpScheme}://${this.hostname}:${httpPort}/health`;

    const data: ServiceDiscoveryRequest = {
      name: ACCOUNT_SERVICE_NAME,
      host: this.hostname,
      port: grpcPort,
      scheme: grpcScheme,
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

      return true;
    } catch (e) {
      this.logger.error(e);

      if (retryAttempts <= 0) {
        return false;
      }

      await new Promise((res) => setTimeout(res, retryInterval));
      return await this.registerService(retryAttempts - 1);
    }
  }

  async unregisterService() {
    const requestUrl =
      this.config.get('SERVICE_DISCOVERY_HTTP_URL') +
      '/api/v1/registry/' +
      this.hostname;

    await firstValueFrom(this.http.delete(requestUrl));
  }
}
