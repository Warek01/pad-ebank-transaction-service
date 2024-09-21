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
    const port = parseInt(this.config.get('HTTP_PORT'));
    const scheme = this.config.get('HTTP_SCHEME');
    const url = `${scheme}://${hostname}:${port}`;

    try {
      await firstValueFrom(
        this.http.post(
          this.config.get('SERVICE_DISCOVERY_HTTP_URL') + '/services/register',
          {
            serviceName: TRANSACTION_SERVICE_NAME,
            serviceId: uuid(),
            url: url,
            healthcheck: {
              url: url + '/health',
              checkInterval: this.healthcheckInterval,
            },
          } as ServiceDiscoveryRequest,
          {
            timeout: 5000,
          },
        ),
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
