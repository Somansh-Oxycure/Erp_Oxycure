import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BoQStatus } from '@prisma/client';

export class UpdateBoQStatusDto {
  @ApiProperty({ enum: BoQStatus })
  @IsEnum(BoQStatus)
  status: BoQStatus;
}
