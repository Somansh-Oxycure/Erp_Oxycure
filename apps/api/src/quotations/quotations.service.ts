import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';

export class QuotationItemDto {
  @ApiProperty() @IsString() productName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiProperty() @IsNumber() unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() discountPercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() taxPercent?: number;
}

export class CreateQuotationDto {
  @ApiProperty() @IsString() customerId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ticketId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() termsAndConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}

@Injectable()
export class QuotationsService {
  constructor(private prisma: PrismaService) {}

  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.quotation.count({
      where: { quotationNumber: { startsWith: `QT-${year}-` } },
    });
    return `QT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private calculateItemTotal(item: QuotationItemDto) {
    const base = item.quantity * item.unitPrice;
    const discountAmt = base * ((item.discountPercent || 0) / 100);
    const afterDiscount = base - discountAmt;
    const taxAmt = afterDiscount * ((item.taxPercent ?? 18) / 100);
    return afterDiscount + taxAmt;
  }

  async findAll(customerId?: string, status?: QuotationStatus, page = 1, limit = 20) {
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [quotations, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return { success: true, data: quotations, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const q = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        ticket: { select: { id: true, ticketNumber: true } },
      },
    });
    if (!q) throw new NotFoundException(`Quotation ${id} not found`);
    return q;
  }

  async create(dto: CreateQuotationDto, createdById: string) {
    const quotationNumber = await this.generateQuotationNumber();

    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    const itemsData = dto.items.map((item, index) => {
      const base = item.quantity * item.unitPrice;
      const discAmt = base * ((item.discountPercent || 0) / 100);
      const afterDiscount = base - discAmt;
      const taxAmt = afterDiscount * ((item.taxPercent ?? 18) / 100);
      const total = afterDiscount + taxAmt;

      subtotal += base;
      taxAmount += taxAmt;
      discountAmount += discAmt;

      return {
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent ?? 18,
        totalPrice: total,
        sortOrder: index,
      };
    });

    return this.prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: dto.customerId,
        ticketId: dto.ticketId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount: subtotal - discountAmount + taxAmount,
        termsAndConditions: dto.termsAndConditions,
        notes: dto.notes,
        createdById,
        items: { create: itemsData },
      },
      include: { items: true, customer: true },
    });
  }

  async updateStatus(id: string, status: QuotationStatus) {
    await this.findOne(id);
    return this.prisma.quotation.update({ where: { id }, data: { status } });
  }
}
