import {
  IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsNumber, IsPositive, IsDateString, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePOItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  qtyOrdered: number;

  @ApiPropertyOptional({ example: 3200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  supplierId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePOItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePOItemDto)
  items: CreatePOItemDto[];
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: ['draft', 'sent', 'partially_received', 'received', 'cancelled'] })
  @IsOptional()
  @IsEnum(['draft', 'sent', 'partially_received', 'received', 'cancelled'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDate?: string;
}

export class ReceiveItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  qtyReceived: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class ReceiveGoodsDto {
  @ApiProperty({ type: [ReceiveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
