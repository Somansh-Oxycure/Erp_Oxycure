import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto, SetOpeningStockDto, StockQueryDto } from './dto/stock.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  // ─── Overview: all products with stock levels ─────────────────────────────
  async findAll(query: StockQueryDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '30', 10)));
    const skip = (page - 1) * limit;

    const productWhere: Prisma.ProductWhereInput = { status: 'active' };
    if (query.search) {
      const s = query.search.trim();
      productWhere.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { productCode: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) productWhere.categoryId = query.categoryId;

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where: productWhere }),
      this.prisma.product.findMany({
        where: productWhere,
        include: {
          category: { select: { id: true, name: true } },
          stockLevel: true,
          specifications: { orderBy: { sortOrder: 'asc' } },
          alertLogs: { where: { status: 'open' }, select: { id: true }, take: 1 },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    // Attach computed fields and filter by alertStatus
    let rows = products.map((p) => {
      const sl = p.stockLevel;
      const onHand = Number(sl?.qtyOnHand ?? 0);
      const onOrder = Number(sl?.qtyOnOrder ?? 0);
      let alertStatus: 'ok' | 'low' | 'out' | 'on_order';
      if (onHand <= 0) alertStatus = 'out';
      else if (p.alertLogs.length > 0) alertStatus = 'low';
      else if (onOrder > 0) alertStatus = 'on_order';
      else alertStatus = 'ok';

      const { alertLogs: _al, ...rest } = p;
      return { ...rest, onHand, onOrder, alertStatus };
    });

    if (query.alertStatus) {
      rows = rows.filter((r) => r.alertStatus === query.alertStatus);
    }

    return {
      success: true,
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Stock stats (dashboard counts) ─────────────────────────────────────
  async getStats() {
    const products = await this.prisma.product.findMany({
      where: { status: 'active' },
      include: { stockLevel: true },
    });

    let ok = 0, out = 0;
    for (const p of products) {
      const onHand = Number(p.stockLevel?.qtyOnHand ?? 0);
      if (onHand <= 0) out++;
      else ok++;
    }
    return { success: true, data: { total: products.length, ok, out } };
  }

  // ─── Single product stock detail ─────────────────────────────────────────
  async findOne(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { id: true, name: true } },
        stockLevel: true,
        productSuppliers: {
          where: { isPreferred: true },
          include: { supplier: { select: { id: true, name: true, leadTimeDays: true } } },
          take: 1,
        },
      },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const sl = product.stockLevel;
    const onHand = Number(sl?.qtyOnHand ?? 0);
    const onOrder = Number(sl?.qtyOnOrder ?? 0);

    return { success: true, data: { ...product, onHand, onOrder } };
  }

  // ─── Transaction history ─────────────────────────────────────────────────
  async getTransactions(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const txns = await this.prisma.stockTransaction.findMany({
      where: { productId },
      include: { performedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { txnAt: 'desc' },
      take: 100,
    });
    return { success: true, data: txns };
  }

  // ─── Set opening stock ───────────────────────────────────────────────────
  async setOpening(productId: string, dto: SetOpeningStockDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    return this.prisma.$transaction(async (tx) => {
      await tx.stockLevel.upsert({
        where: { productId },
        update: {
          qtyOnHand: new Prisma.Decimal(dto.qty),
          avgCost: dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : undefined,
          lastUpdatedAt: new Date(),
        },
        create: {
          productId,
          qtyOnHand: new Prisma.Decimal(dto.qty),
          avgCost: dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : null,
        },
      });

      await tx.stockTransaction.create({
        data: {
          productId,
          txnType: 'opening',
          qty: new Prisma.Decimal(dto.qty),
          direction: '+',
          unitCost: dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : null,
          notes: 'Opening stock entry',
          performedById: userId,
        },
      });

      await this._evaluateAlerts(tx as unknown as PrismaService, productId);

      const sl = await tx.stockLevel.findUnique({ where: { productId } });
      return { success: true, data: sl };
    });
  }

  // ─── Manual adjustment ───────────────────────────────────────────────────
  async adjust(productId: string, dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Ensure stock level row exists
      let sl = await tx.stockLevel.findUnique({ where: { productId } });
      if (!sl) {
        sl = await tx.stockLevel.create({ data: { productId } });
      }

      const currentQty = Number(sl.qtyOnHand);
      const adjQty = dto.qty;

      if (dto.type === 'remove' && adjQty > currentQty) {
        throw new BadRequestException(
          `Cannot remove ${adjQty} units — only ${currentQty} on hand`,
        );
      }

      const newQty = dto.type === 'add' ? currentQty + adjQty : currentQty - adjQty;
      const txnType = dto.type === 'add' ? 'adjustment_in' : 'adjustment_out';
      const direction = dto.type === 'add' ? '+' : '-';

      // Update weighted average cost if adding stock with unit cost
      let newAvgCost = sl.avgCost ? Number(sl.avgCost) : null;
      if (dto.type === 'add' && dto.unitCost !== undefined) {
        const oldCost = newAvgCost ?? dto.unitCost;
        newAvgCost = (currentQty * oldCost + adjQty * dto.unitCost) / newQty;
      }

      await tx.stockLevel.update({
        where: { productId },
        data: {
          qtyOnHand: new Prisma.Decimal(newQty),
          avgCost: newAvgCost !== null ? new Prisma.Decimal(newAvgCost) : undefined,
          lastUpdatedAt: new Date(),
        },
      });

      await tx.stockTransaction.create({
        data: {
          productId,
          txnType,
          qty: new Prisma.Decimal(adjQty),
          direction,
          unitCost: dto.unitCost !== undefined ? new Prisma.Decimal(dto.unitCost) : null,
          notes: dto.notes ?? null,
          performedById: userId,
        },
      });

      await this._evaluateAlerts(tx as unknown as PrismaService, productId);

      const updated = await tx.stockLevel.findUnique({ where: { productId } });
      return { success: true, data: updated };
    });
  }

  // ─── GRN — called internally by purchase-orders service ──────────────────
  async applyGrn(
    tx: PrismaService,
    productId: string,
    qtyReceived: number,
    unitCost: number | null,
    poId: string,
    userId: string,
  ) {
    let sl = await tx.stockLevel.findUnique({ where: { productId } });
    if (!sl) sl = await tx.stockLevel.create({ data: { productId } });

    const currentQty = Number(sl.qtyOnHand);
    const currentOrder = Math.max(0, Number(sl.qtyOnOrder) - qtyReceived);
    const newQty = currentQty + qtyReceived;

    let newAvgCost = sl.avgCost ? Number(sl.avgCost) : null;
    if (unitCost !== null && unitCost > 0) {
      const oldCost = newAvgCost ?? unitCost;
      newAvgCost = (currentQty * oldCost + qtyReceived * unitCost) / newQty;
    }

    await tx.stockLevel.update({
      where: { productId },
      data: {
        qtyOnHand: new Prisma.Decimal(newQty),
        qtyOnOrder: new Prisma.Decimal(currentOrder),
        avgCost: newAvgCost !== null ? new Prisma.Decimal(newAvgCost) : undefined,
        lastUpdatedAt: new Date(),
      },
    });

    await tx.stockTransaction.create({
      data: {
        productId,
        txnType: 'grn',
        qty: new Prisma.Decimal(qtyReceived),
        direction: '+',
        unitCost: unitCost !== null ? new Prisma.Decimal(unitCost) : null,
        referenceId: poId,
        notes: `Goods received — PO`,
        performedById: userId,
      },
    });

    await this._evaluateAlerts(tx as unknown as PrismaService, productId);
  }

  // ─── Internal alert evaluation ───────────────────────────────────────────
  async _evaluateAlerts(tx: PrismaService, productId: string) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      include: { stockLevel: true },
    });
    if (!product) return;

    const onHand = Number(product.stockLevel?.qtyOnHand ?? 0);

    const orClauses: Prisma.AlertRuleWhereInput[] = [
      { productId: productId },
      { productId: null, categoryId: null },
    ];
    if (product.categoryId) {
      orClauses.push({ categoryId: product.categoryId });
    }

    const rules = await tx.alertRule.findMany({
      where: { isActive: true, ruleType: 'low_stock', OR: orClauses },
    });

    for (const rule of rules) {
      const threshold = rule.thresholdValue !== null ? Number(rule.thresholdValue) : 0;
      if (threshold <= 0) continue;

      if (onHand <= threshold) {
        // Create alert if none is already open for this rule/product
        const existingOpen = await tx.alertLog.findFirst({
          where: { ruleId: rule.id, productId, status: 'open' },
        });
        if (!existingOpen) {
          await tx.alertLog.create({
            data: {
              ruleId: rule.id,
              productId,
              alertMessage: `${product.name} (${product.productCode}) is low. On Hand: ${onHand}, Minimum: ${threshold}`,
              status: 'open',
            },
          });
        }
      } else {
        // Stock is back above threshold — auto-resolve any open alert
        await tx.alertLog.updateMany({
          where: { ruleId: rule.id, productId, status: { in: ['open', 'acknowledged'] } },
          data: { status: 'resolved', resolvedAt: new Date() },
        });
      }
    }
  }

  // ─── Public trigger for alert evaluation (used by cron or manual) ─────────
  async evaluateProductAlerts(productId: string) {
    await this._evaluateAlerts(this.prisma as unknown as PrismaService, productId);
    return { success: true, message: 'Alert evaluation complete' };
  }

  // ─── CSV helpers ──────────────────────────────────────────────────────────
  private escapeCsvValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current); current = ''; }
        else { current += ch; }
      }
    }
    result.push(current);
    return result;
  }

  // ─── Export stock as CSV ──────────────────────────────────────────────────
  async exportCsv(): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { status: 'active' },
      include: {
        stockLevel: true,
      },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'productCode', 'productName', 'category', 'unitOfMeasure',
      'qtyOnHand', 'qtyOnOrder', 'avgCost',
    ];
    const rows: string[] = [headers.join(',')];

    for (const p of products) {
      const sl = p.stockLevel;
      rows.push([
        this.escapeCsvValue(p.productCode),
        this.escapeCsvValue(p.name),
        this.escapeCsvValue(p.categoryName ?? ''),
        this.escapeCsvValue(p.unitOfMeasure),
        this.escapeCsvValue(Number(sl?.qtyOnHand ?? 0)),
        this.escapeCsvValue(Number(sl?.qtyOnOrder ?? 0)),
        this.escapeCsvValue(sl?.avgCost !== null && sl?.avgCost !== undefined ? Number(sl.avgCost) : ''),
      ].join(','));
    }

    return rows.join('\r\n');
  }

  // ─── Import stock from CSV ────────────────────────────────────────────────
  async importCsv(buffer: Buffer, userId: string): Promise<{
    success: boolean;
    data: { updated: number; skipped: number; errors: string[] };
  }> {
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return { success: true, data: { updated: 0, skipped: 0, errors: ['No data rows found in file'] } };
    }

    const headers = this.parseCsvLine(lines[0]);
    const idx = (name: string) => headers.indexOf(name);

    const colIdx = {
      productCode: idx('productCode'),
      qtyOnHand:   idx('qtyOnHand'),
      avgCost:     idx('avgCost'),
    };

    if (colIdx.productCode === -1) {
      return { success: false, data: { updated: 0, skipped: 0, errors: ['Missing required column: productCode'] } };
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const productCode = values[colIdx.productCode]?.trim();
      if (!productCode) { errors.push(`Row ${i + 1}: productCode is required`); continue; }

      const product = await this.prisma.product.findUnique({ where: { productCode } });
      if (!product) { skipped++; errors.push(`Row ${i + 1}: Product "${productCode}" not found — skipped`); continue; }

      // Parse numeric values
      const parseNum = (col: number): number | undefined => {
        if (col < 0 || !values[col]?.trim()) return undefined;
        const n = parseFloat(values[col].trim());
        return isNaN(n) ? undefined : n;
      };

      const qtyOnHand   = parseNum(colIdx.qtyOnHand);
      const avgCost     = parseNum(colIdx.avgCost);

      try {
        await this.prisma.$transaction(async (tx) => {
          // Upsert stock level
          if (qtyOnHand !== undefined) {
            const current = await tx.stockLevel.findUnique({ where: { productId: product.id } });
            const oldQty = Number(current?.qtyOnHand ?? 0);

            await tx.stockLevel.upsert({
              where: { productId: product.id },
              update: {
                qtyOnHand: new Prisma.Decimal(qtyOnHand),
                ...(avgCost !== undefined && { avgCost: new Prisma.Decimal(avgCost) }),
                lastUpdatedAt: new Date(),
              },
              create: {
                productId: product.id,
                qtyOnHand: new Prisma.Decimal(qtyOnHand),
                ...(avgCost !== undefined && { avgCost: new Prisma.Decimal(avgCost) }),
              },
            });

            // Record as an adjustment transaction for traceability
            const diff = qtyOnHand - oldQty;
            if (diff !== 0) {
              await tx.stockTransaction.create({
                data: {
                  productId: product.id,
                  txnType: diff > 0 ? 'adjustment_in' : 'adjustment_out',
                  qty: new Prisma.Decimal(Math.abs(diff)),
                  direction: diff > 0 ? '+' : '-',
                  unitCost: avgCost !== undefined ? new Prisma.Decimal(avgCost) : null,
                  notes: 'Bulk CSV import',
                  performedById: userId,
                },
              });
            }
          }

          await this._evaluateAlerts(tx as unknown as PrismaService, product.id);
        });
        updated++;
      } catch (err: unknown) {
        const e = err as { message?: string };
        errors.push(`Row ${i + 1} (${productCode}): ${e.message ?? 'Unknown error'}`);
      }
    }

    return { success: true, data: { updated, skipped, errors } };
  }
}
