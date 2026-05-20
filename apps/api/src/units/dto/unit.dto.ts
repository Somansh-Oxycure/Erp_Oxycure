import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ example: 'BIPOLAR' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Needlepoint bipolar ionization technology…' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class UpdateUnitDto {
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
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
