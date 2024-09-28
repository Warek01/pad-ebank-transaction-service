import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import path from 'path';

import {
  CancelTransactionOptions,
  CancelTransactionResult,
  DepositData,
  DepositResult,
  GetHistoryOptions,
  Transaction as ProtoTransaction,
  TransactionServiceController,
  TransactionServiceControllerMethods,
  TransactionsHistory,
  TransactionType,
  TransferData,
  TransferResult,
  WithdrawData,
  WithdrawResult,
} from '@/generated/proto/transaction_service';
import {
  ACCOUNT_SERVICE_NAME,
  ACCOUNT_SERVICE_PACKAGE_NAME,
  AccountServiceClient,
} from '@/generated/proto/account_service';
import { Transaction } from '@/entities/transaction.entity';
import { ServiceError, ServiceErrorCode } from '@/generated/proto/shared';
import { ConcurrencyGrpcInterceptor } from '@/concurrency/concurrency.grpc.interceptor';
import { ThrottlingGrpcGuard } from '@/throttling/throttling.grpc.guard';
import { sleep } from '@/utils/sleep';
import { LoggingGrpcInterceptor } from '@/interceptors/logging.grpc.interceptor';
import { ServiceDiscoveryService } from '@/service-discovery/service-discovery.service';
import { ServiceInstance } from '@/service-discovery/service-discovery.types';

@Controller('transaction')
@TransactionServiceControllerMethods()
@UseGuards(ThrottlingGrpcGuard)
@UseInterceptors(ConcurrencyGrpcInterceptor)
@UseInterceptors(LoggingGrpcInterceptor)
export class TransactionController implements TransactionServiceController {
  private accountGrpcClientProxy: ClientGrpcProxy;
  private fetchedInstancesAt = 0;
  private accountServiceUrlIndex = 0;
  private accountServiceInstances: ServiceInstance[] = [];

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly serviceDiscoveryService: ServiceDiscoveryService,
  ) {}

  async cancelTransaction(
    request: CancelTransactionOptions,
    metadata?: Metadata,
  ): Promise<CancelTransactionResult> {
    const accountService = await this.getAccountService();

    const transaction = await this.transactionRepo.findOneBy({
      id: request.transactionId,
    });

    if (!transaction) {
      return {
        error: {
          message: 'transaction not found',
          code: ServiceErrorCode.NOT_FOUND,
        },
      };
    }

    let error: ServiceError | undefined;

    switch (transaction.type) {
      case TransactionType.DEPOSIT: {
        const result = await firstValueFrom(
          accountService.addCurrency({
            currency: transaction.currency,
            amount: -transaction.amount,
            cardCode: transaction.dstCardCode,
          }),
        );
        error = result.error;
        break;
      }
      case TransactionType.WITHDRAW: {
        const result = await firstValueFrom(
          accountService.addCurrency({
            currency: transaction.currency,
            amount: transaction.amount,
            cardCode: transaction.dstCardCode,
          }),
        );
        error = result.error;
        break;
      }
      case TransactionType.TRANSFER: {
        const result1 = await firstValueFrom(
          accountService.addCurrency({
            currency: transaction.currency,
            amount: -transaction.amount,
            cardCode: transaction.srcCardCode,
          }),
        );

        error = result1.error;

        if (error) {
          break;
        }

        const result2 = await firstValueFrom(
          accountService.addCurrency({
            currency: transaction.currency,
            amount: transaction.amount,
            cardCode: transaction.dstCardCode,
          }),
        );
        error = result2.error;
        break;
      }
    }

    return {
      error,
    };
  }

  async depositCurrency(
    request: DepositData,
    metadata?: Metadata,
  ): Promise<DepositResult> {
    const accountService = await this.getAccountService();

    const addCurrencyResult = await firstValueFrom(
      accountService.addCurrency({
        currency: request.currency,
        amount: request.amount,
        cardCode: request.cardCode,
      }),
    );

    if (addCurrencyResult.error) {
      return {
        error: addCurrencyResult.error,
      };
    }

    const transaction = new Transaction();
    transaction.dstCardCode = request.cardCode;
    transaction.type = TransactionType.DEPOSIT;
    transaction.currency = request.currency;
    transaction.amount = request.amount;
    transaction.timestamp = new Date();

    await this.transactionRepo.save(transaction);

    return {};
  }

  async getHistory(
    request: GetHistoryOptions,
    metadata?: Metadata,
  ): Promise<TransactionsHistory> {
    await sleep(60_000);

    const dateMin = new Date(request.year, request.month);
    const dateMax = new Date(dateMin);
    dateMax.setMonth(dateMax.getMonth() + 1);

    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .where('t.src_card_code = :code OR t.dst_card_code = :code', {
        code: request.cardCode,
      })
      .andWhere('t.timestamp >= :dateMin', { dateMin: dateMin.toISOString() })
      .andWhere('t.timestamp < :dateMax', { dateMax: dateMax.toISOString() })
      .getMany();

    return {
      transactions: result.map(
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
  }

  async transferCurrency(
    request: TransferData,
    metadata?: Metadata,
  ): Promise<TransferResult> {
    const accountService = await this.getAccountService();

    const addCurrencyResult1 = await firstValueFrom(
      accountService.addCurrency({
        currency: request.currency,
        amount: -request.amount,
        cardCode: request.srcCardCode,
      }),
    );

    if (addCurrencyResult1.error) {
      return {
        error: addCurrencyResult1.error,
      };
    }

    const addCurrencyResult2 = await firstValueFrom(
      accountService.addCurrency({
        currency: request.currency,
        amount: request.amount,
        cardCode: request.srcCardCode,
      }),
    );

    if (addCurrencyResult2.error) {
      return {
        error: addCurrencyResult2.error,
      };
    }

    const transaction = new Transaction();
    transaction.srcCardCode = request.srcCardCode;
    transaction.dstCardCode = request.dstCardCode;
    transaction.type = TransactionType.TRANSFER;
    transaction.currency = request.currency;
    transaction.amount = request.amount;
    transaction.timestamp = new Date();

    await this.transactionRepo.save(transaction);

    return {};
  }

  async withdrawCurrency(
    request: WithdrawData,
    metadata?: Metadata,
  ): Promise<WithdrawResult> {
    const accountService = await this.getAccountService();

    const addCurrencyResult = await firstValueFrom(
      accountService.addCurrency({
        currency: request.currency,
        amount: -request.amount,
        cardCode: request.cardCode,
      }),
    );

    if (addCurrencyResult.error) {
      return {
        error: addCurrencyResult.error,
      };
    }

    const transaction = new Transaction();
    transaction.dstCardCode = request.cardCode;
    transaction.type = TransactionType.WITHDRAW;
    transaction.currency = request.currency;
    transaction.amount = request.amount;
    transaction.timestamp = new Date();

    await this.transactionRepo.save(transaction);

    return {};
  }

  private async getAccountService(): Promise<AccountServiceClient> {
    this.accountGrpcClientProxy?.close();
    const now = Date.now();

    if (now - this.fetchedInstancesAt > 30 * 1000) {
      this.accountServiceInstances =
        await this.serviceDiscoveryService.getInstances(ACCOUNT_SERVICE_NAME);

      this.fetchedInstancesAt = now;
    }

    this.accountGrpcClientProxy = new ClientGrpcProxy({
      url: this.accountServiceInstances[this.accountServiceUrlIndex].url,
      package: ACCOUNT_SERVICE_PACKAGE_NAME,
      protoPath: path.join(__dirname, '../../proto/account_service.proto'),
      loader: {
        defaults: true,
        includeDirs: [path.join(__dirname, '../../proto')],
      },
    });

    this.accountServiceUrlIndex++;

    if (this.accountServiceUrlIndex == this.accountServiceInstances.length) {
      this.accountServiceUrlIndex = 0;
    }

    return this.accountGrpcClientProxy.getService(ACCOUNT_SERVICE_NAME);
  }
}
