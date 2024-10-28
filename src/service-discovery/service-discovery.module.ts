import {
  Logger,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ServiceDiscoveryService } from '@/service-discovery/service-discovery.service';

@Module({
  imports: [HttpModule],
  exports: [ServiceDiscoveryService],
  providers: [ServiceDiscoveryService],
  controllers: [],
})
export class ServiceDiscoveryModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ServiceDiscoveryModule.name);

  constructor(
    private readonly serviceDiscoveryService: ServiceDiscoveryService,
  ) {}

  onApplicationBootstrap(): void {
    this.serviceDiscoveryService.registerService().then((success) => {
      if (success) {
        this.logger.log('Service registered');
      } else {
        this.logger.error(
          'Error registering service, shutting down application',
        );
        process.exit(1);
      }
    });
  }

  async onApplicationShutdown(signal: string): Promise<void> {
    await this.serviceDiscoveryService.unregisterService();
  }
}
