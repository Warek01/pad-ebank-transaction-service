import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlingService } from './throttling.service';

describe('ThrottlingService', () => {
  let service: ThrottlingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThrottlingService],
    }).compile();

    service = module.get<ThrottlingService>(ThrottlingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
