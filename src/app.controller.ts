import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { sleep } from '@/utils/sleep';

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

  @Get('long-running-task')
  @ApiQuery({
    name: 'sleep',
    type: Number,
    required: false,
  })
  @ApiOperation({
    description:
      'A task that takes very long to complete, should return connection timeout',
  })
  @ApiResponse({ status: HttpStatus.REQUEST_TIMEOUT })
  @ApiResponse({ status: HttpStatus.OK })
  async longRunningTask1(
    @Query('sleep', new DefaultValuePipe(60_000), ParseIntPipe) sleepMs: number,
  ) {
    return await sleep(sleepMs);
  }
}
