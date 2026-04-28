import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty() @IsString() productName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiProperty() @IsNumber() unitPrice: number;
}

export class CreateOrderDto {
  @ApiProperty() @IsString() customerId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ticketId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDeliveryDate?: string;
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count({
      where: { orderNumber: { startsWith: `ORD-${year}-` } },
    });
    return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(params: { customerId?: string; status?: OrderStatus; page?: number; limit?: number }) {
    const { customerId, status, page = 1, limit = 20 } = params;
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
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
      this.prisma.order.count({ where }),
    ]);

    return { success: true, data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: 'asc' } },
        quotation: { select: { id: true, quotationNumber: true } },
        ticket: { select: { id: true, ticketNumber: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(dto: CreateOrderDto, createdById: string) {
    const orderNumber = await this.generateOrderNumber();

    const itemsData = dto.items.map((item, index) => ({
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      sortOrder: index,
    }));

    const totalAmount = itemsData.reduce((sum, i) => sum + Number(i.totalPrice), 0);

    return this.prisma.order.create({
      data: {
        orderNumber,
        customerId: dto.customerId,
        ticketId: dto.ticketId,
        quotationId: dto.quotationId,
        totalAmount,
        notes: dto.notes,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
        createdById,
        items: { create: itemsData },
      },
      include: { items: true, customer: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    await this.findOne(id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { createdById: userId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        items: { select: { id: true, productName: true, quantity: true, totalPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTimeline(id: string) {
    const order = await this.findOne(id);
    const logs = await this.prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    return { order, timeline: logs };
  }
}
