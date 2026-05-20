import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto, LinkProductSupplierDto } from './dto/supplier.dto';
import { handlePrismaError } from '../common/utils/prisma-error.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const where: Prisma.SupplierWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const data = await this.prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { productSuppliers: true, purchaseOrders: true } },
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        productSuppliers: {
          include: {
            product: { select: { id: true, productCode: true, name: true, unitOfMeasure: true } },
          },
        },
        _count: { select: { purchaseOrders: true } },
      },
    });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return { success: true, data: supplier };
  }

  async create(dto: CreateSupplierDto) {
    try {
      const supplier = await this.prisma.supplier.create({
        data: {
          name: dto.name,
          contactName: dto.contactName,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          gstin: dto.gstin,
          pan: dto.pan,
          bankName: dto.bankName,
          bankAccountNumber: dto.bankAccountNumber,
          bankIfscCode: dto.bankIfscCode,
          bankBranch: dto.bankBranch,
          leadTimeDays: dto.leadTimeDays ?? 3,
          notes: dto.notes,
        },
      });
      return { success: true, data: supplier };
    } catch (e) {
      handlePrismaError(e);
    }
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    try {
      const updated = await this.prisma.supplier.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.contactName !== undefined && { contactName: dto.contactName }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.gstin !== undefined && { gstin: dto.gstin }),
          ...(dto.pan !== undefined && { pan: dto.pan }),
          ...(dto.bankName !== undefined && { bankName: dto.bankName }),
          ...(dto.bankAccountNumber !== undefined && { bankAccountNumber: dto.bankAccountNumber }),
          ...(dto.bankIfscCode !== undefined && { bankIfscCode: dto.bankIfscCode }),
          ...(dto.bankBranch !== undefined && { bankBranch: dto.bankBranch }),
          ...(dto.leadTimeDays !== undefined && { leadTimeDays: dto.leadTimeDays }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
      });
      return { success: true, data: updated };
    } catch (e) {
      handlePrismaError(e);
    }
  }

  async remove(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    await this.prisma.supplier.delete({ where: { id } });
    return { success: true, message: 'Supplier deleted' };
  }

  async uploadCancelledCheque(id: string, fileUrl: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { cancelledChequeUrl: fileUrl },
    });
    return { success: true, data: updated };
  }

  async linkProduct(supplierId: string, dto: LinkProductSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException(`Supplier ${supplierId} not found`);
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    try {
      if (dto.isPreferred) {
        // Unset other preferred suppliers for this product
        await this.prisma.productSupplier.updateMany({
          where: { productId: dto.productId, isPreferred: true },
          data: { isPreferred: false },
        });
      }
      const link = await this.prisma.productSupplier.upsert({
        where: { productId_supplierId: { productId: dto.productId, supplierId } },
        update: {
          supplierSku: dto.supplierSku,
          unitPrice: dto.unitPrice !== undefined ? new Prisma.Decimal(dto.unitPrice) : undefined,
          minOrderQty: dto.minOrderQty !== undefined ? new Prisma.Decimal(dto.minOrderQty) : undefined,
          isPreferred: dto.isPreferred ?? false,
        },
        create: {
          productId: dto.productId,
          supplierId,
          supplierSku: dto.supplierSku,
          unitPrice: dto.unitPrice !== undefined ? new Prisma.Decimal(dto.unitPrice) : null,
          minOrderQty: new Prisma.Decimal(dto.minOrderQty ?? 1),
          isPreferred: dto.isPreferred ?? false,
        },
      });
      return { success: true, data: link };
    } catch (e) {
      handlePrismaError(e);
    }
  }

  async unlinkProduct(supplierId: string, productId: string) {
    const link = await this.prisma.productSupplier.findUnique({
      where: { productId_supplierId: { productId, supplierId } },
    });
    if (!link) throw new NotFoundException('Link not found');
    await this.prisma.productSupplier.delete({
      where: { productId_supplierId: { productId, supplierId } },
    });
    return { success: true, message: 'Product unlinked from supplier' };
  }
}
