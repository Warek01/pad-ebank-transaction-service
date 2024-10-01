import {
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ServiceDiscoveryService } from './service-discovery.service';

@Module({
  imports: [HttpModule],
  exports: [ServiceDiscoveryService],
  providers: [ServiceDiscoveryService],
  controllers: [],
})
export class ServiceDiscoveryModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    private readonly serviceDiscoveryService: ServiceDiscoveryService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.serviceDiscoveryService.registerService();
  }

  async onApplicationShutdown(signal: string): Promise<void> {
    await this.serviceDiscoveryService.unregisterService();
  }
}
