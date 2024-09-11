export interface AppEnv {
  DB_NAME: string;
  DB_PORT: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_HOST: string;
  PORT: string;
  GRPC_HOST: string;
  NODE_ENV: 'production' | 'development';
}
