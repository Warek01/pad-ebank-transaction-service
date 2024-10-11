export interface ServiceDiscoveryRequest {
  name: string;
  host: string;
  port: string;
  scheme: string;
  healthCheckUrl: string;
  healthCheckInterval: number;
}

export interface ServiceInstance {
  scheme: string;
  host: string;
  port: string;
}
