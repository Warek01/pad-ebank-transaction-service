import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { sleep } from '@/utils/sleep';
import { TimeoutInterceptor } from '@/interceptors/timeout.interceptor';

@Controller()
@ApiTags('Test')
export class AppController {
  @Get()
  test() {
    return '123';
  }

  @Get('rate-limit')
  throttleTest() {
    return '123';
  }

  @Get('request-timeout')
  @UseInterceptors(new TimeoutInterceptor(2000))
  async requestTimeout() {
    return await sleep(60_000);
  }
}
