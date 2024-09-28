export interface ServiceDiscoveryRequest {
  serviceName: string;
  serviceId: string;
  url: string;
  healthcheck: {
    url: string;
    checkInterval: number;
  };
}

export interface ServiceInstance {
  id: string;
  url: string;
}

export interface ServiceInstancesResponse {
  instances: Array<ServiceInstance>;
}
