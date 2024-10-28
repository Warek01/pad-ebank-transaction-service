import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { sleep } from '@/utils/sleep';
import { ConcurrencyInterceptor } from '@/concurrency/concurrency.interceptor';

@Controller()
@ApiTags('Test')
export class AppController {
  @Get()
  test() {
    return 'Hello';
  }

  @Get('rate-limit')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    description:
      'Test rate limit of the service, if called very often should return 429 Too Many Requests',
  })
  @ApiResponse({ type: String, status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS })
  throttleTest() {
    return 'Hello';
  }

  @Get('long-running-task')
  @UseInterceptors(ConcurrencyInterceptor)
  @ApiOperation({
    description:
      'A task that takes very long to complete, should return connection timeout',
  })
  @ApiQuery({
    name: 'sleep',
    description: 'ms',
    type: Number,
    required: false,
  })
  @ApiResponse({ status: HttpStatus.REQUEST_TIMEOUT })
  @ApiResponse({ status: HttpStatus.OK, type: String })
  async longRunningTask1(
    @Query('sleep', new DefaultValuePipe(60_000), ParseIntPipe) sleepMs: number,
  ): Promise<string> {
    await sleep(sleepMs);
    return 'Hello';
  }
}
