import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from '@/types/app-env';

export type IpMapEntry = Record<string, number>;

// Bucket throttling on IP address and request path
@Injectable()
export class ThrottlingService implements OnModuleDestroy {
  private readonly interval: number;
  private readonly intervalId: NodeJS.Timeout;
  private readonly ipMap: Record<string, IpMapEntry> = {};
  private readonly ttl: number;
  private readonly limit: number;

  constructor(private readonly config: ConfigService<AppEnv>) {
    this.ttl = parseInt(this.config.get('GRPC_RATE_LIMIT_TTL'));
    this.limit = parseInt(this.config.get('GRPC_RATE_LIMIT_LIMIT'));
    this.interval = this.ttl / this.limit;
    this.intervalId = setInterval(this.tick.bind(this), this.interval);
  }

  onModuleDestroy() {
    clearInterval(this.intervalId);
  }

  canUse(ip: string, path: string) {
    // if path not in map means it has all tokens
    return !(this.ipMap[ip]?.[path] !== undefined && this.ipMap[ip][path] <= 0);
  }

  use(ip: string, path: string) {
    if (!this.ipMap[ip]) {
      this.ipMap[ip] = {};
    }

    if (path in this.ipMap[ip]) {
      this.ipMap[ip][path]--;
    } else {
      this.ipMap[ip][path] = this.limit - 1;
    }
  }

  private tick() {
    for (const ip in this.ipMap) {
      let allEntriesFull = true;
      const entry = this.ipMap[ip];

      for (const path in entry) {
        entry[path] = Math.min(this.limit, entry[path] + 1);

        if (entry[path] < this.limit) {
          allEntriesFull = false;
        }
      }

      // delete record to prevent memory leaks
      if (allEntriesFull) {
        delete this.ipMap[ip];
      }
    }
  }
}
