import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { AppEnv } from '@/types/app-env';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  client: Redis;

  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly config: ConfigService<AppEnv>) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.config.get('REDIS_HOST'),
      port: parseInt(this.config.get('REDIS_PORT')),
      username: this.config.get('REDIS_USER'),
      password: this.config.get('REDIS_PASSWORD'),
      db: parseInt(this.config.get('REDIS_DB')),
      lazyConnect: true,
      enableAutoPipelining: true,
    });

    this.client
      .on('error', (err) => this.logger.error(err))
      .on('ready', () => this.logger.log('Connected'))
      .on('reconnecting', () => this.logger.log('Reconnecting...'))
      .on('close', () => this.logger.log('Closed'))
      .on('ready', () => this.logger.log('Ready'));

    await this.client.connect();
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
