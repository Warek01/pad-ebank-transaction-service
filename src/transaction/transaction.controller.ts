import { Controller, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateTransactionData,
  CreateTransactionResult,
  GetHistoryOptions,
  Transaction as ProtoTransaction,
  TransactionServiceController,
  TransactionServiceControllerMethods,
  TransactionsHistory,
} from '@/generated/proto/transaction_service';
import { Transaction } from '@/entities/transaction.entity';
import { ConcurrencyGrpcInterceptor } from '@/concurrency/concurrency.grpc.interceptor';
import { ThrottlingGrpcGuard } from '@/throttling/throttling.grpc.guard';
import { ServiceDiscoveryService } from '@/service-discovery/service-discovery.service';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { CacheService } from '@/cache/cache.service';

@Controller('transaction')
@TransactionServiceControllerMethods()
@UseGuards(ThrottlingGrpcGuard)
@UseInterceptors(ConcurrencyGrpcInterceptor)
@UseInterceptors(LoggingInterceptor)
export class TransactionController implements TransactionServiceController {
  private logger = new Logger(TransactionController.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly sdService: ServiceDiscoveryService,
    private readonly cache: CacheService,
  ) {}

  async createTransaction(
    request: CreateTransactionData,
    metadata?: Metadata,
  ): Promise<CreateTransactionResult> {
    const transaction = new Transaction();

    transaction.type = request.type;

    if (request.depositData) {
      transaction.currency = request.depositData.currency;
      transaction.srcCardCode = request.depositData.cardCode;
      transaction.amount = request.depositData.amount;
    } else if (request.transferData) {
      transaction.currency = request.transferData.currency;
      transaction.srcCardCode = request.transferData.srcCardCode;
      transaction.dstCardCode = request.transferData.dstCardCode;
      transaction.amount = request.transferData.amount;
    } else if (request.withdrawData) {
      transaction.currency = request.withdrawData.currency;
      transaction.srcCardCode = request.withdrawData.cardCode;
      transaction.amount = request.withdrawData.amount;
    }

    transaction.timestamp = new Date();

    await this.transactionRepo.save(transaction);

    return {};
  }

  async getHistory(
    request: GetHistoryOptions,
    metadata?: Metadata,
  ): Promise<TransactionsHistory> {
    const key = `transaction-history-${request.cardCode.replaceAll(' ', '_')}-${request.year}-${request.month}`;
    const cache = await this.cache.client.get(key);

    if (cache) {
      this.logger.log(`Returned from cache ${key}`);
      return JSON.parse(cache) as TransactionsHistory;
    }

    const dateMin = new Date(request.year, request.month);
    const dateMax = new Date(dateMin);
    dateMax.setMonth(dateMax.getMonth() + 1);

    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.src_card_code = :code OR t.dst_card_code = :code', {
        code: request.cardCode,
      })
      .andWhere('t.timestamp >= :dateMin', { dateMin: dateMin.toISOString() })
      .andWhere('t.timestamp < :dateMax', { dateMax: dateMax.toISOString() })
      .getMany();

    const result = {
      transactions: transactions.map(
        (t): ProtoTransaction => ({
          type: t.type,
          amount: t.amount,
          dstCardCode: t.dstCardCode,
          srcCardCode: t.srcCardCode,
          transactionId: t.id,
          date: t.timestamp.toISOString(),
        }),
      ),
    };

    await this.cache.client.set(key, JSON.stringify(result));
    await this.cache.client.expire(key, 120);

    return result;
  }
}
