import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  UpdateOpportunityStageDto,
  OpportunityFilterDto,
} from './dto/opportunity.dto';
import { Prisma, UserRole } from '@prisma/client';

const OPP_INCLUDE = {
  lead: {
    select: { id: true, leadNumber: true, firstName: true, lastName: true, companyName: true, priority: true },
  },
  customer: {
    select: { id: true, customerNumber: true, firstName: true, lastName: true, companyName: true },
  },
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  quotations: {
    select: { id: true, quotationNumber: true, status: true, totalAmount: true },
  },
};

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private async generateOpportunityNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.opportunity.count({
      where: { opportunityNumber: { startsWith: `OPP-${year}-` } },
    });
    return `OPP-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── Pipeline data (grouped by stage) ────────────────────────────────────
  async getPipelineData(currentUser: { id: string; role: UserRole }) {
    const where: Prisma.OpportunityWhereInput = {};

    if (currentUser.role === UserRole.salesperson) {
      where.assignedToId = currentUser.id;
    }

    const opportunities = await this.prisma.opportunity.findMany({
      where,
      include: OPP_INCLUDE,
      orderBy: { dealValue: 'desc' },
    });

    // Group by stage — includes closed_won and closed_lost for the summary column
    const stages = ['prospect', 'discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const pipeline: Record<string, { opportunities: typeof opportunities; totalValue: number }> = {};

    for (const stage of stages) {
      const stageOps = opportunities.filter((o) => o.stage === stage);
      pipeline[stage] = {
        opportunities: stageOps,
        totalValue: stageOps.reduce((sum, o) => sum + Number(o.dealValue || 0), 0),
      };
    }

    return pipeline;
  }

  // ─── List ────────────────────────────────────────────────────────────────
  async findAll(
    filters: OpportunityFilterDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const { page = 1, limit = 50, stage, assignedToId } = filters;

    const where: Prisma.OpportunityWhereInput = {};
    if (currentUser.role === UserRole.salesperson) {
      where.assignedToId = currentUser.id;
    }
    if (stage) where.stage = stage;
    if (assignedToId && currentUser.role !== UserRole.salesperson) {
      where.assignedToId = assignedToId;
    }

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        include: OPP_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Find One ─────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id },
      include: OPP_INCLUDE,
    });
    if (!opp) throw new NotFoundException(`Opportunity ${id} not found`);
    return opp;
  }

  // ─── Create ──────────────────────────────────────────────────────────────
  async create(
    dto: CreateOpportunityDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const opportunityNumber = await this.generateOpportunityNumber();

    const opp = await this.prisma.opportunity.create({
      data: {
        opportunityNumber,
        leadId: dto.leadId,
        title: dto.title,
        stage: dto.stage ?? 'prospect',
        dealValue: dto.dealValue,
        probability: dto.probability ?? 10,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
        assignedToId: dto.assignedToId || currentUser.id,
        notes: dto.notes,
        createdById: currentUser.id,
      },
      include: OPP_INCLUDE,
    });

    await this.auditService.log({
      entityType: 'opportunity',
      entityId: opp.id,
      action: 'create',
      userId: currentUser.id,
    });

    return opp;
  }

  // ─── Update ──────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateOpportunityDto, currentUser: { id: string }) {
    await this.findOne(id);

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        ...dto,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
      },
      include: OPP_INCLUDE,
    });

    await this.auditService.log({
      entityType: 'opportunity',
      entityId: id,
      action: 'update',
      userId: currentUser.id,
    });

    return updated;
  }

  // ─── Update Stage ─────────────────────────────────────────────────────────
  async updateStage(
    id: string,
    dto: UpdateOpportunityStageDto,
    currentUser: { id: string },
  ) {
    const opp = await this.findOne(id);

    if (dto.stage === 'closed_lost' && !dto.lostReason) {
      throw new BadRequestException('Lost reason is required when closing as lost');
    }

    const updateData: Prisma.OpportunityUpdateInput = {
      stage: dto.stage,
      probability: dto.probability,
    };

    if (['closed_won', 'closed_lost'].includes(dto.stage)) {
      updateData.actualCloseDate = new Date();
    }
    if (dto.stage === 'closed_lost') {
      updateData.lostReason = dto.lostReason;
      updateData.probability = 0;
    }
    if (dto.stage === 'closed_won') {
      updateData.probability = 100;
    }

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: OPP_INCLUDE,
    });

    // ── Sync parent Lead status to match the opportunity outcome ──────────
    if (updated.leadId) {
      let leadStatus: string | null = null;
      if (dto.stage === 'closed_won') leadStatus = 'won';
      else if (dto.stage === 'closed_lost') leadStatus = 'lost';
      else if (['prospect', 'discovery', 'proposal', 'negotiation'].includes(dto.stage)) {
        // Re-opened from closed → put lead back in qualified
        leadStatus = 'qualified';
      }
      if (leadStatus) {
        await this.prisma.lead.update({
          where: { id: updated.leadId },
          data: { status: leadStatus as any },
        });
      }
    }

    await this.auditService.log({
      entityType: 'opportunity',
      entityId: id,
      action: 'status_change',
      userId: currentUser.id,
      changes: { before: opp.stage, after: dto.stage },
    });

    return updated;
  }
}
