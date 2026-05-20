import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'HVAC Equipment' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'hvac-equipment' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Parent category UUID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 'All HVAC systems' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateProductCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
