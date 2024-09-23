import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppEnv } from '@/types/app-env';

@Injectable()
export class ConcurrencyService {
  private readonly maxRunningTasks: number;
  runningTasksCount = 0;

  constructor(private readonly config: ConfigService<AppEnv>) {
    this.maxRunningTasks = parseInt(config.get('MAX_CONCURRENT_TASKS'));
  }

  canRegister() {
    return this.runningTasksCount < this.maxRunningTasks;
  }

  register() {
    this.runningTasksCount++;
  }

  unregister() {
    this.runningTasksCount--;
  }
}
