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

// ── Generate Proposal DTO ──────────────────────────────────────────────────────

export class GenerateProposalItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

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
  amount: number;
}

export class GenerateProposalDto {
  // Basic Details
  @ApiProperty() @IsString() @IsNotEmpty() client_name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() client_company_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contact_person_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contact_person_phone?: string;
  @ApiProperty() @IsString() @IsNotEmpty() project_name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() project_description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ref_number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() submitted_date?: string;

  // Project Details
  @ApiPropertyOptional() @IsOptional() @IsString() consultant_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() architect_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() project_stage?: string;

  // Items
  @ApiProperty({ type: [GenerateProposalItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerateProposalItemDto)
  items: GenerateProposalItemDto[];

  // Financial Summary
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freight_amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) special_discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) project_discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) total_project_value?: number;

  // Terms & Conditions
  @ApiPropertyOptional() @IsOptional() @IsNumber() gst_percentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() gst_text?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() price_basis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installation_included?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() freight_included?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warranty_period?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() delivery_timeline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() installation_timeline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() freight_terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() third_party_insurance?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() car_policy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() water_electricity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() payment_note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billing_delivery_note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() site_person_details?: string;

  // Commercial Terms
  @ApiPropertyOptional() @IsOptional() @IsString() dlp_period?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() payment_terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dispatch_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() validity_days?: number;

  // Company & Bank Details
  @ApiPropertyOptional() @IsOptional() @IsString() company_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company_gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company_pan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank_ifsc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank_account_number?: string;

  // Sales Person
  @ApiPropertyOptional() @IsOptional() @IsString() salesperson_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesperson_phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesperson_email?: string;
}
