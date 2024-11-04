export interface ServiceDiscoveryEntry {
  name: string;
  id: string;
  healthCheckInterval: number;
  healthCheckUri: string;
  healthPingUri: string;
  httpUri?: string;
  grpcUri?: string;
}
