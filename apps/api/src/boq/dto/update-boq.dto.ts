import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsUUID,
  IsNotEmpty,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomColumnDto, BoQProductChargesDto } from './create-boq.dto';

export class UpdateBoQItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateComponentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitRate?: number;

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

export class UpdateBoQProductDto {
  @ApiPropertyOptional({ description: 'Source template (for reference)' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [UpdateBoQItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBoQItemDto)
  items?: UpdateBoQItemDto[];

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

export class UpdateBoQDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [UpdateBoQProductDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBoQProductDto)
  products?: UpdateBoQProductDto[];

  @ApiPropertyOptional({ description: 'Custom column definitions for this BoQ' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomColumnDto)
  customColumns?: CustomColumnDto[];
}
