import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  async getTest() {
    return await new Promise((res) => setTimeout(() => res(null), 10_000));
  }
}
