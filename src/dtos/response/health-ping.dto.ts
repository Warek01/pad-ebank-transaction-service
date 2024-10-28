import { ApiProperty } from '@nestjs/swagger';

export class HealthPingDto {
  @ApiProperty()
  runningTasksCount: number;
}
