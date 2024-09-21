export interface ServiceDiscoveryRequest {
  serviceName: string;
  serviceId: string;
  url: string;
  healthcheck: {
    url: string;
    checkInterval: number;
  };
}
