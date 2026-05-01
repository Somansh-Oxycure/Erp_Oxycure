import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalStatus, FollowUpStatus } from '@prisma/client';

export class UpdateProposalStatusDto {
  @ApiProperty({ enum: ProposalStatus })
  @IsEnum(ProposalStatus)
  status: ProposalStatus;
}

export class UpdateProposalItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;
}

export class AddProposalItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;
}

export class UpdateProposalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional({ type: [AddProposalItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddProposalItemDto)
  items?: AddProposalItemDto[];
}

export class ProposalFilterDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
  @ApiPropertyOptional({ enum: ProposalStatus }) @IsOptional() @IsEnum(ProposalStatus) status?: ProposalStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() ticketId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

export class CreateProposalFollowUpDto {
  @ApiProperty({ example: '2026-05-10T10:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcome?: string;
}

export class UpdateProposalFollowUpDto {
  @ApiPropertyOptional({ enum: FollowUpStatus })
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcome?: string;
}

export class AddProposalNoteDto {
  @ApiProperty({ description: 'Note content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
