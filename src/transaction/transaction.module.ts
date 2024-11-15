import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Transaction } from '@/entities/transaction.entity';
import { TransactionController } from '@/transaction/transaction.controller';
import { ThrottlingModule } from '@/throttling/throttling.module';
import { ConcurrencyModule } from '@/concurrency/concurrency.module';
import { ServiceDiscoveryModule } from '@/service-discovery/service-discovery.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    ThrottlingModule,
    ConcurrencyModule,
    ServiceDiscoveryModule,
  ],
  controllers: [TransactionController],
  exports: [],
  providers: [],
})
export class TransactionModule {}
