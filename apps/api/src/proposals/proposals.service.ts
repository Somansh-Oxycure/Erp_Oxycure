import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { handlePrismaError } from '../common/utils/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProposalFilterDto, UpdateProposalStatusDto, UpdateProposalDto, AddProposalItemDto, CreateProposalFollowUpDto, UpdateProposalFollowUpDto, AddProposalNoteDto } from './dto/proposal.dto';
import { ProposalStatus, UserRole } from '@prisma/client';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const PROPOSAL_INCLUDE = {
  ticket: {
    select: {
      id: true,
      referenceId: true,
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
  notes: {
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  followUps: {
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: 'asc' as const },
  },
  _count: {
    select: { followUps: true, notes: true },
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

    // TODO: unit test role scoping
    if (currentUser.role === 'salesperson') {
      where.ticket = { assignedToId: currentUser.id };
    }

    if (status) where.status = status;
    if (ticketId) where.ticketId = ticketId;

    if (search) {
      where.OR = [
        { ticket: { referenceId: { contains: search, mode: 'insensitive' } } },
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

    // Strict transition map: draft → sent only; sent → accepted|rejected|expired; rest terminal
    const validTransitions: Record<ProposalStatus, ProposalStatus[]> = {
      draft:    ['sent'],
      sent:     ['accepted', 'rejected', 'expired'],
      accepted: [],
      rejected: [],
      expired:  [],
    };

    if (!validTransitions[proposal.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${proposal.status}' to '${dto.status}'`,
      );
    }

    let updated;
    try {
      updated = await this.prisma.proposal.update({
        where: { id },
        data: {
          status: dto.status,
        },
        include: PROPOSAL_INCLUDE,
      });
    } catch (err) {
      handlePrismaError(err);
    }

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

    return { message: `Status updated to ${dto.status}`, data: updated };
  }

  // ─── Stats ────────────────────────────────────────────────────────────────
  async getStats(currentUser: { id: string; role: UserRole }) {
    const baseWhere =
      currentUser.role === 'salesperson'
        ? { ticket: { assignedToId: currentUser.id } }
        : {};

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, byStatus, totalValue, todayFollowUps, overdueFollowUps] = await Promise.all([
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
      this.prisma.proposalFollowUp.count({
        where: {
          proposal: baseWhere,
          scheduledAt: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
          status: 'pending',
        },
      }),
      this.prisma.proposalFollowUp.count({
        where: {
          proposal: baseWhere,
          scheduledAt: { lt: today },
          status: 'pending',
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => { statusMap[s.status] = s._count.status; });

    return {
      total,
      byStatus: statusMap,
      pipelineValue: totalValue._sum.totalAmount || 0,
      todayFollowUps,
      overdueFollowUps,
    };
  }

  // ─── Today Follow-ups ────────────────────────────────────────────────────
  async getTodayFollowUps(currentUser: { id: string; role: UserRole }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.proposalFollowUp.findMany({
      where: {
        scheduledAt: { gte: today, lt: tomorrow },
        status: 'pending',
        ...(currentUser.role === 'salesperson'
          ? { proposal: { ticket: { assignedToId: currentUser.id } } }
          : {}),
      },
      include: {
        proposal: {
          select: {
            id: true,
            ticket: { select: { referenceId: true, clientName: true, projectName: true } },
          },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // ─── Create Follow-up ────────────────────────────────────────────────────
  async createFollowUp(id: string, dto: CreateProposalFollowUpDto, createdById: string) {
    await this.findOne(id);

    const followUp = await this.prisma.proposalFollowUp.create({
      data: {
        proposalId: id,
        scheduledAt: new Date(dto.scheduledAt),
        outcome: dto.outcome,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update nextFollowUpDate on the proposal
    await this.prisma.proposal.update({
      where: { id },
      data: { nextFollowUpDate: new Date(dto.scheduledAt) },
    });

    return followUp;
  }

  // ─── Update Follow-up ────────────────────────────────────────────────────
  async updateFollowUp(fid: string, dto: UpdateProposalFollowUpDto) {
    return this.prisma.proposalFollowUp.update({
      where: { id: fid },
      data: dto,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Add Note ─────────────────────────────────────────────────────────────
  async addNote(id: string, dto: AddProposalNoteDto, createdById: string) {
    await this.findOne(id);
    return this.prisma.proposalNote.create({
      data: {
        proposalId: id,
        content: dto.content,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Upload Document ──────────────────────────────────────────────────────
  async uploadDocument(
    id: string,
    file: Express.Multer.File,
  ) {
    // ProposalUploadInterceptor has already:
    //   • deleted the previous document file
    //   • written the new file as <refNumber>.<ext> via diskStorage
    // All that remains is persisting the URL in the database.
    await this.findOne(id);

    const documentUrl = `/uploads/proposals/${file.filename}`;

    return this.prisma.proposal.update({
      where: { id },
      data: {
        documentUrl,
        documentOriginalName: file.originalname,
      },
      include: PROPOSAL_INCLUDE,
    });
  }

  // ─── Get Document Info (for download endpoint) ────────────────────────────
  async getDocumentInfo(id: string) {
    const proposal = await this.findOne(id);

    if (!proposal.documentUrl) {
      throw new NotFoundException('No document uploaded for this proposal');
    }

    const filename = proposal.documentUrl.split('/').pop() as string;
    const filePath = join(process.cwd(), 'uploads', 'proposals', filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Document file not found on server');
    }

    const ext = extname(proposal.documentOriginalName || filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf':  'application/pdf',
      '.doc':  'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls':  'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg':  'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png':  'image/png',
    };

    return {
      filePath,
      // downloadName is always the ref-based stored filename (e.g. REF12345.pdf).
      // originalName is kept for display purposes only.
      downloadName: filename,
      originalName: proposal.documentOriginalName || filename,
      mimeType: mimeTypes[ext] || 'application/octet-stream',
    };
  }

  // ─── Ensure upload directory exists ───────────────────────────────────────
  static ensureUploadDir() {
    const dir = join(process.cwd(), 'uploads', 'proposals');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}
