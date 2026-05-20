import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto/product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── List / Search ─────────────────────────────────────────────────────────
  async findAll(query: QueryProductDto) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { productCode: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (query.categoryName) where.categoryName = { equals: query.categoryName, mode: 'insensitive' };
    if (query.brand) where.brand = { equals: query.brand, mode: 'insensitive' };
    if (query.status) where.status = query.status as Prisma.EnumProductStatusFilter['equals'];

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (query.sortBy) {
        case 'name_asc':      return { name: 'asc' };
        case 'name_desc':     return { name: 'desc' };
        case 'brand_asc':     return { brand: 'asc' };
        case 'category_asc':  return { categoryName: 'asc' };
        case 'oldest':        return { createdAt: 'asc' };
        case 'updated':       return { updatedAt: 'desc' };
        default:              return { createdAt: 'desc' }; // newest
      }
    })();

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true, parentId: true } },
          specifications: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get distinct brands ───────────────────────────────────────────────────
  async getBrands() {
    const rows = await this.prisma.product.findMany({
      where: { brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return { success: true, data: rows.map((r) => r.brand).filter(Boolean) };
  }

  // ─── Get distinct categories ───────────────────────────────────────────────
  async getCategories() {
    const rows = await this.prisma.product.findMany({
      where: { categoryName: { not: null } },
      select: { categoryName: true },
      distinct: ['categoryName'],
      orderBy: { categoryName: 'asc' },
    });
    return { success: true, data: rows.map((r) => r.categoryName).filter(Boolean) };
  }

  // ─── Single product ────────────────────────────────────────────────────────
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        specifications: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return { success: true, data: product };
  }

  // ─── Auto-generate product code ─────────────────────────────────────────
  private async generateProductCode(name: string, brand?: string | null): Promise<string> {
    const brandPart = brand
      ? brand.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'PRD'
      : 'PRD';
    const firstAlphaWord = name.split(/\s+/).find((w) => /[A-Za-z]/.test(w)) ?? name;
    const namePart = firstAlphaWord.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'PRD';
    const base = `${brandPart}-${namePart}`;

    const existing = await this.prisma.product.findMany({
      where: { productCode: { startsWith: `${base}-` } },
      select: { productCode: true },
    });
    const exact = await this.prisma.product.findUnique({ where: { productCode: base } });
    if (!exact && existing.length === 0) return `${base}-001`;

    const used = existing
      .map((p) => parseInt(p.productCode.slice(base.length + 1), 10))
      .filter((n) => !isNaN(n));
    let seq = 1;
    while (used.includes(seq)) seq++;
    return `${base}-${String(seq).padStart(3, '0')}`;
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(dto: CreateProductDto) {
    const productCode = dto.productCode?.trim()
      ? dto.productCode.trim().toUpperCase()
      : await this.generateProductCode(dto.name, dto.brand);
    try {
      const product = await this.prisma.product.create({
        data: {
          productCode,
          name: dto.name,
          brand: dto.brand,
          categoryName: dto.categoryName?.trim() || null,
          subCategory: dto.subCategory,
          unitOfMeasure: (dto.unitOfMeasure as Prisma.EnumUnitOfMeasureFilter['equals']) ?? 'pcs',
          description: dto.description,
          imageUrl: dto.imageUrl,
          location: dto.location ?? null,
          status: (dto.status as Prisma.EnumProductStatusFilter['equals']) ?? 'active',
          tags: dto.tags ?? [],
          ...(dto.specifications && dto.specifications.length > 0 && {
            specifications: {
              create: dto.specifications.map((s, i) => ({
                specKey: s.specKey,
                specValue: s.specValue,
                specUnit: s.specUnit,
                sortOrder: s.sortOrder ?? i,
              })),
            },
          }),
        },
        include: {
          category: true,
          specifications: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return { success: true, data: product };
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') throw new ConflictException(`Product code "${dto.productCode}" already exists`);
      throw err;
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    try {
      // If specifications are provided, replace them entirely
      if (dto.specifications !== undefined) {
        await this.prisma.productSpecification.deleteMany({ where: { productId: id } });
        if (dto.specifications.length > 0) {
          await this.prisma.productSpecification.createMany({
            data: dto.specifications.map((s, i) => ({
              productId: id,
              specKey: s.specKey,
              specValue: s.specValue,
              specUnit: s.specUnit ?? null,
              sortOrder: s.sortOrder ?? i,
            })),
          });
        }
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.productCode !== undefined && { productCode: dto.productCode }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.brand !== undefined && { brand: dto.brand }),
          ...(dto.categoryName !== undefined && { categoryName: dto.categoryName?.trim() || null }),
          ...(dto.subCategory !== undefined && { subCategory: dto.subCategory }),
          ...(dto.unitOfMeasure !== undefined && { unitOfMeasure: dto.unitOfMeasure as Prisma.EnumUnitOfMeasureFilter['equals'] }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
          ...(dto.location !== undefined && { location: dto.location ?? null }),
          ...(dto.status !== undefined && { status: dto.status as Prisma.EnumProductStatusFilter['equals'] }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
        },
        include: {
          category: true,
          specifications: { orderBy: { sortOrder: 'asc' } },
        },
      });
      return { success: true, data: product };
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') throw new ConflictException(`Product code "${dto.productCode}" already exists`);
      throw err;
    }
  }

  // ─── Duplicate ─────────────────────────────────────────────────────────────
  async duplicate(id: string) {
    const { data: original } = await this.findOne(id);
    const newCode = `${original.productCode}-COPY`;
    return this.create({
      productCode: newCode,
      name: `${original.name} (Copy)`,
      brand: original.brand ?? undefined,
      categoryName: original.categoryName ?? undefined,
      subCategory: original.subCategory ?? undefined,
      unitOfMeasure: original.unitOfMeasure,
      description: original.description ?? undefined,
      imageUrl: original.imageUrl ?? undefined,
      status: 'draft',
      tags: original.tags,
      specifications: original.specifications.map((s) => ({
        specKey: s.specKey,
        specValue: s.specValue,
        specUnit: s.specUnit ?? undefined,
        sortOrder: s.sortOrder,
      })),
    });
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true, message: 'Product deleted' };
  }

  // ─── CSV helpers ───────────────────────────────────────────────────────────
  private escapeCsvValue(value: string | null | undefined): string {
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

  // ─── Export CSV ────────────────────────────────────────────────────────────
  async exportCsv(): Promise<string> {
    const products = await this.prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        specifications: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'productCode', 'name', 'brand', 'categoryName', 'subCategory',
      'unitOfMeasure', 'description', 'status', 'tags', 'specifications',
    ];
    const rows: string[] = [headers.join(',')];

    for (const p of products) {
      const specsJson = JSON.stringify(
        p.specifications.map((s) => ({
          specKey: s.specKey,
          specValue: s.specValue,
          ...(s.specUnit ? { specUnit: s.specUnit } : {}),
          sortOrder: s.sortOrder,
        })),
      );
      rows.push([
        this.escapeCsvValue(p.productCode),
        this.escapeCsvValue(p.name),
        this.escapeCsvValue(p.brand ?? ''),
        this.escapeCsvValue(p.categoryName ?? ''),
        this.escapeCsvValue(p.subCategory ?? ''),
        this.escapeCsvValue(p.unitOfMeasure),
        this.escapeCsvValue(p.description ?? ''),
        this.escapeCsvValue(p.status),
        this.escapeCsvValue(p.tags.join(';')),
        this.escapeCsvValue(specsJson),
      ].join(','));
    }

    return rows.join('\r\n');
  }

  // ─── Import CSV ────────────────────────────────────────────────────────────
  async importCsv(buffer: Buffer): Promise<{
    success: boolean;
    data: { created: number; skipped: number; errors: string[]; warnings: string[] };
  }> {
    // Strip UTF-8 BOM that Excel adds when saving as CSV
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return { success: true, data: { created: 0, skipped: 0, errors: ['No data rows found in file'], warnings: [] } };
    }

    const rawHeaders = this.parseCsvLine(lines[0]);
    // Normalize headers: lowercase + remove spaces/underscores for flexible matching
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s_-]/g, '');
    const normalizedHeaders = rawHeaders.map(normalize);

    // Find column index by one or more possible aliases (all normalized)
    const idx = (...aliases: string[]) => {
      for (const a of aliases) {
        const i = normalizedHeaders.indexOf(normalize(a));
        if (i !== -1) return i;
      }
      return -1;
    };

    const colIdx = {
      productCode: idx('productCode', 'product code', 'product_code', 'code'),
      name:        idx('name', 'product name', 'productname'),
      brand:       idx('brand', 'brand name', 'brandname', 'make'),
      categoryName: idx('categoryName', 'category', 'category name', 'categoryname', 'cat'),
      subCategory:  idx('subCategory', 'subcategory', 'sub category', 'sub'),
      unitOfMeasure: idx('unitOfMeasure', 'unit', 'uom', 'unit of measure'),
      description:  idx('description', 'desc'),
      status:       idx('status'),
      tags:         idx('tags', 'tag'),
      specifications: idx('specifications', 'specs', 'spec'),
    };

    if (colIdx.name === -1) {
      return {
        success: false,
        data: { created: 0, skipped: 0, errors: ['Missing required column: "name" (also tried: product name)'], warnings: [] },
      };
    }

    const validUoms = ['pcs', 'kg', 'ltr', 'mtr', 'set', 'box', 'roll'];
    const validStatuses = ['active', 'discontinued', 'draft'];

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const rawCode = colIdx.productCode >= 0 ? values[colIdx.productCode]?.trim() : '';
      const name = values[colIdx.name]?.trim();

      if (!name) {
        errors.push(`Row ${i + 1}: name is required`);
        continue;
      }

      const brand = (colIdx.brand >= 0 ? values[colIdx.brand]?.trim() : null) || null;
      const productCode = rawCode
        ? rawCode.toUpperCase()
        : await this.generateProductCode(name, brand);

      // Skip rows that already exist
      const existing = await this.prisma.product.findUnique({ where: { productCode } });
      if (existing) { skipped++; continue; }

      // Parse specs
      let specifications: Array<{ specKey: string; specValue: string; specUnit?: string; sortOrder?: number }> = [];
      if (colIdx.specifications >= 0 && values[colIdx.specifications]) {
        try { specifications = JSON.parse(values[colIdx.specifications]); } catch { /* ignore */ }
      }

      // Parse tags (semicolon-separated)
      const tagsRaw = colIdx.tags >= 0 ? (values[colIdx.tags] ?? '') : '';
      const tags = tagsRaw ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean) : [];

      // Store category name as free text
      const catName = colIdx.categoryName >= 0 ? (values[colIdx.categoryName]?.trim() ?? '') : '';

      // Validate / default enums
      const uomRaw = (colIdx.unitOfMeasure >= 0 ? values[colIdx.unitOfMeasure]?.trim().toLowerCase() : '') || 'pcs';
      const unitOfMeasure = validUoms.includes(uomRaw) ? uomRaw : 'pcs';

      const statusRaw = (colIdx.status >= 0 ? values[colIdx.status]?.trim().toLowerCase() : '') || 'active';
      const status = validStatuses.includes(statusRaw) ? statusRaw : 'active';

      try {
        await this.prisma.product.create({
          data: {
            productCode,
            name,
            brand,
            categoryName: catName || null,
            subCategory: (colIdx.subCategory >= 0 ? values[colIdx.subCategory]?.trim() : null) || null,
            unitOfMeasure: unitOfMeasure as Prisma.EnumUnitOfMeasureFilter['equals'],
            description: (colIdx.description >= 0 ? values[colIdx.description]?.trim() : null) || null,
            status: status as Prisma.EnumProductStatusFilter['equals'],
            tags,
            ...(specifications.length > 0 && {
              specifications: {
                create: specifications.map((s, j) => ({
                  specKey: s.specKey,
                  specValue: s.specValue,
                  specUnit: s.specUnit ?? null,
                  sortOrder: s.sortOrder ?? j,
                })),
              },
            }),
          },
        });
        created++;
      } catch (err: unknown) {
        const e = err as { message?: string };
        errors.push(`Row ${i + 1} (${productCode}): ${e.message ?? 'Unknown error'}`);
      }
    }

    return { success: true, data: { created, skipped, errors, warnings } };
  }
}
