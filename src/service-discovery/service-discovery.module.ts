import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ServiceDiscoveryService } from './service-discovery.service';

@Module({
  imports: [HttpModule],
  exports: [],
  providers: [ServiceDiscoveryService],
  controllers: [],
})
export class ServiceDiscoveryModule implements OnApplicationBootstrap {
  constructor(
    private readonly serviceDiscoveryService: ServiceDiscoveryService,
  ) {}

  async onApplicationBootstrap() {
    await this.serviceDiscoveryService.registerService();
  }
}
