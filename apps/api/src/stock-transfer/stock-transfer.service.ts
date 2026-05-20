import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ListTransfersDto } from './dto/list-transfers.dto';

@Injectable()
export class StockTransferService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Auto-generate transfer number ──────────────────────────────────────
  private async generateTransferNumber(
    tx: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    transferType: 'TRANSFER_OUT' | 'TRANSFER_IN',
  ): Promise<string> {
    const prefix = transferType === 'TRANSFER_OUT' ? 'TC-OUT' : 'TC-IN';
    const count = await (tx as PrismaService).stockTransfer.count({ where: { transferType } });
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-${seq}`;
  }

  // ─── Create Transfer (DRAFT) ─────────────────────────────────────────────
  async createTransfer(dto: CreateTransferDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transferNumber = await this.generateTransferNumber(
        tx as unknown as PrismaService,
        dto.transferType,
      );

      // Snapshot stock levels and validate OUT quantities
      const itemsData: Array<{
        productId: string;
        qtyRequested: Prisma.Decimal;
        qtyFulfilled: Prisma.Decimal;
        unitCost: Prisma.Decimal | null;
        notes: string | null;
        qtyOnHandAtTime: Prisma.Decimal;
      }> = [];

      for (const item of dto.items) {
        const sl = await (tx as unknown as PrismaService).stockLevel.findUnique({
          where: { productId: item.productId },
        });
        const qtyOnHand = Number(sl?.qtyOnHand ?? 0);

        if (dto.transferType === 'TRANSFER_OUT') {
          if (item.qtyRequested > qtyOnHand) {
            const product = await (tx as unknown as PrismaService).product.findUnique({
              where: { id: item.productId },
              select: { name: true, productCode: true },
            });
            throw new BadRequestException(
              `Insufficient stock for ${product?.name ?? item.productId}: requested ${item.qtyRequested}, available ${qtyOnHand}`,
            );
          }
        }

        itemsData.push({
          productId: item.productId,
          qtyRequested: new Prisma.Decimal(item.qtyRequested),
          qtyFulfilled: new Prisma.Decimal(0),
          unitCost: item.unitCost !== undefined ? new Prisma.Decimal(item.unitCost) : null,
          notes: item.notes ?? null,
          qtyOnHandAtTime: new Prisma.Decimal(qtyOnHand),
        });
      }

      const transfer = await (tx as unknown as PrismaService).stockTransfer.create({
        data: {
          transferType: dto.transferType,
          status: 'DRAFT',
          transferNumber,
          partyName: dto.partyName,
          partyGSTNumber: dto.partyGSTNumber ?? null,
          partyAddress: dto.partyAddress ?? null,
          billNumber: dto.billNumber ?? null,
          billDate: dto.billDate ? new Date(dto.billDate) : null,
          placeOfSupply: dto.placeOfSupply ?? null,
          poNumber: dto.poNumber ?? null,
          contactNumber: dto.contactNumber ?? null,
          transporterName: dto.transporterName ?? null,
          vehicleNumber: dto.vehicleNumber ?? null,
          eWayBillNumber: dto.eWayBillNumber ?? null,
          shippedToName: dto.shippedToName ?? null,
          shippedToAddress: dto.shippedToAddress ?? null,
          shippedToGST: dto.shippedToGST ?? null,
          transferDate: dto.transferDate ? new Date(dto.transferDate) : new Date(),
          notes: dto.notes ?? null,
          additionalCharges: dto.additionalCharges ? (dto.additionalCharges as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          createdById: userId,
          items: { create: itemsData },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, productCode: true, unitOfMeasure: true } },
            },
          },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return { success: true, data: transfer };
    });
  }

  // ─── Confirm Transfer ────────────────────────────────────────────────────
  async confirmTransfer(transferId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await (tx as unknown as PrismaService).stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });
      if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`);
      if (transfer.status !== 'DRAFT') {
        throw new BadRequestException(
          `Transfer is already ${transfer.status} — only DRAFT transfers can be confirmed`,
        );
      }

      const txDB = tx as unknown as PrismaService;

      for (const item of transfer.items) {
        const sl = await txDB.stockLevel.findUnique({ where: { productId: item.productId } });
        const qtyOnHand = Number(sl?.qtyOnHand ?? 0);
        const qtyRequested = Number(item.qtyRequested);

        if (transfer.transferType === 'TRANSFER_OUT' && qtyRequested > qtyOnHand) {
          const product = await txDB.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          throw new BadRequestException(
            `Insufficient stock for ${product?.name ?? item.productId}: requested ${qtyRequested}, available ${qtyOnHand}`,
          );
        }

        // Apply stock movement
        const isOut = transfer.transferType === 'TRANSFER_OUT';
        const newQty = isOut ? qtyOnHand - qtyRequested : qtyOnHand + qtyRequested;
        const direction = isOut ? '-' : '+';
        const txnType = isOut ? 'adjustment_out' : 'adjustment_in';

        // Update avg cost for inbound transfers with unit cost
        let slRow = sl;
        if (!slRow) {
          slRow = await txDB.stockLevel.create({ data: { productId: item.productId } });
        }
        let newAvgCost = slRow.avgCost ? Number(slRow.avgCost) : null;
        const unitCostVal = item.unitCost ? Number(item.unitCost) : null;
        if (!isOut && unitCostVal !== null) {
          const oldCost = newAvgCost ?? unitCostVal;
          newAvgCost =
            newQty > 0
              ? (qtyOnHand * oldCost + qtyRequested * unitCostVal) / newQty
              : unitCostVal;
        }

        await txDB.stockLevel.update({
          where: { productId: item.productId },
          data: {
            qtyOnHand: new Prisma.Decimal(newQty),
            avgCost: newAvgCost !== null ? new Prisma.Decimal(newAvgCost) : undefined,
            lastUpdatedAt: new Date(),
          },
        });

        await txDB.stockTransaction.create({
          data: {
            productId: item.productId,
            txnType,
            qty: new Prisma.Decimal(qtyRequested),
            direction,
            unitCost: unitCostVal !== null ? new Prisma.Decimal(unitCostVal) : null,
            referenceId: transfer.transferNumber,
            notes: `Transfer: ${transfer.partyName}`,
            performedById: userId,
          },
        });

        // Update qtyFulfilled on item
        await txDB.stockTransferItem.update({
          where: { id: item.id },
          data: { qtyFulfilled: new Prisma.Decimal(qtyRequested) },
        });
      }

      const updated = await txDB.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: 'CONFIRMED',
          confirmedById: userId,
          confirmedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, productCode: true, unitOfMeasure: true } },
            },
          },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          confirmedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      return { success: true, data: updated };
    });
  }

  // ─── Cancel Transfer ─────────────────────────────────────────────────────
  async cancelTransfer(transferId: string, userId: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`);
    if (transfer.status === 'CONFIRMED') {
      throw new ForbiddenException('Confirmed transfers cannot be cancelled');
    }
    if (transfer.status === 'CANCELLED') {
      throw new BadRequestException('Transfer is already cancelled');
    }

    const updated = await this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: 'CANCELLED',
        cancelledById: userId,
        cancelledAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, productCode: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { success: true, data: updated };
  }

  // ─── List Transfers ──────────────────────────────────────────────────────
  async listTransfers(query: ListTransfersDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '30', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.StockTransferWhereInput = {};
    if (query.transferType) where.transferType = query.transferType;
    if (query.status) where.status = query.status;
    if (query.partyName) where.partyName = { contains: query.partyName, mode: 'insensitive' };
    if (query.dateFrom || query.dateTo) {
      where.transferDate = {};
      if (query.dateFrom) where.transferDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.transferDate.lte = new Date(query.dateTo);
    }

    const [total, transfers] = await Promise.all([
      this.prisma.stockTransfer.count({ where }),
      this.prisma.stockTransfer.findMany({
        where,
        orderBy: { transferDate: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { items: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          confirmedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      success: true,
      data: transfers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get Single Transfer ─────────────────────────────────────────────────
  async getTransfer(transferId: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, productCode: true, unitOfMeasure: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        confirmedBy: { select: { id: true, firstName: true, lastName: true } },
        cancelledBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`);
    return { success: true, data: transfer };
  }

  // ─── Transfer Stats ──────────────────────────────────────────────────────
  async getStats() {
    const [total, drafts, confirmed, cancelled, totalOut, totalIn] = await Promise.all([
      this.prisma.stockTransfer.count(),
      this.prisma.stockTransfer.count({ where: { status: 'DRAFT' } }),
      this.prisma.stockTransfer.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.stockTransfer.count({ where: { status: 'CANCELLED' } }),
      this.prisma.stockTransfer.count({ where: { transferType: 'TRANSFER_OUT' } }),
      this.prisma.stockTransfer.count({ where: { transferType: 'TRANSFER_IN' } }),
    ]);
    return { success: true, data: { total, drafts, confirmed, cancelled, totalOut, totalIn } };
  }
}
