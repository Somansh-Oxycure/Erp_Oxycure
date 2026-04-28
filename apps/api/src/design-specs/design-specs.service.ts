import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateDesignSpecDto,
  UpdateDesignSpecDto,
  UpdateDesignSpecStatusDto,
  CreateQuotationFromSpecDto,
  DesignSpecFilterDto,
} from './dto/design-spec.dto';
import { DesignSpecStatus, Prisma, UserRole } from '@prisma/client';

const SPEC_INCLUDE = {
  lead: {
    select: {
      id: true,
      leadNumber: true,
      firstName: true,
      lastName: true,
      companyName: true,
      phone: true,
      status: true,
      productType: true,
    },
  },
  customer: {
    select: { id: true, customerNumber: true, firstName: true, lastName: true, companyName: true },
  },
  designedBy: {
    select: { id: true, firstName: true, lastName: true, role: true },
  },
  reviewedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  siteInspectionBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  quotation: {
    select: { id: true, quotationNumber: true, status: true, totalAmount: true },
  },
};

@Injectable()
export class DesignSpecsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private async generateSpecNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.designSpecification.count({
      where: { specNumber: { startsWith: `DSG-${year}-` } },
    });
    return `DSG-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── List ──────────────────────────────────────────────────────────────────
  async findAll(
    filters: DesignSpecFilterDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const { page = 1, limit = 20, status, productType, ticketId } = filters;

    const where: Prisma.DesignSpecificationWhereInput = {};

    // Design engineers see only their assigned specs
    if (currentUser.role === UserRole.design_engineer) {
      where.designedById = currentUser.id;
    }

    if (status) where.status = status;
    if (productType) where.productType = productType;
    if (ticketId) where.ticketId = ticketId;

    const [data, total] = await Promise.all([
      this.prisma.designSpecification.findMany({
        where,
        include: SPEC_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.designSpecification.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── My Queue (Design Engineers) ─────────────────────────────────────────
  async getMyQueue(currentUser: { id: string }) {
    return this.prisma.designSpecification.findMany({
      where: {
        designedById: currentUser.id,
        status: { in: ['requested', 'in_progress', 'revision_needed'] },
      },
      include: SPEC_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Pending Review (Managers) ────────────────────────────────────────────
  async getPending() {
    return this.prisma.designSpecification.findMany({
      where: { status: 'completed' },
      include: SPEC_INCLUDE,
      orderBy: { updatedAt: 'asc' },
    });
  }

  // ─── Find One ─────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const spec = await this.prisma.designSpecification.findUnique({
      where: { id },
      include: SPEC_INCLUDE,
    });
    if (!spec) throw new NotFoundException(`Design spec ${id} not found`);
    return spec;
  }

  // ─── Create ──────────────────────────────────────────────────────────────
  async create(
    dto: CreateDesignSpecDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const specNumber = await this.generateSpecNumber();

    const spec = await this.prisma.designSpecification.create({
      data: {
        specNumber,
        ticketId: dto.ticketId,
        productType: dto.productType,
        requirementSummary: dto.requirementSummary,
        siteAreaSqft: dto.siteAreaSqft,
        siteType: dto.siteType,
        siteEnvironment: dto.siteEnvironment,
        powerAvailability: dto.powerAvailability,
        specialRequirements: dto.specialRequirements,
        createdById: currentUser.id,
        status: 'requested',
      },
      include: SPEC_INCLUDE,
    });

    await this.auditService.log({
      entityType: 'design_specification',
      entityId: spec.id,
      action: 'create',
      userId: currentUser.id,
    });

    return spec;
  }

  // ─── Update ──────────────────────────────────────────────────────────────
  async update(
    id: string,
    dto: UpdateDesignSpecDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const spec = await this.findOne(id);

    // Assign design engineer if not already assigned
    const updateData: Prisma.DesignSpecificationUpdateInput = { ...dto };
    if (!spec.designedById && currentUser.role === UserRole.design_engineer) {
      updateData.designedBy = { connect: { id: currentUser.id } };
      // Auto-move to in_progress when design engineer starts working
      if (spec.status === 'requested') {
        updateData.status = 'in_progress';
      }
    }

    // Set siteInspectionBy when marking inspection done
    if (dto.siteInspectionDone && !spec.siteInspectionById) {
      updateData.siteInspectionBy = { connect: { id: currentUser.id } };
    }

    const updated = await this.prisma.designSpecification.update({
      where: { id },
      data: updateData,
      include: SPEC_INCLUDE,
    });

    await this.auditService.log({
      entityType: 'design_specification',
      entityId: id,
      action: 'update',
      userId: currentUser.id,
    });

    return updated;
  }

  // ─── Update Status ───────────────────────────────────────────────────────
  async updateStatus(
    id: string,
    dto: UpdateDesignSpecStatusDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const spec = await this.findOne(id);

    // Validate transitions
    const validTransitions: Record<string, string[]> = {
      requested: ['in_progress'],
      in_progress: ['completed'],
      completed: ['approved', 'revision_needed'],
      revision_needed: ['in_progress'],
      approved: [],
    };

    const allowed = validTransitions[spec.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from "${spec.status}" to "${dto.status}"`,
      );
    }

    // Only managers/admins can approve
    if (dto.status === 'approved') {
      if (!([UserRole.admin, UserRole.manager] as UserRole[]).includes(currentUser.role)) {
        throw new ForbiddenException('Only managers or admins can approve design specs');
      }
    }

    const updateData: Prisma.DesignSpecificationUpdateInput = {
      status: dto.status,
      revisionNotes: dto.revisionNotes,
    };

    if (dto.status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.reviewedBy = { connect: { id: currentUser.id } };
    }

    const updated = await this.prisma.designSpecification.update({
      where: { id },
      data: updateData,
      include: SPEC_INCLUDE,
    });

    await this.auditService.log({
      entityType: 'design_specification',
      entityId: id,
      action: 'status_change',
      userId: currentUser.id,
      changes: { before: spec.status, after: dto.status },
    });

    return updated;
  }

  // ─── Create Quotation from Spec ──────────────────────────────────────────
  async createQuotationFromSpec(
    id: string,
    dto: CreateQuotationFromSpecDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const spec = await this.findOne(id);

    if (spec.status !== 'approved') {
      throw new BadRequestException(
        'Can only create quotation from an approved design spec',
      );
    }

    if (spec.quotationId) {
      throw new BadRequestException('A quotation already exists for this design spec');
    }

    // Generate quotation number
    const year = new Date().getFullYear();
    const qtCount = await this.prisma.quotation.count({
      where: { quotationNumber: { startsWith: `QT-${year}-` } },
    });
    const quotationNumber = `QT-${year}-${String(qtCount + 1).padStart(4, '0')}`;

    // Build line items from recommended products
    const recommendedProducts = (spec.recommendedProducts as any[]) || [];
    const items = recommendedProducts.map((p: any, idx: number) => ({
      productName: p.product_name || p.productName || 'Product',
      description: p.specs || p.description || '',
      quantity: p.quantity || 1,
      unitPrice: p.unit_price || p.unitPrice || 0,
      discountPercent: 0,
      taxPercent: 18,
      totalPrice:
        (p.quantity || 1) * (p.unit_price || p.unitPrice || 0),
      sortOrder: idx + 1,
    }));

    const subtotal = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
    const taxAmount = items.reduce(
      (sum, i) => sum + (Number(i.totalPrice) * Number(i.taxPercent)) / 100,
      0,
    );
    const totalAmount = subtotal + taxAmount;

    const quotation = await this.prisma.$transaction(async (tx) => {
      const qt = await tx.quotation.create({
        data: {
          quotationNumber,
          customerId: dto.customerId,
          ticketId: spec.ticketId,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          notes: dto.notes,
          termsAndConditions: dto.termsAndConditions,
          createdById: currentUser.id,
          items: { create: items },
        },
      });

      // Link spec to quotation
      await tx.designSpecification.update({
        where: { id },
        data: { quotationId: qt.id },
      });

      return qt;
    });

    await this.auditService.log({
      entityType: 'quotation',
      entityId: quotation.id,
      action: 'create',
      userId: currentUser.id,
    });

    return quotation;
  }
}
