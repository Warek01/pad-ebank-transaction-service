import { Test, TestingModule } from '@nestjs/testing';
import { ConcurrencyService } from './concurrency.service';

describe('ConcurrencyService', () => {
  let service: ConcurrencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConcurrencyService],
    }).compile();

    service = module.get<ConcurrencyService>(ConcurrencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
