import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.unit.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException(`Unit ${id} not found`);
    return unit;
  }

  async create(dto: CreateUnitDto) {
    try {
      return await this.prisma.unit.create({
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : null,
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        throw new ConflictException(`A unit named "${dto.name}" already exists`);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.findOne(id);
    try {
      return await this.prisma.unit.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        throw new ConflictException(`A unit named "${dto.name}" already exists`);
      }
      throw err;
    }
  }
}
