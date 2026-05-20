import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsInt,
  IsNotEmpty,
  IsObject,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Custom Column ────────────────────────────────────────────────────────────
export class CustomColumnDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsString()
  label: string;
}

// ─── Product Charges ─────────────────────────────────────────────────────────────────────────────
export class BoQProductChargesDto {
  @ApiPropertyOptional({ enum: ['combined', 'itemized'] })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  combined?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  installation?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  freight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  labor?: number;
}

// ─── Item ─────────────────────────────────────────────────────────────────────
export class CreateBoQItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateComponentId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitRate: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isIncluded?: boolean;

}

export class CreateBoQProductDto {
  @ApiPropertyOptional({ description: 'Source template (for reference only)' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({ description: 'Product / system name displayed in the BoQ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [CreateBoQItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBoQItemDto)
  items?: CreateBoQItemDto[];

  @ApiPropertyOptional({ description: 'Pricing mode: component (default) or fixed' })
  @IsOptional()
  @IsString()
  priceMode?: string;

  @ApiPropertyOptional({ description: 'Fixed price for the product when priceMode is fixed' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number;

  @ApiPropertyOptional({ description: 'Custom column values keyed by column id' })
  @IsOptional()
  @IsObject()
  customValues?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Additional charges for this product (installation, freight, labor)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BoQProductChargesDto)
  charges?: BoQProductChargesDto;
}

export class CreateBoQDto {
  @ApiProperty({ description: 'ID of the proposal this BoQ belongs to' })
  @IsUUID()
  proposalId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateBoQProductDto], description: 'One or more product groups' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBoQProductDto)
  products: CreateBoQProductDto[];

  @ApiPropertyOptional({ description: 'Custom column definitions for this BoQ' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomColumnDto)
  customColumns?: CustomColumnDto[];
}
