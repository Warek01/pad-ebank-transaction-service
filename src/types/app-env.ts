export interface AppEnv {
  NODE_ENV: string;

  DB_NAME: string;
  DB_PORT: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_HOST: string;

  HTTP_PORT: string;

  TRANSACTION_SERVICE_GRPC_HOST: string;
  TRANSACTION_SERVICE_GRPC_PORT: string;
  TRANSACTION_SERVICE_GRPC_URL: string;

  ACCOUNT_SERVICE_GRPC_PORT: string;
  ACCOUNT_SERVICE_GRPC_URL: string;
  ACCOUNT_SERVICE_GRPC_HOST: string;
}
