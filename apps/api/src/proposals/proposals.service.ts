import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { handlePrismaError } from '../common/utils/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProposalFilterDto, UpdateProposalStatusDto, UpdateProposalDto, AddProposalItemDto, CreateProposalFollowUpDto, UpdateProposalFollowUpDto, AddProposalNoteDto, GenerateProposalDto } from './dto/proposal.dto';
import { Prisma, ProposalStatus, UserRole } from '@prisma/client';
import { extname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

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

  // ─── Generate & Save Proposal .docx (linked to a proposal record) ────────
  async generateAndSave(
    id: string,
    dto: GenerateProposalDto,
    currentUser: { id: string; role: UserRole },
  ): Promise<Buffer> {
    const proposal = await this.findOne(id);

    const buffer = await this.generateDocument(dto);

    // Persist file to disk
    ProposalsService.ensureUploadDir();
    const refSlug = (proposal.ticket?.referenceId || id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${refSlug}.docx`;
    const filePath = join(process.cwd(), 'uploads', 'proposals', filename);
    writeFileSync(filePath, buffer);

    const documentUrl = `/uploads/proposals/${filename}`;
    const documentOriginalName = `${dto.ref_number || refSlug}.docx`;

    await this.prisma.proposal.update({
      where: { id },
      data: {
        documentUrl,
        documentOriginalName,
        generateFormData: dto as unknown as Prisma.InputJsonValue,
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: 'GENERATE',
      entityType: 'proposals',
      entityId: id,
      changes: { after: { documentUrl } },
    });

    return buffer;
  }

  // ─── Ensure upload directory exists ───────────────────────────────────────
  static ensureUploadDir() {
    const dir = join(process.cwd(), 'uploads', 'proposals');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // ─── Generate Proposal .docx from template ────────────────────────────────
  async generateDocument(dto: GenerateProposalDto): Promise<Buffer> {
    // Support both v2 (dynamic units) and legacy v1 template
    const templatePath =
      existsSync(join(process.cwd(), 'templates', 'proposal-v2.docx'))
        ? join(process.cwd(), 'templates', 'proposal-v2.docx')
        : join(process.cwd(), 'templates', 'proposal.docx');
    if (!existsSync(templatePath)) {
      throw new InternalServerErrorException(
        'Proposal template not found. Please run the template generation script first.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PizZip = require('pizzip');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Docxtemplater = require('docxtemplater');

    const content = readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    let doc: { render: (data: unknown) => void; getZip: () => { generate: (opts: unknown) => Buffer } };
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
    } catch (err: unknown) {
      const e = err as Error;
      throw new InternalServerErrorException(`Template parsing error: ${e.message}`);
    }

    // Build items with formatted amount (description comes from the selected unit)
    const items = (dto.items || []).map((item, index) => ({
      ...item,
      sno: index + 1,
      description: item.description || '',
      amount_formatted: (item.quantity * item.amount).toLocaleString('en-IN'),
    }));

    const itemsTotal = items.reduce((sum, i) => sum + i.quantity * i.amount, 0);
    const freightAmount = dto.freight_amount ?? 0;
    const specialDiscount = dto.special_discount ?? 0;
    const projectDiscount = dto.project_discount ?? 0;
    const totalProjectValue =
      dto.total_project_value ?? itemsTotal + freightAmount - specialDiscount - projectDiscount;
    const totalSupplyQty = items.reduce((sum, i) => sum + Number(i.quantity), 0);

    // ── Hardcoded company defaults (not exposed in form) ──────────────────
    const ABOUT_US =
      'O2Cure stands as a flagship brand, wholly dedicated to enhancing lives by purifying the Earth\'s most essential element: Air. We\'re dedicated to enhancing lives through advanced air purification. Our tailored solutions prioritize indoor air quality, considering factors like area type, pollutants, health, and environment. Our products use both Passive and Active Purification Technologies with global certifications to eliminate pollutants from 10 microns to 0.001 microns.';

    const FOOTER_NOTE_1 =
      'If you have any suggestions/complaints, please feel free to write to us.';
    const FOOTER_NOTE_2 =
      'We hope our offer is in line with your requirement. For any further clarification please feel free to contact the undersigned.';

    const gstPct = dto.gst_percentage ?? 18;

    const data = {
      ...dto,
      items,
      // Computed totals
      total_supply_qty: totalSupplyQty,
      total_supply_amount: itemsTotal.toLocaleString('en-IN'),
      total_qty: totalSupplyQty,
      items_total: itemsTotal.toLocaleString('en-IN'),
      freight_amount: freightAmount.toLocaleString('en-IN'),
      special_discount: specialDiscount.toLocaleString('en-IN'),
      project_discount: projectDiscount.toLocaleString('en-IN'),
      total_project_value: totalProjectValue.toLocaleString('en-IN'),
      // Terms defaults (overridable via dto)
      gst_percentage: gstPct,
      gst_text: dto.gst_text ?? `GST Shall be ${gstPct}% Extra.`,
      price_basis: dto.price_basis ?? 'Ex-Works, Gurugram (Haryana)',
      installation_included: dto.installation_included ?? 'Included',
      freight_included: dto.freight_included ?? 'Included',
      freight_terms: dto.freight_terms ?? 'Okay',
      third_party_insurance: dto.third_party_insurance ?? 'Okay',
      car_policy: dto.car_policy ?? 'Okay',
      water_electricity: dto.water_electricity ?? 'Okay',
      payment_note: dto.payment_note ?? 'Kindly ensure that the ABG amount shall be released within 7 days of the supply of the units.',
      billing_delivery_note: dto.billing_delivery_note ?? 'Billing & Delivery Address Shall Be Mentioned in Your Purchase Order',
      site_person_details: dto.site_person_details ?? '',
      validity_days: dto.validity_days ?? 30,
      // Hardcoded company content
      about_us: ABOUT_US,
      footer_note_1: FOOTER_NOTE_1,
      footer_note_2: FOOTER_NOTE_2,
    };

    try {
      doc.render(data);
    } catch (err: unknown) {
      const e = err as { properties?: { errors?: unknown[] }; message: string };
      if (e.properties?.errors?.length) {
        throw new InternalServerErrorException(
          `Template render error: ${JSON.stringify(e.properties.errors)}`,
        );
      }
      throw new InternalServerErrorException(`Document generation failed: ${e.message}`);
    }

    return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
  }
}
