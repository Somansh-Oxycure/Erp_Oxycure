import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, IsInt, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductSpecDto {
  @ApiProperty({ example: 'Capacity (Ton)' })
  @IsString()
  @IsNotEmpty()
  specKey: string;

  @ApiProperty({ example: '1.5' })
  @IsString()
  @IsNotEmpty()
  specValue: string;

  @ApiPropertyOptional({ example: 'Ton' })
  @IsOptional()
  @IsString()
  specUnit?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiPropertyOptional({ example: 'AC-SPLIT-1.5T', description: 'Leave blank to auto-generate from name & brand' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiProperty({ example: 'Daikin 1.5 Ton Inverter Split AC' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Daikin' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Product category UUID (legacy)' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Split AC', description: 'Free-text category name' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({ example: 'Inverter Split AC' })
  @IsOptional()
  @IsString()
  subCategory?: string;

  @ApiPropertyOptional({ enum: ['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll'] })
  @IsOptional()
  @IsEnum(['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll'])
  unitOfMeasure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'Warehouse 1' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ['active', 'discontinued', 'draft'] })
  @IsOptional()
  @IsEnum(['active', 'discontinued', 'draft'])
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [ProductSpecDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specifications?: ProductSpecDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subCategory?: string;

  @ApiPropertyOptional({ enum: ['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll'] })
  @IsOptional()
  @IsEnum(['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll'])
  unitOfMeasure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'Warehouse 1' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ['active', 'discontinued', 'draft'] })
  @IsOptional()
  @IsEnum(['active', 'discontinued', 'draft'])
  status?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Full replace of specs when provided
  @ApiPropertyOptional({ type: [ProductSpecDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specifications?: ProductSpecDto[];
}

export class QueryProductDto {
  @ApiPropertyOptional({ description: 'Search by name, code, or brand' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by free-text category name (exact, case-insensitive)' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ enum: ['active', 'discontinued', 'draft'] })
  @IsOptional()
  @IsEnum(['active', 'discontinued', 'draft'])
  status?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['name_asc', 'name_desc', 'brand_asc', 'category_asc', 'newest', 'oldest', 'updated'],
  })
  @IsOptional()
  @IsEnum(['name_asc', 'name_desc', 'brand_asc', 'category_asc', 'newest', 'oldest', 'updated'])
  sortBy?: string;
}
