import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProposalFilterDto, UpdateProposalStatusDto, UpdateProposalDto, AddProposalItemDto } from './dto/proposal.dto';
import { ProposalStatus, UserRole } from '@prisma/client';

const PROPOSAL_INCLUDE = {
  ticket: {
    select: {
      id: true,
      ticketNumber: true,
      clientName: true,
      name: true,
      phone: true,
      email: true,
      projectName: true,
      estimatedValue: true,
    },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  items: {
    orderBy: { sortOrder: 'asc' as const },
  },
};

@Injectable()
export class ProposalsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private recalcTotals(items: AddProposalItemDto[]) {
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    const processed = items.map((item, index) => {
      const base = item.quantity * item.unitPrice;
      const discAmt = base * ((item.discountPercent || 0) / 100);
      const afterDiscount = base - discAmt;
      const taxAmt = afterDiscount * ((item.taxPercent ?? 18) / 100);
      subtotal += base;
      discountAmount += discAmt;
      taxAmount += taxAmt;
      return {
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent ?? 18,
        totalPrice: afterDiscount + taxAmt,
        sortOrder: index,
      };
    });

    return {
      items: processed,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount: subtotal - discountAmount + taxAmount,
    };
  }

  // ─── List Proposals ───────────────────────────────────────────────────────
  async findAll(
    filters: ProposalFilterDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const { page = 1, limit = 20, status, ticketId, search } = filters;

    const where: Record<string, unknown> = {};

    if (currentUser.role === 'salesperson') {
      where.ticket = { assignedToId: currentUser.id };
    }

    if (status) where.status = status;
    if (ticketId) where.ticketId = ticketId;

    if (search) {
      where.OR = [
        { proposalNumber: { contains: search, mode: 'insensitive' } },
        { ticket: { clientName: { contains: search, mode: 'insensitive' } } },
        { ticket: { projectName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        include: PROPOSAL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      success: true,
      data: proposals,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Get Single Proposal ──────────────────────────────────────────────────
  async findOne(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: PROPOSAL_INCLUDE,
    });

    if (!proposal) throw new NotFoundException(`Proposal ${id} not found`);
    return proposal;
  }

  // ─── Update Proposal ──────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateProposalDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const proposal = await this.findOne(id);

    if (proposal.status !== 'draft') {
      throw new BadRequestException('Only draft proposals can be edited');
    }

    let totalsUpdate: Record<string, unknown> = {};

    if (dto.items) {
      const { items, ...totals } = this.recalcTotals(dto.items);

      // Replace all items
      await this.prisma.proposalItem.deleteMany({ where: { proposalId: id } });
      await this.prisma.proposalItem.createMany({
        data: items.map((item) => ({ ...item, proposalId: id })),
      });

      totalsUpdate = totals;
    }

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.termsAndConditions !== undefined && { termsAndConditions: dto.termsAndConditions }),
        ...totalsUpdate,
      },
      include: PROPOSAL_INCLUDE,
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'proposals',
      entityId: id,
      changes: { after: dto },
    });

    return updated;
  }

  // ─── Update Status ────────────────────────────────────────────────────────
  async updateStatus(
    id: string,
    dto: UpdateProposalStatusDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const proposal = await this.findOne(id);

    const validTransitions: Record<ProposalStatus, ProposalStatus[]> = {
      draft: ['sent', 'expired'],
      sent: ['accepted', 'rejected', 'expired'],
      accepted: [],
      rejected: [],
      expired: [],
    };

    if (!validTransitions[proposal.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${proposal.status}' to '${dto.status}'`,
      );
    }

    const updated = await this.prisma.proposal.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.notes && { notes: dto.notes }),
      },
      include: PROPOSAL_INCLUDE,
    });

    // If accepted, mark the ticket as won
    if (dto.status === 'accepted') {
      await this.prisma.ticket.update({
        where: { id: proposal.ticketId },
        data: { status: 'won' },
      });
    }

    await this.auditService.log({
      userId: currentUser.id,
      action: 'STATUS_CHANGE',
      entityType: 'proposals',
      entityId: id,
      changes: { before: { status: proposal.status }, after: { status: dto.status } },
    });

    return updated;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────
  async getStats(currentUser: { id: string; role: UserRole }) {
    const baseWhere =
      currentUser.role === 'salesperson'
        ? { ticket: { assignedToId: currentUser.id } }
        : {};

    const [total, byStatus, totalValue] = await Promise.all([
      this.prisma.proposal.count({ where: baseWhere }),
      this.prisma.proposal.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      this.prisma.proposal.aggregate({
        where: { ...baseWhere, status: { in: ['draft', 'sent'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => { statusMap[s.status] = s._count.status; });

    return {
      total,
      byStatus: statusMap,
      pipelineValue: totalValue._sum.totalAmount || 0,
    };
  }
}
