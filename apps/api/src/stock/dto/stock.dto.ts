import { IsEnum, IsOptional, IsNumber, IsString, Min, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ enum: ['add', 'remove'], description: 'add = ADJUSTMENT_IN, remove = ADJUSTMENT_OUT' })
  @IsEnum(['add', 'remove'])
  type: 'add' | 'remove';

  @ApiProperty({ example: 5, description: 'Positive quantity to add or remove' })
  @IsNumber()
  @IsPositive()
  qty: number;

  @ApiPropertyOptional({ example: 3200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 'Physical count correction' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetOpeningStockDto {
  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiPropertyOptional({ example: 3200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class StockQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['ok', 'low', 'out', 'on_order'] })
  @IsOptional()
  @IsEnum(['ok', 'low', 'out', 'on_order'])
  alertStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
