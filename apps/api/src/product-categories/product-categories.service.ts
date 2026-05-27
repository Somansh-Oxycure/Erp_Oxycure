import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/product-category.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-');
}

@Injectable()
export class ProductCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.productCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        _count: { select: { products: true } },
      },
      where: { parentId: null },
    });
    return { success: true, data: categories };
  }

  async findFlat() {
    const categories = await this.prisma.productCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return { success: true, data: categories };
  }

  async findOne(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return { success: true, data: category };
  }

  async create(dto: CreateProductCategoryDto) {
    const slug = dto.slug ?? slugify(dto.name);
    try {
      const category = await this.prisma.productCategory.create({
        data: {
          name: dto.name,
          slug,
          parentId: dto.parentId ?? null,
          description: dto.description,
          sortOrder: dto.sortOrder ?? 0,
        },
        include: { children: true, parent: true },
      });
      return { success: true, data: category };
    } catch (err: unknown) {
      const e = err as { code?: string; meta?: { target?: string[] } };
      if (e.code === 'P2002') {
        const field = e.meta?.target?.includes('slug') ? 'slug' : 'name';
        throw new ConflictException(`A category with that ${field} already exists`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateProductCategoryDto) {
    await this.findOne(id);
    try {
      const category = await this.prisma.productCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.slug !== undefined && { slug: dto.slug }),
          ...(Object.prototype.hasOwnProperty.call(dto, 'parentId') && { parentId: dto.parentId }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        },
        include: { children: true, parent: true },
      });
      return { success: true, data: category };
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') throw new ConflictException('Category name/slug already exists');
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.productCategory.delete({ where: { id } });
    return { success: true, message: 'Category deleted' };
  }

  // ─── One-time sync: create ProductCategory rows from distinct categoryName ─
  async syncFromProducts() {
    const rows = await this.prisma.product.findMany({
      where: { categoryName: { not: null } },
      select: { id: true, categoryName: true },
    });

    // Deduplicate names (case-insensitive)
    const nameMap = new Map<string, string>(); // lowercase → original name
    for (const r of rows) {
      const key = r.categoryName!.trim().toLowerCase();
      if (key && !nameMap.has(key)) nameMap.set(key, r.categoryName!.trim());
    }

    let created = 0;
    let linked = 0;

    for (const [, name] of nameMap) {
      // Find or create the ProductCategory record
      let cat = await this.prisma.productCategory.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (!cat) {
        cat = await this.prisma.productCategory.create({
          data: { name, slug: slugify(name) },
        });
        created++;
      }

      // Link all products that have this categoryName but no categoryId
      const result = await this.prisma.product.updateMany({
        where: {
          categoryName: { equals: name, mode: 'insensitive' },
          categoryId: null,
        },
        data: { categoryId: cat.id },
      });
      linked += result.count;
    }

    return { success: true, data: { categoriesCreated: created, productsLinked: linked } };
  }
}
