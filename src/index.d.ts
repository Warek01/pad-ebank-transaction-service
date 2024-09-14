import { AppEnv } from '@/types/app-env';

declare global {
  namespace NodeJS {
    interface ProcessEnv extends AppEnv {}
  }
}
