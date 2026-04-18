import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType, DesignSpecStatus } from '@prisma/client';

export class CreateDesignSpecDto {
  @ApiProperty()
  @IsUUID()
  leadId: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  productType: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  siteAreaSqft?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteEnvironment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  powerAvailability?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequirements?: string;
}

export class UpdateDesignSpecDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  siteAreaSqft?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteEnvironment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  powerAvailability?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  // Site Inspection
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  siteInspectionDone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  siteInspectionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteInspectionNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sitePhotosUrl?: string;

  // Design Output (filled by design engineer)
  @ApiPropertyOptional({ description: 'Array of recommended product objects' })
  @IsOptional()
  @IsArray()
  recommendedProducts?: object[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  configurationNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technicalSpecs?: string;

  @ApiPropertyOptional({ description: 'Bill of materials array' })
  @IsOptional()
  @IsArray()
  bomItems?: object[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedCost?: number;
}

export class UpdateDesignSpecStatusDto {
  @ApiProperty({ enum: DesignSpecStatus })
  @IsEnum(DesignSpecStatus)
  status: DesignSpecStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  revisionNotes?: string;
}

export class CreateQuotationFromSpecDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}

export class DesignSpecFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DesignSpecStatus)
  status?: DesignSpecStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
