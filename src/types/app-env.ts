export interface AppEnv {
  NODE_ENV: string;

  HOSTNAME: string;

  DB_NAME: string;
  DB_PORT: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_HOST: string;

  HTTP_PORT: string;
  HTTP_HOST: string;
  HTTP_SCHEME: string;

  TRANSACTION_SERVICE_GRPC_HOST: string;
  TRANSACTION_SERVICE_GRPC_PORT: string;
  TRANSACTION_SERVICE_GRPC_URL: string;

  ACCOUNT_SERVICE_GRPC_PORT: string;
  ACCOUNT_SERVICE_GRPC_URL: string;
  ACCOUNT_SERVICE_GRPC_HOST: string;

  SERVICE_DISCOVERY_HTTP_URL: string;
  SERVICE_DISCOVERY_HEALTHCHECK_INTERVAL: string;
}
