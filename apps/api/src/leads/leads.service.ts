import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  AssignLeadDto,
  ConvertLeadDto,
  CreateLeadNoteDto,
  CreateFollowUpDto,
  LeadFilterDto,
} from './dto/lead.dto';
import { LeadStatus, NoteType, Prisma, UserRole } from '@prisma/client';

const LEAD_INCLUDE = {
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  customer: {
    select: { id: true, customerNumber: true },
  },
  _count: {
    select: { notes: true, followUps: true },
  },
};

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Auto-generate Lead Number ─────────────────────────────────────────────
  private async generateLeadNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.lead.count({
      where: { leadNumber: { startsWith: `LD-${year}-` } },
    });
    return `LD-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── List Leads ────────────────────────────────────────────────────────────
  async findAll(
    filters: LeadFilterDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const { page = 1, limit = 20, search, status, priority, productType, source, assignedToId, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const where: Prisma.LeadWhereInput = {};

    // Role-based visibility: salespersons only see assigned leads
    if (currentUser.role === 'salesperson') {
      where.assignedToId = currentUser.id;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { leadNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (productType) where.productType = productType;
    if (source) where.source = source;
    if (assignedToId && currentUser.role !== 'salesperson') {
      where.assignedToId = assignedToId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const validSortFields: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      firstName: 'firstName',
      estimatedValue: 'estimatedValue',
      nextFollowUpDate: 'nextFollowUpDate',
      status: 'status',
      priority: 'priority',
    };

    const orderByField = validSortFields[sortBy] || 'createdAt';

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: LEAD_INCLUDE,
        orderBy: { [orderByField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      success: true,
      data: leads,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Lead Stats ────────────────────────────────────────────────────────────
  async getStats(currentUser: { id: string; role: UserRole }) {
    const baseWhere: Prisma.LeadWhereInput =
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
      this.prisma.lead.count({ where: baseWhere }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
      this.prisma.lead.count({
        where: { ...baseWhere, createdAt: { gte: weekAgo } },
      }),
      this.prisma.lead.aggregate({
        where: {
          ...baseWhere,
          status: { in: ['new', 'contacted', 'qualified', 'quoted'] },
          estimatedValue: { not: null },
        },
        _sum: { estimatedValue: true },
      }),
      this.prisma.leadFollowUp.count({
        where: {
          lead: baseWhere,
          scheduledDate: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
          status: 'pending',
        },
      }),
      this.prisma.leadFollowUp.count({
        where: {
          lead: baseWhere,
          scheduledDate: { lt: today },
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

  // ─── Get Single Lead ───────────────────────────────────────────────────────
  async findOne(id: string, currentUser: { id: string; role: UserRole }) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        ...LEAD_INCLUDE,
        notes: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { scheduledDate: 'asc' },
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
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }

    // Salesperson can only see their assigned leads
    if (
      currentUser.role === 'salesperson' &&
      lead.assignedToId !== currentUser.id
    ) {
      throw new ForbiddenException('Access denied to this lead');
    }

    return lead;
  }

  // ─── Create Lead ───────────────────────────────────────────────────────────
  async create(dto: CreateLeadDto, createdById: string) {
    const leadNumber = await this.generateLeadNumber();

    const lead = await this.prisma.lead.create({
      data: {
        leadNumber,
        firstName: dto.firstName ?? '',
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        alternatePhone: dto.alternatePhone,
        companyName: dto.companyName,
        designation: dto.designation,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city ?? '',
        state: dto.state ?? '',
        pincode: dto.pincode,
        source: dto.source || 'other',
        sourceDetail: dto.sourceDetail,
        priority: dto.priority || 'medium',
        assignedToId: dto.assignedToId,
        estimatedValue: dto.estimatedValue,
        productInterest: dto.productInterest,
        productType: dto.productType,
        requirementNotes: dto.requirementNotes,
        siteInspectionNeeded: dto.siteInspectionNeeded || false,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
        createdById,
      },
      include: LEAD_INCLUDE,
    });

    await this.auditService.log({
      userId: createdById,
      action: 'CREATE',
      entityType: 'leads',
      entityId: lead.id,
      changes: { after: { leadNumber, status: 'new' } },
    });

    return lead;
  }

  // ─── Update Lead ───────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateLeadDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const lead = await this.findOne(id, currentUser);

    // Validate status transitions
    if (dto.status) {
      this.validateStatusTransition(lead.status, dto.status);

      if (dto.status === 'lost' && !dto.lostReason && !lead.lostReason) {
        throw new BadRequestException('Lost reason is required when marking as lost');
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
      },
      include: LEAD_INCLUDE,
    });

    // Auto-create status change note
    if (dto.status && dto.status !== lead.status) {
      await this.prisma.leadNote.create({
        data: {
          leadId: id,
          note: `Status changed from ${lead.status} to ${dto.status}${dto.lostReason ? `. Reason: ${dto.lostReason}` : ''}`,
          noteType: NoteType.status_change,
          createdById: currentUser.id,
        },
      });
    }

    await this.auditService.log({
      userId: currentUser.id,
      action: dto.status ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: 'leads',
      entityId: id,
      changes: { before: { status: lead.status }, after: dto },
    });

    return updated;
  }

  // ─── Assign Lead ───────────────────────────────────────────────────────────
  async assign(
    id: string,
    dto: AssignLeadDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');

    const prevAssignee = lead.assignedToId;

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { assignedToId: dto.assignedToId },
      include: LEAD_INCLUDE,
    });

    await this.prisma.leadNote.create({
      data: {
        leadId: id,
        note: dto.note || `Lead reassigned`,
        noteType: NoteType.status_change,
        createdById: currentUser.id,
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: 'ASSIGN',
      entityType: 'leads',
      entityId: id,
      changes: { before: { assignedToId: prevAssignee }, after: { assignedToId: dto.assignedToId } },
    });

    return updated;
  }

  // ─── Convert Lead ──────────────────────────────────────────────────────────
  async convert(
    id: string,
    dto: ConvertLeadDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const lead = await this.findOne(id, currentUser);

    if (lead.status === 'won') {
      throw new BadRequestException('Lead is already converted');
    }

    if (lead.customer) {
      throw new BadRequestException('Customer already exists for this lead');
    }

    // Generate customer number
    const year = new Date().getFullYear();
    const count = await this.prisma.customer.count({
      where: { customerNumber: { startsWith: `CUS-${year}-` } },
    });
    const customerNumber = `CUS-${year}-${String(count + 1).padStart(4, '0')}`;

    // Transaction: create customer + update lead + create order
    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          customerNumber,
          firstName: lead.firstName,
          lastName: lead.lastName || undefined,
          email: lead.email || undefined,
          phone: lead.phone,
          alternatePhone: lead.alternatePhone || undefined,
          companyName: lead.companyName || undefined,
          designation: lead.designation || undefined,
          addressLine1: lead.addressLine1 || undefined,
          addressLine2: lead.addressLine2 || undefined,
          city: lead.city ?? '',
          state: lead.state ?? '',
          pincode: lead.pincode || undefined,
          leadId: lead.id,
          createdById: currentUser.id,
        },
      });

      // Generate order number
      const orderCount = await tx.order.count({
        where: { orderNumber: { startsWith: `ORD-${year}-` } },
      });
      const orderNumber = `ORD-${year}-${String(orderCount + 1).padStart(4, '0')}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          leadId: lead.id,
          quotationId: dto.quotationId,
          totalAmount: lead.estimatedValue || 0,
          notes: dto.notes,
          createdById: currentUser.id,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          status: LeadStatus.won,
          convertedAt: new Date(),
          convertedById: currentUser.id,
        },
        include: LEAD_INCLUDE,
      });

      await tx.leadNote.create({
        data: {
          leadId: id,
          note: `Lead converted to customer ${customerNumber} and order ${orderNumber} created.`,
          noteType: NoteType.status_change,
          createdById: currentUser.id,
        },
      });

      return { lead: updatedLead, customer, order };
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: 'CONVERT',
      entityType: 'leads',
      entityId: id,
      changes: {
        after: {
          status: 'won',
          customerId: result.customer.id,
          orderId: result.order.id,
        },
      },
    });

    return result;
  }

  // ─── Add Note ──────────────────────────────────────────────────────────────
  async addNote(id: string, dto: CreateLeadNoteDto, createdById: string) {
    await this.prisma.lead.findUniqueOrThrow({ where: { id } });

    return this.prisma.leadNote.create({
      data: {
        leadId: id,
        note: dto.note,
        noteType: (dto.noteType as NoteType) || NoteType.general,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  // ─── Create Follow-up ─────────────────────────────────────────────────────
  async createFollowUp(
    id: string,
    dto: CreateFollowUpDto,
    createdById: string,
  ) {
    await this.prisma.lead.findUniqueOrThrow({ where: { id } });

    const followUp = await this.prisma.leadFollowUp.create({
      data: {
        leadId: id,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTime: dto.scheduledTime,
        description: dto.description,
        assignedToId: dto.assignedToId || createdById,
        createdById,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Update lead's next follow-up date
    await this.prisma.lead.update({
      where: { id },
      data: { nextFollowUpDate: new Date(dto.scheduledDate) },
    });

    return followUp;
  }

  // ─── Today's Follow-ups ───────────────────────────────────────────────────
  async getTodayFollowUps(currentUser: { id: string; role: UserRole }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const where: Prisma.LeadFollowUpWhereInput = {
      scheduledDate: { gte: today, lt: tomorrow },
      status: 'pending',
    };

    if (currentUser.role === 'salesperson') {
      where.assignedToId = currentUser.id;
    }

    return this.prisma.leadFollowUp.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            leadNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
            companyName: true,
            status: true,
          },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  // ─── Status Transition Validation ─────────────────────────────────────────
  private validateStatusTransition(current: LeadStatus, next: LeadStatus) {
    const allowed: Record<LeadStatus, LeadStatus[]> = {
      new: ['contacted', 'lost'],
      contacted: ['qualified', 'lost'],
      qualified: ['quoted', 'lost'],
      quoted: ['won', 'lost'],
      won: [],
      lost: [],
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot move lead from ${current} to ${next}. Allowed: ${allowed[current].join(', ')}`,
      );
    }
  }

  // ─── Update Follow-up ─────────────────────────────────────────────────────
  async updateFollowUp(
    leadId: string,
    followUpId: string,
    data: { status?: string; outcome?: string },
    updatedById: string,
  ) {
    await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    const followUp = await this.prisma.leadFollowUp.findUnique({ where: { id: followUpId } });
    if (!followUp || followUp.leadId !== leadId) {
      throw new NotFoundException('Follow-up not found for this lead');
    }

    return this.prisma.leadFollowUp.update({
      where: { id: followUpId },
      data: {
        status: data.status as any,
        outcome: data.outcome,
        completedAt: data.status === 'completed' ? new Date() : undefined,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Duplicate Phone Check ────────────────────────────────────────────────
  async checkDuplicatePhone(phone: string) {
    const existing = await this.prisma.lead.findFirst({
      where: { phone },
      select: {
        id: true,
        leadNumber: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      isDuplicate: !!existing,
      lead: existing || null,
    };
  }
}
