import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as uuid from 'uuid';

import { AppEnv } from '@/types/app-env';
import { ServiceDiscoveryEntry } from '@/service-discovery/service-discovery.types';

@Injectable()
export class ServiceDiscoveryService {
  healthcheckInterval: number = 60;

  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly hostname: string;
  private readonly id = uuid.v4();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<AppEnv>,
  ) {
    this.healthcheckInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_HEALTHCHECK_INTERVAL'),
    );
    this.hostname = this.config.get('HOSTNAME');
  }

  async getInstances(serviceName: string): Promise<ServiceDiscoveryEntry[]> {
    const url = new URL(
      `/api/v1/registry/${serviceName}`,
      this.config.get('SERVICE_DISCOVERY_HTTP_URL'),
    );

    const res = await firstValueFrom(
      this.http.get<ServiceDiscoveryEntry[]>(url.toString()),
    );

    return res.data;
  }

  async getInstance(serviceName: string): Promise<ServiceDiscoveryEntry> {
    const url = new URL(
      `/api/v1/load-balancing/${serviceName}`,
      this.config.get('SERVICE_DISCOVERY_HTTP_URL'),
    );
    const res = await firstValueFrom(
      this.http.get<ServiceDiscoveryEntry>(url.toString()),
    );

    return res.data;
  }

  async registerService(retryAttempts = 5): Promise<boolean> {
    const grpcPort = this.config.get('GRPC_PORT');
    const grpcScheme = this.config.get('GRPC_SCHEME');
    const httpPort = parseInt(this.config.get('HTTP_PORT'));
    const httpScheme = this.config.get('HTTP_SCHEME');

    const grpcUrl = `${grpcScheme}://${this.hostname}:${grpcPort}`;
    const httpUrl = `${httpScheme}://${this.hostname}:${httpPort}`;
    const healthCheckUrl = `${httpUrl}/api/v1/health`;
    const healthPingUrl = `${healthCheckUrl}/ping`;

    const data: ServiceDiscoveryEntry = {
      name: 'transaction-service',
      id: this.id,
      healthCheckInterval: this.healthcheckInterval,
      grpcUri: grpcUrl,
      healthCheckUri: healthCheckUrl,
      healthPingUri: healthPingUrl,
      httpUri: httpUrl,
    };

    const retryInterval = parseInt(
      this.config.get('SERVICE_DISCOVERY_RETRY_INTERVAL'),
    );
    const requestTimeout = parseInt(
      this.config.get('SERVICE_DISCOVERY_REQUEST_TIMEOUT'),
    );
    const requestUrl = new URL(
      '/api/v1/registry',
      this.config.get('SERVICE_DISCOVERY_HTTP_URL'),
    );

    try {
      await firstValueFrom(
        this.http.post(requestUrl.toString(), data, {
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
    const requestUrl = new URL(
      `/api/v1/registry/${this.hostname}`,
      this.config.get('SERVICE_DISCOVERY_HTTP_URL'),
    );

    await firstValueFrom(this.http.delete(requestUrl.toString()));
  }
}
