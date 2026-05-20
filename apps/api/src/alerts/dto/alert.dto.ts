import {
  IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAlertRuleDto {
  @ApiProperty({ example: 'Low stock on VRF Units' })
  @IsString()
  ruleName: string;

  @ApiProperty({ enum: ['low_stock', 'reorder', 'expiry', 'overstock'] })
  @IsEnum(['low_stock', 'reorder', 'expiry', 'overstock'])
  ruleType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdValue?: number;

  @ApiPropertyOptional({ default: ['in_app'] })
  @IsOptional()
  @IsArray()
  notifyChannels?: string[];

  @ApiPropertyOptional({ default: [] })
  @IsOptional()
  @IsArray()
  notifyUserIds?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoCreatePo?: boolean;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  escalateAfterHrs?: number;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  notifyChannels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCreatePo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  escalateAfterHrs?: number;
}
