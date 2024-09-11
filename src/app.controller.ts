import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientGrpcProxy } from '@nestjs/microservices';

import {
  AccountServiceClient,
  RegisterCredentials,
  ACCOUNT_SERVICE_NAME,
  ACCOUNT_SERVICE_PACKAGE_NAME,
} from '@ebank-transaction/generated/proto/account_service';

@Controller('/')
export class AppController {
  private readonly accountService: AccountServiceClient;

  constructor(@Inject(ACCOUNT_SERVICE_PACKAGE_NAME) client: ClientGrpcProxy) {
    this.accountService = client.getService(ACCOUNT_SERVICE_NAME);
  }

  @Post()
  test(@Body() data: RegisterCredentials) {
    return this.accountService.register(data);
  }
}
