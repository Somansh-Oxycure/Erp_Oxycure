import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { handlePrismaError } from '../common/utils/prisma-error.util';
import { CreateBoQTemplateDto } from './dto/create-boq-template.dto';
import { UpdateBoQTemplateDto } from './dto/update-boq-template.dto';

@Injectable()
export class BoQTemplatesService {
  constructor(private prisma: PrismaService) {}

  // ─── List Active Templates ─────────────────────────────────────────────────
  async findAll() {
    const templates = await this.prisma.boQTemplate.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { components: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: templates };
  }

  // ─── List All Templates (admin) ────────────────────────────────────────────
  async findAllAdmin() {
    const templates = await this.prisma.boQTemplate.findMany({
      include: {
        _count: { select: { components: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: templates };
  }

  // ─── Get Single Template with Components ──────────────────────────────────
  async findOne(id: string) {
    const template = await this.prisma.boQTemplate.findUnique({
      where: { id },
      include: {
        components: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!template) throw new NotFoundException(`BoQ template ${id} not found`);
    return template;
  }

  // ─── Create Template ──────────────────────────────────────────────────────
  async create(dto: CreateBoQTemplateDto) {
    try {
      const template = await this.prisma.boQTemplate.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          ...(dto.components && dto.components.length > 0 && {
            components: {
              create: dto.components.map((c, i) => ({
                name: c.name,
                description: c.description,
                unit: c.unit,
                size: c.size,
                defaultQty: c.defaultQty,
                defaultUnitRate: c.defaultUnitRate ?? 0,
                sortOrder: c.sortOrder ?? i,
                isOptional: c.isOptional ?? false,
              })),
            },
          }),
        },
        include: {
          components: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { components: true } },
        },
      });

      return { success: true, data: template };
    } catch (err) {
      handlePrismaError(err);
    }
  }

  // ─── Update Template ──────────────────────────────────────────────────────
  async update(id: string, dto: UpdateBoQTemplateDto) {
    await this.findOne(id);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // If components are provided, replace the entire list
        if (dto.components !== undefined) {
          await tx.boQTemplateComponent.deleteMany({ where: { templateId: id } });
        }

        return tx.boQTemplate.update({
          where: { id },
          data: {
            ...(dto.name && { name: dto.name }),
            ...(dto.code && { code: dto.code }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.components !== undefined && {
              components: {
                create: dto.components.map((c, i) => ({
                  name: c.name,
                  description: c.description,
                  unit: c.unit,
                  size: c.size,
                  defaultQty: c.defaultQty,
                  defaultUnitRate: c.defaultUnitRate ?? 0,
                  sortOrder: c.sortOrder ?? i,
                  isOptional: c.isOptional ?? false,
                })),
              },
            }),
          },
          include: {
            components: { orderBy: { sortOrder: 'asc' } },
            _count: { select: { components: true } },
          },
        });
      });

      return { success: true, data: updated };
    } catch (err) {
      handlePrismaError(err);
    }
  }

  // ─── Deactivate Template (soft delete) ────────────────────────────────────
  async deactivate(id: string) {
    await this.findOne(id);

    const updated = await this.prisma.boQTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, data: updated };
  }

  // ─── Reactivate Template ──────────────────────────────────────────────────
  async reactivate(id: string) {
    await this.findOne(id);

    const updated = await this.prisma.boQTemplate.update({
      where: { id },
      data: { isActive: true },
    });

    return { success: true, data: updated };
  }
}
