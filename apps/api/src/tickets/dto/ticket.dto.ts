import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  Matches,
  IsEmail,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketSource, TicketStatus, Priority, ProductType, NoteType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @ApiProperty({ example: 'Reliance Industries' })
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @ApiProperty({ example: 'Amit Sharma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consultantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consultantLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  architectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  architectLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approveMake?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementNotes?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: TicketSource })
  @IsOptional()
  @IsEnum(TicketSource)
  source?: TicketSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  siteInspectionNeeded?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consultantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consultantLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  architectName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  architectLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approveMake?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirementNotes?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lostReason?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: TicketSource })
  @IsOptional()
  @IsEnum(TicketSource)
  source?: TicketSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  siteInspectionNeeded?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class AssignTicketDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assignedToId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ProposalLineItemDto {
  @ApiProperty({ example: 'Air Purifier AP-500' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;
}

export class ConvertTicketDto {
  @ApiPropertyOptional({ description: 'Optional initial note to attach to the new proposal' })
  @IsOptional()
  @IsString()
  initialNote?: string;
}

export class CreateTicketNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: NoteType })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;
}

export class TicketFilterDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
  @ApiPropertyOptional({ enum: ProductType }) @IsOptional() @IsEnum(ProductType) productType?: ProductType;
  @ApiPropertyOptional({ enum: TicketSource }) @IsOptional() @IsEnum(TicketSource) source?: TicketSource;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortOrder?: string;
}
