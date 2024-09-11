import { Controller } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';

import {
  CancelTransactionOptions,
  CancelTransactionResult,
  DepositData,
  DepositResult,
  GetHistoryOptions,
  TransactionServiceController,
  TransactionServiceControllerMethods,
  TransactionsHistory,
  TransferData,
  TransferResult,
  WithdrawData,
  WithdrawResult,
} from '@ebank-transaction/generated/proto/transacton_service';

@Controller('transaction')
@TransactionServiceControllerMethods()
export class TransactionController implements TransactionServiceController {
  constructor() {}

  async cancelTransaction(
    request: CancelTransactionOptions,
    metadata?: Metadata,
  ): Promise<CancelTransactionResult> {
    return undefined;
  }

  async depositCurrency(
    request: DepositData,
    metadata?: Metadata,
  ): Promise<DepositResult> {
    return undefined;
  }

  async getHistory(
    request: GetHistoryOptions,
    metadata?: Metadata,
  ): Promise<TransactionsHistory> {
    return undefined;
  }

  async transferCurrency(
    request: TransferData,
    metadata?: Metadata,
  ): Promise<TransferResult> {
    return undefined;
  }

  async withdrawCurrency(
    request: WithdrawData,
    metadata?: Metadata,
  ): Promise<WithdrawResult> {
    return undefined;
  }
}
