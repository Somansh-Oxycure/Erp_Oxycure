import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { handlePrismaError } from '../common/utils/prisma-error.util';
import { CreateBoQDto, CreateBoQProductDto } from './dto/create-boq.dto';
import { UpdateBoQDto, UpdateBoQProductDto } from './dto/update-boq.dto';
import { UpdateBoQStatusDto } from './dto/update-boq-status.dto';
import { BoQStatus, UserRole } from '@prisma/client';

// ─── Include shape used across all BoQ queries ───────────────────────────────
const BOQ_INCLUDE = {
  proposal: {
    select: {
      id: true,
      status: true,
      ticket: {
        select: {
          id: true,
          referenceId: true,
          clientName: true,
          projectName: true,
          assignedToId: true,
        },
      },
    },
  },
  products: {
    include: {
      template: { select: { id: true, name: true, code: true } },
      items: { orderBy: { sortOrder: 'asc' as const } },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  preparedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
};

type CurrentUser = { id: string; role: UserRole };

@Injectable()
export class BoQService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── BOQ Number generator  (BOQ-YYYY-NNNN) ───────────────────────────────
  private async generateBoQNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counterKey = `boq-${year}`;

    const counter = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.referenceCounter.upsert({
        where: { id: counterKey },
        create: { id: counterKey, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      });
      return updated.lastSeq;
    });

    return `BOQ-${year}-${String(counter).padStart(4, '0')}`;
  }

  // ─── Role-scoping helper — salesperson can only see their proposals ────────
  private buildProposalScope(user: CurrentUser) {
    if (user.role === 'salesperson') {
      return { proposal: { ticket: { assignedToId: user.id } } };
    }
    return {};
  }

  // ─── Verify caller can access this BoQ ────────────────────────────────────
  private async verifyAccess(boqId: string, user: CurrentUser) {
    const boq = await this.prisma.boQ.findUnique({
      where: { id: boqId },
      include: { proposal: { include: { ticket: true } } },
    });

    if (!boq) throw new NotFoundException(`BoQ ${boqId} not found`);

    if (
      user.role === 'salesperson' &&
      boq.proposal.ticket.assignedToId !== user.id
    ) {
      throw new ForbiddenException('Access denied to this BoQ');
    }

    return boq;
  }

  // ─── Compute totalAmount from an array of products (each with items) ─────
  private computeTotalAmount(
    products: { items: { quantity: number; unitRate: number; isIncluded: boolean }[] }[],
  ) {
    return products.reduce((boqTotal, product) => {
      return (
        boqTotal +
        product.items.reduce((prodTotal, item) => {
          if (!item.isIncluded) return prodTotal;
          return prodTotal + item.quantity * item.unitRate;
        }, 0)
      );
    }, 0);
  }

  // ─── Build product create payload from a DTO product ─────────────────────
  private async buildProductData(
    prod: CreateBoQProductDto | UpdateBoQProductDto,
    sortOrder: number,
  ) {
    const priceMode = (prod as { priceMode?: string }).priceMode ?? 'component';
    const items = (prod.items ?? []).map((item, i) => ({
      templateComponentId: item.templateComponentId ?? null,
      name: item.name ?? '',
      description: item.description ?? null,
      unit: item.unit ?? '',
      size: (item as { size?: string }).size ?? null,
      quantity: Number(item.quantity ?? 0),
      unitRate: Number(item.unitRate ?? 0),
      totalPrice: Number(item.quantity ?? 0) * Number(item.unitRate ?? 0),
      remarks: item.remarks ?? null,
      sortOrder: item.sortOrder ?? i,
      isOptional: item.isOptional ?? false,
      isIncluded: item.isIncluded ?? true,
    }));

    const productCustomValues = (prod as { customValues?: Record<string, string> }).customValues ?? Prisma.JsonNull;

    let subtotal: number;
    if (priceMode === 'fixed') {
      subtotal = Number((prod as { fixedPrice?: number }).fixedPrice ?? 0);
    } else {
      subtotal = items
        .filter((i) => i.isIncluded)
        .reduce((sum, i) => sum + i.totalPrice, 0);
    }

    const productCharges = (prod as { charges?: object }).charges ?? Prisma.JsonNull;

    return {
      templateId: prod.templateId ?? null,
      name: prod.name ?? 'Custom Items',
      description: prod.description ?? null,
      sortOrder: prod.sortOrder ?? sortOrder,
      priceMode,
      fixedPrice: priceMode === 'fixed' ? Number((prod as { fixedPrice?: number }).fixedPrice ?? 0) : null,
      subtotal,
      customValues: productCustomValues,
      charges: productCharges,
      items: { create: items },
    };
  }

  // ─── List BoQs ────────────────────────────────────────────────────────────
  async findAll(
    filters: { status?: BoQStatus; proposalId?: string; preparedById?: string },
    user: CurrentUser,
  ) {
    const where: Record<string, unknown> = {
      ...this.buildProposalScope(user),
    };

    if (filters.status) where.status = filters.status;
    if (filters.proposalId) where.proposalId = filters.proposalId;
    if (filters.preparedById) where.preparedById = filters.preparedById;

    const boqs = await this.prisma.boQ.findMany({
      where,
      include: BOQ_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: boqs };
  }

  // ─── Get Single BoQ ───────────────────────────────────────────────────────
  async findOne(id: string, user: CurrentUser) {
    await this.verifyAccess(id, user);

    const boq = await this.prisma.boQ.findUnique({
      where: { id },
      include: BOQ_INCLUDE,
    });

    return boq!;
  }

  // ─── Get BoQ by Proposal ID ───────────────────────────────────────────────
  async findByProposal(proposalId: string, user: CurrentUser) {
    if (user.role === 'salesperson') {
      // Verify the proposal belongs to them
      const proposal = await this.prisma.proposal.findUnique({
        where: { id: proposalId },
        include: { ticket: true },
      });
      if (!proposal) throw new NotFoundException('Proposal not found');
      if (proposal.ticket.assignedToId !== user.id) {
        throw new ForbiddenException('Access denied');
      }
    }

    const boq = await this.prisma.boQ.findUnique({
      where: { proposalId },
      include: BOQ_INCLUDE,
    });

    return { success: true, data: boq ?? null };
  }

  // ─── Create BoQ ──────────────────────────────────────────────────────────
  async create(dto: CreateBoQDto, user: CurrentUser) {
    // Verify proposal exists and user has access
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
      include: { ticket: true, boq: true },
    });

    if (!proposal) throw new NotFoundException('Proposal not found');

    if (
      user.role === 'salesperson' &&
      proposal.ticket.assignedToId !== user.id
    ) {
      throw new ForbiddenException('Access denied to this proposal');
    }

    if (proposal.boq) {
      throw new ConflictException('A BoQ already exists for this proposal');
    }

    if (!dto.products || dto.products.length === 0) {
      throw new BadRequestException('At least one product is required');
    }

    const boqNumber = await this.generateBoQNumber();

    // Build product payloads
    const productDataList = await Promise.all(
      dto.products.map((prod, i) => this.buildProductData(prod, i)),
    );

    const totalAmount = productDataList.reduce((sum, p) => sum + Number(p.subtotal), 0);

    try {
      const boq = await this.prisma.boQ.create({
        data: {
          boqNumber,
          proposalId: dto.proposalId,
          status: 'draft',
          notes: dto.notes ?? null,
          customColumns: dto.customColumns ? (dto.customColumns as object[]) : undefined,
          preparedById: user.id,
          totalAmount,
          products: { create: productDataList },
        },
        include: BOQ_INCLUDE,
      });

      await this.auditService.log({
        userId: user.id,
        action: 'CREATE',
        entityType: 'boqs',
        entityId: boq.id,
        changes: {
          after: { boqNumber, proposalId: dto.proposalId, productCount: dto.products.length },
        },
      });

      return { success: true, data: boq };
    } catch (err) {
      handlePrismaError(err);
    }
  }

  // ─── Update BoQ (products + notes) ───────────────────────────────────────
  async update(id: string, dto: UpdateBoQDto, user: CurrentUser) {
    const boq = await this.verifyAccess(id, user);

    if (boq.status !== 'draft') {
      throw new BadRequestException('Only draft BoQs can be edited');
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        let totalAmount: number | undefined;

        if (dto.products !== undefined) {
          // Replace all products and their items
          await tx.boQProduct.deleteMany({ where: { boqId: id } });

          const productDataList = await Promise.all(
            dto.products.map((prod, i) => this.buildProductData(prod, i)),
          );

          if (productDataList.length > 0) {
            await tx.boQProduct.createMany({
              data: productDataList.map((p, i) => ({
                boqId: id,
                templateId: p.templateId,
                name: p.name,
                description: p.description,
                sortOrder: p.sortOrder ?? i,
                priceMode: p.priceMode,
                fixedPrice: p.fixedPrice,
                subtotal: p.subtotal,
                customValues: p.customValues,
                charges: p.charges,
              })),
            });

            // Fetch the newly created products to get their ids
            const createdProducts = await tx.boQProduct.findMany({
              where: { boqId: id },
              orderBy: { sortOrder: 'asc' },
            });

            // Create items for each product
            for (let i = 0; i < productDataList.length; i++) {
              const productId = createdProducts[i]?.id;
              const itemsData = (dto.products![i].items ?? []).map((item, j) => ({
                boqProductId: productId,
                templateComponentId: item.templateComponentId ?? null,
                name: item.name ?? '',
                description: item.description ?? null,
                unit: item.unit ?? '',
                size: (item as { size?: string }).size ?? null,
                quantity: Number(item.quantity ?? 0),
                unitRate: Number(item.unitRate ?? 0),
                totalPrice: Number(item.quantity ?? 0) * Number(item.unitRate ?? 0),
                remarks: item.remarks ?? null,
                sortOrder: item.sortOrder ?? j,
                isOptional: item.isOptional ?? false,
                isIncluded: item.isIncluded ?? true,
              }));

              if (itemsData.length > 0) {
                await tx.boQItem.createMany({ data: itemsData });
              }
            }
          }

          // Recompute totalAmount server-side — never trust client
          totalAmount = productDataList.reduce(
            (sum, p) => sum + Number(p.subtotal),
            0,
          );
        }

        return tx.boQ.update({
          where: { id },
          data: {
            ...(dto.notes !== undefined && { notes: dto.notes }),
            ...(dto.customColumns !== undefined && { customColumns: dto.customColumns as object[] }),
            ...(totalAmount !== undefined && { totalAmount }),
          },
          include: BOQ_INCLUDE,
        });
      });

      await this.auditService.log({
        userId: user.id,
        action: 'UPDATE',
        entityType: 'boqs',
        entityId: id,
        changes: { after: dto },
      });

      return { success: true, data: updated };
    } catch (err) {
      handlePrismaError(err);
    }
  }

  // ─── Update BoQ Status ────────────────────────────────────────────────────
  async updateStatus(id: string, dto: UpdateBoQStatusDto, user: CurrentUser) {
    const boq = await this.verifyAccess(id, user);

    // Salesperson cannot finalize
    if (dto.status === 'final' && user.role === 'salesperson') {
      throw new ForbiddenException('Only managers or admins can finalize a BoQ');
    }

    const validTransitions: Record<BoQStatus, BoQStatus[]> = {
      draft:    ['final'],
      final:    ['draft', 'archived'],
      archived: [],
    };

    // Only admins/managers can reopen a finalized BoQ
    if (dto.status === 'draft' && boq.status === 'final' && user.role === 'salesperson') {
      throw new ForbiddenException('Only managers or admins can reopen a finalized BoQ');
    }

    if (!validTransitions[boq.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition BoQ from '${boq.status}' to '${dto.status}'`,
      );
    }

    try {
      const updated = await this.prisma.boQ.update({
        where: { id },
        data: { status: dto.status },
        include: BOQ_INCLUDE,
      });

      await this.auditService.log({
        userId: user.id,
        action: 'STATUS_CHANGE',
        entityType: 'boqs',
        entityId: id,
        changes: { before: { status: boq.status }, after: { status: dto.status } },
      });

      // FUTURE: When transitioning to final, check linked Proposal state.
      // Currently finalization is independent of proposal status.

      return { success: true, message: `BoQ status updated to ${dto.status}`, data: updated };
    } catch (err) {
      handlePrismaError(err);
    }
  }

  // ─── Soft-delete BoQ (admin only) ─────────────────────────────────────────
  async remove(id: string, user: CurrentUser) {
    await this.verifyAccess(id, user);

    try {
      const updated = await this.prisma.boQ.update({
        where: { id },
        data: { status: 'archived' },
        include: BOQ_INCLUDE,
      });

      await this.auditService.log({
        userId: user.id,
        action: 'DELETE',
        entityType: 'boqs',
        entityId: id,
        changes: { after: { status: 'archived' } },
      });

      return { success: true, message: 'BoQ archived', data: updated };
    } catch (err) {
      handlePrismaError(err);
    }
  }
}
