import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, ReceiveGoodsDto } from './dto/purchase-order.dto';
import { handlePrismaError } from '../common/utils/prisma-error.util';
import { Prisma } from '@prisma/client';

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${String(year).slice(2)}${String(year + 1).slice(2)}`;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
  ) {}

  // ─── Generate PO number ────────────────────────────────────────────────────
  private async generatePoNumber(): Promise<string> {
    const fy = getCurrentFY();
    const key = `PO-${fy}`;
    const counter = await this.prisma.$transaction(async (tx) => {
      const rc = await tx.referenceCounter.upsert({
        where: { id: key },
        update: { lastSeq: { increment: 1 } },
        create: { id: key, lastSeq: 1 },
      });
      return rc.lastSeq;
    });
    return `PO-${fy}-${String(counter).padStart(4, '0')}`;
  }

  // ─── Find all POs ──────────────────────────────────────────────────────────
  async findAll(status?: string, search?: string) {
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (status) where.status = status as any;
    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const data = await this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  // ─── Find single PO ────────────────────────────────────────────────────────
  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            product: {
              select: {
                id: true, productCode: true, name: true, unitOfMeasure: true,
                stockLevel: { select: { qtyOnHand: true } },
              },
            },
          },
        },
      },
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    return { success: true, data: po };
  }

  // ─── Create PO ─────────────────────────────────────────────────────────────
  async create(dto: CreatePurchaseOrderDto, userId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException(`Supplier ${dto.supplierId} not found`);

    const poNumber = await this.generatePoNumber();

    try {
      const po = await this.prisma.$transaction(async (tx) => {
        let totalAmount = new Prisma.Decimal(0);
        const itemsData = dto.items.map((item) => {
          const qty = new Prisma.Decimal(item.qtyOrdered);
          const price = item.unitPrice !== undefined ? new Prisma.Decimal(item.unitPrice) : new Prisma.Decimal(0);
          const total = qty.mul(price);
          totalAmount = totalAmount.add(total);
          return {
            productId: item.productId,
            qtyOrdered: qty,
            unitPrice: item.unitPrice !== undefined ? price : null,
            totalPrice: total,
            notes: item.notes ?? null,
          };
        });

        const created = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: dto.supplierId,
            status: 'draft',
            expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
            notes: dto.notes ?? null,
            totalAmount,
            createdById: userId,
            items: { create: itemsData },
          },
          include: {
            supplier: { select: { id: true, name: true } },
            items: true,
          },
        });

        // Update qtyOnOrder for each product
        for (const item of dto.items) {
          await tx.stockLevel.upsert({
            where: { productId: item.productId },
            update: { qtyOnOrder: { increment: item.qtyOrdered } },
            create: { productId: item.productId, qtyOnOrder: new Prisma.Decimal(item.qtyOrdered) },
          });
        }

        return created;
      });

      return { success: true, data: po };
    } catch (e) {
      handlePrismaError(e);
    }
  }

  // ─── Update PO (status/notes) ──────────────────────────────────────────────
  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    if (po.status === 'received' || po.status === 'cancelled') {
      throw new BadRequestException(`Cannot update a ${po.status} purchase order`);
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status as any }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.expectedDate !== undefined && { expectedDate: new Date(dto.expectedDate) }),
      },
    });
    return { success: true, data: updated };
  }

  // ─── Mark PO as sent ───────────────────────────────────────────────────────
  async markSent(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    if (po.status !== 'draft') {
      throw new BadRequestException('Only draft POs can be marked as sent');
    }
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'sent' },
    });
    return { success: true, data: updated };
  }

  // ─── Cancel PO ─────────────────────────────────────────────────────────────
  async cancel(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    if (po.status === 'received' || po.status === 'cancelled') {
      throw new BadRequestException(`Cannot cancel a ${po.status} purchase order`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Release the onOrder qty
      for (const item of po.items) {
        const remaining = Number(item.qtyOrdered) - Number(item.qtyReceived);
        if (remaining > 0) {
          await tx.stockLevel.updateMany({
            where: { productId: item.productId },
            data: { qtyOnOrder: { decrement: remaining } },
          });
        }
      }
      await tx.purchaseOrder.update({ where: { id }, data: { status: 'cancelled' } });
    });

    return { success: true, message: 'Purchase order cancelled' };
  }

  // ─── Receive goods ─────────────────────────────────────────────────────────
  async receiveGoods(id: string, dto: ReceiveGoodsDto, userId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    if (po.status === 'cancelled') {
      throw new BadRequestException('Cannot receive goods for a cancelled PO');
    }
    if (po.status === 'received') {
      throw new BadRequestException('All goods already received');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const recv of dto.items) {
        const poItem = po.items.find((i) => i.id === recv.itemId);
        if (!poItem) continue;

        const alreadyReceived = Number(poItem.qtyReceived);
        const stillPending = Number(poItem.qtyOrdered) - alreadyReceived;
        const toReceive = Math.min(recv.qtyReceived, stillPending);
        if (toReceive <= 0) continue;

        const newReceived = alreadyReceived + toReceive;
        const unitPrice = recv.unitPrice ?? (poItem.unitPrice ? Number(poItem.unitPrice) : null);

        await tx.purchaseOrderItem.update({
          where: { id: recv.itemId },
          data: {
            qtyReceived: new Prisma.Decimal(newReceived),
            ...(unitPrice !== null && { unitPrice: new Prisma.Decimal(unitPrice) }),
            totalPrice: new Prisma.Decimal(Number(poItem.qtyOrdered) * (unitPrice ?? 0)),
          },
        });

        // GRN stock entry
        await this.stockService.applyGrn(
          tx as unknown as PrismaService,
          poItem.productId,
          toReceive,
          unitPrice,
          id,
          userId,
        );
      }

      // Recalculate total and determine new status
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { poId: id } });
      const newTotal = updatedItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
      const allReceived = updatedItems.every(
        (i) => Number(i.qtyReceived) >= Number(i.qtyOrdered),
      );
      const anyReceived = updatedItems.some((i) => Number(i.qtyReceived) > 0);
      const newStatus = allReceived
        ? 'received'
        : anyReceived
        ? 'partially_received'
        : po.status;

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus as any, totalAmount: new Prisma.Decimal(newTotal) },
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, productCode: true, name: true } } } },
        },
      });

      return { success: true, data: updated };
    });
  }
}
