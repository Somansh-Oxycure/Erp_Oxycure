import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, page = 1, limit = 20 } = params;

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { customerNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          _count: { select: { orders: true } },
          lead: { select: { id: true, leadNumber: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      success: true,
      data: customers,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, leadNumber: true, status: true } },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { orders: true, quotations: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async update(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      companyName: string;
      city: string;
      state: string;
      pincode: string;
      gstNumber: string;
    }>,
  ) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async getOrders(customerId: string) {
    await this.findOne(customerId);
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getTimeline(customerId: string) {
    await this.findOne(customerId);

    const [orders, quotations, auditLogs] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quotation.findMany({
        where: { customerId },
        select: { id: true, quotationNumber: true, status: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { entityId: customerId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    const timeline = [
      ...orders.map((o) => ({ type: 'order', ...o })),
      ...quotations.map((q) => ({ type: 'quotation', ...q })),
      ...auditLogs.map((l) => ({ type: 'audit', ...l })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return timeline;
  }
}
