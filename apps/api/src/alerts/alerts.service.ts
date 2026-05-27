import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert.dto';
import { handlePrismaError } from '../common/utils/prisma-error.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  // ─── Alert Logs ────────────────────────────────────────────────────────────
  async findLogs(status?: string) {
    const where: Prisma.AlertLogWhereInput = {};
    if (status) where.status = status as any;

    const data = await this.prisma.alertLog.findMany({
      where,
      include: {
        product: { select: { id: true, productCode: true, name: true, categoryName: true } },
        rule: { select: { id: true, ruleName: true, ruleType: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { triggeredAt: 'desc' },
      take: 200,
    });
    return { success: true, data };
  }

  async findOpenAlerts() {
    return this.findLogs('open');
  }

  async acknowledgeAlert(id: string) {
    const log = await this.prisma.alertLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Alert log ${id} not found`);
    const updated = await this.prisma.alertLog.update({
      where: { id },
      data: { status: 'acknowledged' },
    });
    return { success: true, data: updated };
  }

  async resolveAlert(id: string, userId: string) {
    const log = await this.prisma.alertLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException(`Alert log ${id} not found`);
    const updated = await this.prisma.alertLog.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date(), resolvedById: userId },
    });
    return { success: true, data: updated };
  }

  // ─── Alert Rules ───────────────────────────────────────────────────────────
  async findRules(isActive?: boolean) {
    const where: Prisma.AlertRuleWhereInput = {};
    if (isActive !== undefined) where.isActive = isActive;

    const data = await this.prisma.alertRule.findMany({
      where,
      include: {
        product: { select: { id: true, productCode: true, name: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { alertLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data };
  }

  async findOneRule(id: string) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, productCode: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    if (!rule) throw new NotFoundException(`Alert rule ${id} not found`);
    return { success: true, data: rule };
  }

  async createRule(dto: CreateAlertRuleDto) {
    try {
      const rule = await this.prisma.alertRule.create({
        data: {
          ruleName: dto.ruleName,
          ruleType: dto.ruleType as any,
          productId: dto.productId ?? null,
          categoryId: dto.categoryId ?? null,
          thresholdValue: dto.thresholdValue !== undefined ? new Prisma.Decimal(dto.thresholdValue) : null,
          notifyChannels: dto.notifyChannels ?? ['in_app'],
          notifyUserIds: dto.notifyUserIds ?? [],
          autoCreatePo: dto.autoCreatePo ?? false,
          escalateAfterHrs: dto.escalateAfterHrs ?? 24,
          isActive: true,
        },
      });
      return { success: true, data: rule };
    } catch (e) {
      handlePrismaError(e);
    }
  }

  async updateRule(id: string, dto: UpdateAlertRuleDto) {
    const rule = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`Alert rule ${id} not found`);
    try {
      const updated = await this.prisma.alertRule.update({
        where: { id },
        data: {
          ...(dto.ruleName !== undefined && { ruleName: dto.ruleName }),
          ...(dto.thresholdValue !== undefined && { thresholdValue: new Prisma.Decimal(dto.thresholdValue) }),
          ...(dto.notifyChannels !== undefined && { notifyChannels: dto.notifyChannels }),
          ...(dto.autoCreatePo !== undefined && { autoCreatePo: dto.autoCreatePo }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.escalateAfterHrs !== undefined && { escalateAfterHrs: dto.escalateAfterHrs }),
        },
      });
      return { success: true, data: updated };
    } catch (e) {
      handlePrismaError(e);
    }
  }

  async deleteRule(id: string) {
    const rule = await this.prisma.alertRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException(`Alert rule ${id} not found`);
    await this.prisma.alertRule.delete({ where: { id } });
    return { success: true, message: 'Alert rule deleted' };
  }

  // ─── Open alert count (for badges) ────────────────────────────────────────
  async getOpenCount() {
    const count = await this.prisma.alertLog.count({ where: { status: 'open' } });
    return { success: true, data: { count } };
  }
}
