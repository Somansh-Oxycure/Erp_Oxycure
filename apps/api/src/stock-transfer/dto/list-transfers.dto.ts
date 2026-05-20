import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListTransfersDto {
  @ApiPropertyOptional({ enum: ['TRANSFER_OUT', 'TRANSFER_IN'] })
  @IsOptional()
  @IsEnum(['TRANSFER_OUT', 'TRANSFER_IN'])
  transferType?: 'TRANSFER_OUT' | 'TRANSFER_IN';

  @ApiPropertyOptional({ enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'CONFIRMED', 'CANCELLED'])
  status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
