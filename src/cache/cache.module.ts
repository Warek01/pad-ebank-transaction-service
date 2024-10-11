import { Module } from '@nestjs/common';

import { CacheService } from '@/cache/cache.service';

@Module({
  imports: [],
  controllers: [],
  exports: [CacheService],
  providers: [CacheService],
})
export class CacheModule {}
