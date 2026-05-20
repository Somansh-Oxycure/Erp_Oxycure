import {
  IsString, IsOptional, IsEmail, IsEnum, IsInt, IsPositive, IsBoolean, IsNumber, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Blue Star Distributors' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  bankIfscCode?: string;

  @ApiPropertyOptional({ example: 'Bangalore Main Branch' })
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankIfscCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  leadTimeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class LinkProductSupplierDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierSku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  minOrderQty?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}
