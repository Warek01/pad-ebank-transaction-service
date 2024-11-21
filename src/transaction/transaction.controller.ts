import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ProtoCreateTransactionData,
  ProtoCreateTransactionResult,
  ProtoGetHistoryOptions,
  ProtoTransaction,
  ProtoTransactionsHistory,
  TransactionServiceController,
  TransactionServiceControllerMethods,
} from '@/generated/proto/transaction_service';
import { Transaction } from '@/entities/transaction.entity';
import { ConcurrencyGrpcInterceptor } from '@/concurrency/concurrency.grpc.interceptor';
import { ThrottlingGrpcGuard } from '@/throttling/throttling.grpc.guard';
import { LoggingInterceptor } from '@/interceptors/logging.interceptor';
import { TransactionType } from '@/enums/transaction-type.enum';
import { Currency } from '@/enums/currency.enum';

@Controller('transaction')
@TransactionServiceControllerMethods()
@UseGuards(ThrottlingGrpcGuard)
@UseInterceptors(ConcurrencyGrpcInterceptor)
@UseInterceptors(LoggingInterceptor)
export class TransactionController implements TransactionServiceController {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async createTransaction(
    request: ProtoCreateTransactionData,
    metadata?: Metadata,
  ): Promise<ProtoCreateTransactionResult> {
    const transaction = new Transaction();

    transaction.type = request.type as TransactionType;

    if (request.depositData) {
      transaction.currency = request.depositData.currency as Currency;
      transaction.dstCardCode = request.depositData.cardCode;
      transaction.amount = request.depositData.amount;
    } else if (request.transferData) {
      transaction.currency = request.transferData.currency as Currency;
      transaction.srcCardCode = request.transferData.srcCardCode;
      transaction.dstCardCode = request.transferData.dstCardCode;
      transaction.amount = request.transferData.amount;
    } else if (request.withdrawData) {
      transaction.currency = request.withdrawData.currency as Currency;
      transaction.dstCardCode = request.withdrawData.cardCode;
      transaction.amount = request.withdrawData.amount;
    }

    await this.transactionRepo.save(transaction);

    return {};
  }

  async getHistory(
    request: ProtoGetHistoryOptions,
    metadata?: Metadata,
  ): Promise<ProtoTransactionsHistory> {
    const dateMin = new Date(request.year, request.month);
    const dateMax = new Date(dateMin);
    dateMax.setMonth(dateMax.getMonth() + 1);

    const transactions = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.src_card_code = :code OR t.dst_card_code = :code', {
        code: request.cardCode,
      })
      .andWhere('t.createdAt >= :dateMin', { dateMin: dateMin.toISOString() })
      .andWhere('t.createdAt < :dateMax', { dateMax: dateMax.toISOString() })
      .getMany();

    return {
      transactions: transactions.map(
        (t): ProtoTransaction => ({
          type: t.type,
          amount: t.amount,
          dstCardCode: t.dstCardCode,
          srcCardCode: t.srcCardCode,
          transactionId: t.id,
          date: t.createdAt.toISOString(),
        }),
      ),
    };
  }
}
