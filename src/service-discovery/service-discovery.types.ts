export interface ServiceDiscoveryRequest {
  name: string;
  id: string;
  url: string;
  healthCheckUrl: string;
  healthCheckInterval: number;
}

export interface ServiceInstance {
  id: string;
  url: string;
}
