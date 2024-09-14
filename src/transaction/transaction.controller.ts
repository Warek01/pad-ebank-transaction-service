import { Controller, Inject } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
  TransactionType as ProtoTransactionType,
  TransferData,
  TransferResult,
  WithdrawData,
  WithdrawResult,
} from '@/generated/proto/transacton_service';
import {
  ACCOUNT_SERVICE_NAME,
  ACCOUNT_SERVICE_PACKAGE_NAME,
  AccountServiceClient,
} from '@/generated/proto/account_service';
import { Transaction } from '@/entities/transaction.entity';
import { TransactionType } from '@/transaction/transaction.enums';
import {
  Currency as ProtoCurrency,
  ServiceError,
  ServiceErrorCode,
} from '@/generated/proto/shared';
import { Currency } from '@/enums/currency';

@Controller('transaction')
@TransactionServiceControllerMethods()
export class TransactionController implements TransactionServiceController {
  private readonly accountService: AccountServiceClient;

  constructor(
    @Inject(ACCOUNT_SERVICE_PACKAGE_NAME)
    accountGrpcClientProxy: ClientGrpcProxy,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {
    this.accountService =
      accountGrpcClientProxy.getService<AccountServiceClient>(
        ACCOUNT_SERVICE_NAME,
      );
  }

  async cancelTransaction(
    request: CancelTransactionOptions,
    metadata?: Metadata,
  ): Promise<CancelTransactionResult> {
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
      case TransactionType.Deposit: {
        const result = await firstValueFrom(
          this.accountService.addCurrency({
            currency: this.currencyToProtoCurrency(transaction.currency),
            amount: -transaction.amount,
            cardCode: transaction.dstCardCode,
          }),
        );
        error = result.error;
        break;
      }
      case TransactionType.Withdraw: {
        const result = await firstValueFrom(
          this.accountService.addCurrency({
            currency: this.currencyToProtoCurrency(transaction.currency),
            amount: transaction.amount,
            cardCode: transaction.dstCardCode,
          }),
        );
        error = result.error;
        break;
      }
      case TransactionType.Transfer: {
        const result1 = await firstValueFrom(
          this.accountService.addCurrency({
            currency: this.currencyToProtoCurrency(transaction.currency),
            amount: -transaction.amount,
            cardCode: transaction.srcCardCode,
          }),
        );

        error = result1.error;

        if (error) {
          break;
        }

        const result2 = await firstValueFrom(
          this.accountService.addCurrency({
            currency: this.currencyToProtoCurrency(transaction.currency),
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
    const addCurrencyResult = await firstValueFrom(
      this.accountService.addCurrency({
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
    transaction.type = TransactionType.Deposit;
    transaction.currency = this.protoCurrencyToCurrency(request.currency);
    transaction.amount = request.amount;
    transaction.timestamp = new Date();

    await this.transactionRepo.save(transaction);

    return {};
  }

  async getHistory(
    request: GetHistoryOptions,
    metadata?: Metadata,
  ): Promise<TransactionsHistory> {
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
          type: this.transactionTypeToProtoTransactionType(t.type),
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
    const addCurrencyResult1 = await firstValueFrom(
      this.accountService.addCurrency({
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
      this.accountService.addCurrency({
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
    transaction.type = TransactionType.Transfer;
    transaction.currency = this.protoCurrencyToCurrency(request.currency);
    transaction.amount = request.amount;
    transaction.timestamp = new Date();

    await this.transactionRepo.save(transaction);

    return {};
  }

  async withdrawCurrency(
    request: WithdrawData,
    metadata?: Metadata,
  ): Promise<WithdrawResult> {
    const addCurrencyResult = await firstValueFrom(
      this.accountService.addCurrency({
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
    transaction.type = TransactionType.Withdraw;
    transaction.currency = this.protoCurrencyToCurrency(request.currency);
    transaction.amount = request.amount;
    transaction.timestamp = new Date();

    await this.transactionRepo.save(transaction);

    return {};
  }

  private protoCurrencyToCurrency(currency: ProtoCurrency): Currency {
    switch (currency) {
      case ProtoCurrency.EUR:
        return Currency.Eur;
      case ProtoCurrency.MDL:
        return Currency.Mdl;
      case ProtoCurrency.USD:
        return Currency.Usd;
      default:
        throw new Error('unknown currency');
    }
  }

  private currencyToProtoCurrency(currency: Currency): ProtoCurrency {
    switch (currency) {
      case Currency.Eur:
        return ProtoCurrency.EUR;
      case Currency.Mdl:
        return ProtoCurrency.MDL;
      case Currency.Usd:
        return ProtoCurrency.USD;
    }
  }

  private transactionTypeToProtoTransactionType(
    type: TransactionType,
  ): ProtoTransactionType {
    switch (type) {
      case TransactionType.Deposit:
        return ProtoTransactionType.DEPOSIT;
      case TransactionType.Withdraw:
        return ProtoTransactionType.WITHDRAW;
      case TransactionType.Transfer:
        return ProtoTransactionType.TRANSFER;
    }
  }

  private protoTransactionTypeToTransactionType(
    type: ProtoTransactionType,
  ): TransactionType {
    switch (type) {
      case ProtoTransactionType.DEPOSIT:
        return TransactionType.Deposit;
      case ProtoTransactionType.WITHDRAW:
        return TransactionType.Withdraw;
      case ProtoTransactionType.TRANSFER:
        return TransactionType.Transfer;
    }
  }
}
