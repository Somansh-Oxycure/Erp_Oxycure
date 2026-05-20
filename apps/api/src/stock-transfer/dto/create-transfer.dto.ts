import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsPositive,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdditionalChargeDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class TransferItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  qtyRequested: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTransferDto {
  @ApiProperty({ enum: ['TRANSFER_OUT', 'TRANSFER_IN'] })
  @IsEnum(['TRANSFER_OUT', 'TRANSFER_IN'])
  transferType: 'TRANSFER_OUT' | 'TRANSFER_IN';

  @ApiProperty()
  @IsString()
  partyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyGSTNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transporterName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eWayBillNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippedToName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippedToAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippedToGST?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transferDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @ApiPropertyOptional({ type: [AdditionalChargeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalChargeDto)
  additionalCharges?: AdditionalChargeDto[];
}
