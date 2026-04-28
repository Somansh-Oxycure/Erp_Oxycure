import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  ConvertTicketDto,
  CreateTicketNoteDto,
  CreateFollowUpDto,
  UpdateFollowUpDto,
  TicketFilterDto,
} from './dto/ticket.dto';
import { NoteType, Prisma, TicketStatus, UserRole } from '@prisma/client';

const TICKET_INCLUDE = {
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  customer: {
    select: { id: true, customerNumber: true },
  },
  statusHistory: {
    where: { exitedAt: null },
    select: { enteredAt: true },
    take: 1,
    orderBy: { enteredAt: 'desc' as const },
  },
  _count: {
    select: { notes: true, followUps: true },
  },
};

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Auto-generate Ticket Number ─────────────────────────────────────────
  private async generateTicketNumber(): Promise<string> {
    const last = await this.prisma.ticket.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const next = last ? parseInt(last.ticketNumber.split('-')[1]) + 1 : 1;
    return `TKT-${String(next).padStart(4, '0')}`;
  }

  // ─── List Tickets ─────────────────────────────────────────────────────────
  async findAll(
    filters: TicketFilterDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      productType,
      source,
      assignedToId,
      region,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.TicketWhereInput = {};

    if (currentUser.role === 'salesperson') {
      where.assignedToId = currentUser.id;
    }

    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (productType) where.productType = productType;
    if (source) where.source = source;
    if (region) where.region = { contains: region, mode: 'insensitive' };

    if (assignedToId && currentUser.role !== 'salesperson') {
      where.assignedToId = assignedToId;
    }

    if (dateFrom || dateTo) {
      const toEndOfDay = (d: string) => {
        const dt = new Date(d);
        dt.setHours(23, 59, 59, 999);
        return dt;
      };
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: toEndOfDay(dateTo) }),
      };
    }

    const validSortFields: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      clientName: 'clientName',
      estimatedValue: 'estimatedValue',
      nextFollowUpDate: 'nextFollowUpDate',
      status: 'status',
      priority: 'priority',
    };

    const orderByField = validSortFields[sortBy] || 'createdAt';

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: TICKET_INCLUDE,
        orderBy: { [orderByField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      success: true,
      data: tickets,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Ticket Stats ─────────────────────────────────────────────────────────
  async getStats(currentUser: { id: string; role: UserRole }) {
    const baseWhere: Prisma.TicketWhereInput =
      currentUser.role === 'salesperson' ? { assignedToId: currentUser.id } : {};

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      total,
      byStatus,
      newThisWeek,
      pipelineValue,
      todayFollowUps,
      overdueFollowUps,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: baseWhere }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      this.prisma.ticket.count({
        where: { ...baseWhere, createdAt: { gte: weekAgo } },
      }),
      this.prisma.ticket.aggregate({
        where: {
          ...baseWhere,
          status: { in: ['new', 'contacted', 'site_inspection', 'design_review', 'quoted'] },
          estimatedValue: { not: null },
        },
        _sum: { estimatedValue: true },
      }),
      this.prisma.ticketFollowUp.count({
        where: {
          ticket: baseWhere,
          scheduledAt: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
          status: 'pending',
        },
      }),
      this.prisma.ticketFollowUp.count({
        where: {
          ticket: baseWhere,
          scheduledAt: { lt: today },
          status: 'pending',
        },
      }),
    ]);

    const wonCount = byStatus.find((s) => s.status === 'won')?._count.status || 0;
    const lostCount = byStatus.find((s) => s.status === 'lost')?._count.status || 0;
    const conversionRate =
      wonCount + lostCount > 0
        ? Math.round((wonCount / (wonCount + lostCount)) * 100)
        : 0;

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => {
      statusMap[s.status] = s._count.status;
    });

    return {
      total,
      byStatus: statusMap,
      newThisWeek,
      conversionRate,
      pipelineValue: pipelineValue._sum.estimatedValue || 0,
      todayFollowUps,
      overdueFollowUps,
    };
  }

  // ─── Today Follow-ups ─────────────────────────────────────────────────────
  async getTodayFollowUps(currentUser: { id: string; role: UserRole }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.ticketFollowUp.findMany({
      where: {
        scheduledAt: { gte: today, lt: tomorrow },
        status: 'pending',
        ...(currentUser.role === 'salesperson'
          ? { ticket: { assignedToId: currentUser.id } }
          : {}),
      },
      include: {
        ticket: {
          select: { id: true, ticketNumber: true, clientName: true, name: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // ─── Check Duplicate Phone ────────────────────────────────────────────────
  async checkDuplicatePhone(phone: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { phone },
      select: { id: true, ticketNumber: true, clientName: true, name: true, status: true },
    });
    return { isDuplicate: !!ticket, ticket };
  }

  // ─── Get Single Ticket ────────────────────────────────────────────────────
  async findOne(id: string, currentUser: { id: string; role: UserRole }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        ...TICKET_INCLUDE,
        notes: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { scheduledAt: 'asc' },
        },
        designSpecs: {
          select: { id: true, specNumber: true, status: true, requirementSummary: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        proposals: {
          select: {
            id: true,
            proposalNumber: true,
            status: true,
            totalAmount: true,
            validUntil: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    if (
      currentUser.role === 'salesperson' &&
      ticket.assignedToId !== currentUser.id
    ) {
      throw new ForbiddenException('Access denied to this ticket');
    }

    return ticket;
  }

  // ─── Create Ticket ────────────────────────────────────────────────────────
  async create(dto: CreateTicketDto, createdById: string) {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        clientName: dto.clientName,
        name: dto.name,
        phone: dto.phone,
        alternatePhone: dto.alternatePhone,
        email: dto.email,
        clientLocation: dto.clientLocation,
        region: dto.region,
        projectName: dto.projectName,
        projectLocation: dto.projectLocation,
        consultantName: dto.consultantName,
        consultantLocation: dto.consultantLocation,
        architectName: dto.architectName,
        architectLocation: dto.architectLocation,
        approveMake: dto.approveMake,
        productType: dto.productType,
        estimatedValue: dto.estimatedValue,
        requirementNotes: dto.requirementNotes,
        status: dto.status || 'new',
        priority: dto.priority || 'medium',
        source: dto.source || 'other',
        sourceDetail: dto.sourceDetail,
        siteInspectionNeeded: dto.siteInspectionNeeded || false,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
        assignedToId: dto.assignedToId,
        createdById,
      },
      include: TICKET_INCLUDE,
    });

    await this.auditService.log({
      userId: createdById,
      action: 'CREATE',
      entityType: 'tickets',
      entityId: ticket.id,
      changes: { after: { ticketNumber, status: 'new' } },
    });

    // Record initial status in history
    await this.prisma.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        status: ticket.status,
        enteredAt: ticket.createdAt,
        changedById: createdById,
      },
    });

    return ticket;
  }

  // ─── Update Ticket ────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateTicketDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const ticket = await this.findOne(id, currentUser);

    if (dto.status && dto.status === 'lost' && !dto.lostReason && !ticket.lostReason) {
      throw new BadRequestException('Lost reason is required when marking as lost');
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...dto,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
      },
      include: TICKET_INCLUDE,
    });

    if (dto.status && dto.status !== ticket.status) {
      const now = new Date();
      // Close the current open history entry
      const currentHistory = await this.prisma.ticketStatusHistory.findFirst({
        where: { ticketId: id, exitedAt: null },
        orderBy: { enteredAt: 'desc' },
      });
      if (currentHistory) {
        const durationMs = BigInt(now.getTime() - currentHistory.enteredAt.getTime());
        await this.prisma.ticketStatusHistory.update({
          where: { id: currentHistory.id },
          data: { exitedAt: now, durationMs },
        });
      }
      // Open a new history entry
      await this.prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          status: dto.status,
          enteredAt: now,
          changedById: currentUser.id,
        },
      });

      await this.prisma.ticketNote.create({
        data: {
          ticketId: id,
          content: `Status changed from ${ticket.status} to ${dto.status}${dto.lostReason ? `. Reason: ${dto.lostReason}` : ''}`,
          type: NoteType.status_change,
          createdById: currentUser.id,
        },
      });
    }

    await this.auditService.log({
      userId: currentUser.id,
      action: dto.status ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: 'tickets',
      entityId: id,
      changes: { before: { status: ticket.status }, after: dto },
    });

    return updated;
  }

  // ─── Assign Ticket ────────────────────────────────────────────────────────
  async assign(
    id: string,
    dto: AssignTicketDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const prevAssignee = ticket.assignedToId;

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId: dto.assignedToId },
      include: TICKET_INCLUDE,
    });

    await this.prisma.ticketNote.create({
      data: {
        ticketId: id,
        content: dto.note || 'Ticket reassigned',
        type: NoteType.status_change,
        createdById: currentUser.id,
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: 'ASSIGN',
      entityType: 'tickets',
      entityId: id,
      changes: { before: { assignedToId: prevAssignee }, after: { assignedToId: dto.assignedToId } },
    });

    return updated;
  }

  // ─── Convert Ticket to Proposal ──────────────────────────────────────────
  async convert(
    id: string,
    dto: ConvertTicketDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const ticket = await this.findOne(id, currentUser);

    // Check if an active proposal already exists
    const existingProposal = await this.prisma.proposal.findFirst({
      where: {
        ticketId: id,
        status: { notIn: ['rejected', 'expired'] },
      },
    });
    if (existingProposal) {
      throw new BadRequestException('An active proposal already exists for this ticket');
    }

    // Generate proposal number
    const year = new Date().getFullYear();
    const count = await this.prisma.proposal.count({
      where: { proposalNumber: { startsWith: `PROP-${year}-` } },
    });
    const proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, '0')}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Calculate totals from line items
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      const processedItems = (dto.items || []).map((item, index) => {
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

      const calculatedTotal = subtotal - discountAmount + taxAmount;
      const totalAmount = calculatedTotal > 0
        ? calculatedTotal
        : (ticket.estimatedValue ? Number(ticket.estimatedValue) : 0);

      const proposal = await tx.proposal.create({
        data: {
          proposalNumber,
          ticketId: id,
          status: 'draft',
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          notes: dto.notes || ticket.requirementNotes || undefined,
          termsAndConditions: dto.termsAndConditions,
          createdById: currentUser.id,
          items: { create: processedItems },
        },
        include: { items: true },
      });

      const convertedAt = new Date();

      await tx.ticket.update({
        where: { id },
        data: {
          status: 'quoted' as TicketStatus,
          convertedAt,
          convertedById: currentUser.id,
        },
      });

      // Close current history entry and open 'quoted'
      const currentHistory = await tx.ticketStatusHistory.findFirst({
        where: { ticketId: id, exitedAt: null },
        orderBy: { enteredAt: 'desc' },
      });
      if (currentHistory) {
        const durationMs = BigInt(convertedAt.getTime() - currentHistory.enteredAt.getTime());
        await tx.ticketStatusHistory.update({
          where: { id: currentHistory.id },
          data: { exitedAt: convertedAt, durationMs },
        });
      }
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          status: 'quoted' as TicketStatus,
          enteredAt: convertedAt,
          changedById: currentUser.id,
        },
      });

      await tx.ticketNote.create({
        data: {
          ticketId: id,
          content: `Ticket converted to proposal ${proposalNumber}`,
          type: NoteType.status_change,
          createdById: currentUser.id,
        },
      });

      return proposal;
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: 'CONVERT',
      entityType: 'tickets',
      entityId: id,
      changes: { after: { status: 'quoted', proposalNumber } },
    });

    return result;
  }

  // ─── Add Note ─────────────────────────────────────────────────────────────
  async addNote(id: string, dto: CreateTicketNoteDto, createdById: string) {
    await this.findOneRaw(id);
    return this.prisma.ticketNote.create({
      data: {
        ticketId: id,
        content: dto.content,
        type: dto.type || NoteType.general,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  // ─── Create Follow-up ─────────────────────────────────────────────────────
  async createFollowUp(id: string, dto: CreateFollowUpDto, createdById: string) {
    await this.findOneRaw(id);
    const followUp = await this.prisma.ticketFollowUp.create({
      data: {
        ticketId: id,
        scheduledAt: new Date(dto.scheduledAt),
        outcome: dto.outcome,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update nextFollowUpDate on the ticket
    await this.prisma.ticket.update({
      where: { id },
      data: { nextFollowUpDate: new Date(dto.scheduledAt) },
    });

    return followUp;
  }

  // ─── Update Follow-up ─────────────────────────────────────────────────────
  async updateFollowUp(
    _ticketId: string,
    fid: string,
    dto: UpdateFollowUpDto,
    _userId: string,
  ) {
    return this.prisma.ticketFollowUp.update({
      where: { id: fid },
      data: dto,
    });
  }

  // ─── Delete Ticket (soft delete via status) ───────────────────────────────
  async remove(id: string, currentUser: { id: string; role: UserRole }) {
    await this.findOne(id, currentUser);
    // Soft delete: mark as lost
    return this.prisma.ticket.update({
      where: { id },
      data: { status: 'lost' as TicketStatus, lostReason: 'Deleted' },
    });
  }

  // ─── Ticket Aging ─────────────────────────────────────────────────────────
  async getAging(id: string, currentUser: { id: string; role: UserRole }) {
    const ticket = await this.findOneRaw(id);

    if (currentUser.role === 'salesperson' && ticket.assignedToId !== currentUser.id) {
      throw new ForbiddenException('Access denied to this ticket');
    }

    const history = await this.prisma.ticketStatusHistory.findMany({
      where: { ticketId: id },
      orderBy: { enteredAt: 'asc' },
      include: {
        changedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const now = new Date();
    const totalMs = now.getTime() - ticket.createdAt.getTime();

    const entries = history.map((h) => {
      const isActive = h.exitedAt === null;
      const durationMs = isActive
        ? BigInt(now.getTime() - h.enteredAt.getTime())
        : h.durationMs ?? BigInt(0);
      return {
        status: h.status,
        enteredAt: h.enteredAt,
        exitedAt: h.exitedAt,
        durationMs: durationMs.toString(),
        durationHours: Number(durationMs) / (1000 * 60 * 60),
        durationDays: Number(durationMs) / (1000 * 60 * 60 * 24),
        isActive,
        changedBy: h.changedBy,
      };
    });

    return {
      ticketId: id,
      ticketNumber: ticket.ticketNumber,
      currentStatus: ticket.status,
      createdAt: ticket.createdAt,
      totalAgeDays: totalMs / (1000 * 60 * 60 * 24),
      statusHistory: entries,
    };
  }

  private async findOneRaw(id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }
}
