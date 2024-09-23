import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { sleep } from '@/utils/sleep';

@Controller()
@ApiTags('Test')
export class AppController {
  @Get()
  test() {
    return '123';
  }

  @Get('request-timeout')
  async requestTimeout() {
    return await sleep(10_000);
  }
}
