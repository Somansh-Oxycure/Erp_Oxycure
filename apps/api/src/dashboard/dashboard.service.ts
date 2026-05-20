import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, UserRole } from '@prisma/client';

type RequestUser = { id: string; role: UserRole };

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function subDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ─── KPI Summary ──────────────────────────────────────────────────────────
  async getSummary(user: RequestUser) {
    const ticketWhere =
      user.role === 'salesperson' ? { assignedToId: user.id } : {};

    const openTicketStatuses: TicketStatus[] = [
      TicketStatus.new, TicketStatus.contacted, TicketStatus.site_inspection,
      TicketStatus.design_review, TicketStatus.quoted,
    ];

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekAgo = subDays(now, 7);

    const [
      openTickets,
      pipelineAgg,
      openTicketsWeekAgo,
      todayFollowUps,
      overdueFollowUps,
      openQuotations,
      openQuotationsWeekAgo,
      ordersInProgress,
      ordersWeekAgo,
      lowStockAlerts,
      pendingPurchaseOrders,
    ] = await Promise.all([
      // 1. Open tickets
      this.prisma.ticket.count({
        where: { ...ticketWhere, status: { in: openTicketStatuses } },
      }),
      // 2. Pipeline value
      this.prisma.ticket.aggregate({
        where: {
          ...ticketWhere,
          status: { in: openTicketStatuses },
          estimatedValue: { not: null },
        },
        _sum: { estimatedValue: true },
      }),
      // 3. Open tickets a week ago (for trend)
      this.prisma.ticket.count({
        where: {
          ...ticketWhere,
          status: { in: openTicketStatuses },
          createdAt: { lte: weekAgo },
        },
      }),
      // 4. Today's follow-ups (proposal)
      this.prisma.proposalFollowUp.count({
        where: {
          scheduledAt: { gte: todayStart, lte: todayEnd },
          status: 'pending',
        },
      }),
      // 5. Overdue follow-ups
      this.prisma.proposalFollowUp.count({
        where: {
          scheduledAt: { lt: todayStart },
          status: 'pending',
        },
      }),
      // 6. Open quotations (not accepted/rejected/expired)
      this.prisma.quotation.count({
        where: { status: { notIn: ['accepted', 'rejected', 'expired'] } },
      }),
      // 7. Open quotations a week ago (trend)
      this.prisma.quotation.count({
        where: {
          status: { notIn: ['accepted', 'rejected', 'expired'] },
          createdAt: { lte: weekAgo },
        },
      }),
      // 8. Orders in progress
      this.prisma.order.count({
        where: { status: { notIn: ['completed', 'cancelled'] } },
      }),
      // 9. Orders in progress a week ago (trend)
      this.prisma.order.count({
        where: {
          status: { notIn: ['completed', 'cancelled'] },
          createdAt: { lte: weekAgo },
        },
      }),
      // 10. Low stock alerts (open alert logs)
      this.prisma.alertLog.count({ where: { status: 'open' } }),
      // 11. Pending POs
      this.prisma.purchaseOrder.count({
        where: { status: { in: ['draft', 'sent'] } },
      }),
    ]);

    const trendPct = (current: number, previous: number) => {
      if (previous === 0) return { value: 0, direction: 'up' as const };
      const diff = ((current - previous) / previous) * 100;
      return { value: Math.abs(Math.round(diff)), direction: diff >= 0 ? 'up' as const : 'down' as const };
    };

    return {
      success: true,
      data: {
        openTickets,
        pipelineValue: Number(pipelineAgg._sum?.estimatedValue ?? 0),
        todayFollowUps,
        overdueFollowUps,
        openQuotations,
        ordersInProgress,
        lowStockAlerts,
        pendingPurchaseOrders,
        trends: {
          openTickets: trendPct(openTickets, openTicketsWeekAgo),
          openQuotations: trendPct(openQuotations, openQuotationsWeekAgo),
          ordersInProgress: trendPct(ordersInProgress, ordersWeekAgo),
        },
      },
    };
  }

  // ─── Pipeline: tickets grouped by stage ──────────────────────────────────
  async getPipeline(user: RequestUser) {
    const ticketWhere =
      user.role === 'salesperson' ? { assignedToId: user.id } : {};

    const stages: TicketStatus[] = [
      TicketStatus.new, TicketStatus.contacted, TicketStatus.site_inspection,
      TicketStatus.design_review, TicketStatus.quoted,
    ];

    const results = await Promise.all(
      stages.map(async (stage) => {
        const [count, agg] = await Promise.all([
          this.prisma.ticket.count({ where: { ...ticketWhere, status: stage } }),
          this.prisma.ticket.aggregate({
            where: { ...ticketWhere, status: stage, estimatedValue: { not: null } },
            _sum: { estimatedValue: true },
          }),
        ]);
        return {
          stage,
          count,
          value: Number(agg._sum?.estimatedValue ?? 0),
        };
      }),
    );

    return { success: true, data: results };
  }

  // ─── Quotation Funnel ─────────────────────────────────────────────────────
  async getQuotationFunnel() {
    const [totalSent, totalAccepted, total] = await Promise.all([
      this.prisma.quotation.count({ where: { status: { not: 'draft' } } }),
      this.prisma.quotation.count({ where: { status: 'accepted' } }),
      this.prisma.quotation.count(),
    ]);

    const conversionRate =
      totalSent > 0 ? (totalAccepted / totalSent) * 100 : 0;

    return {
      success: true,
      data: {
        totalSent,
        totalViewed: totalSent, // no explicit "viewed" tracking; use sent
        totalConverted: totalAccepted,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
    };
  }

  // ─── Orders Activity (last N days) ────────────────────────────────────────
  async getOrdersActivity(days = 30) {
    const from = subDays(new Date(), days);

    const [placed, fulfilled] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      this.prisma.order.findMany({
        where: {
          status: 'completed',
          updatedAt: { gte: from },
        },
        select: { updatedAt: true },
      }),
    ]);

    // Build a day-by-day map
    const map: Record<string, { placed: number; fulfilled: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = toISODate(subDays(new Date(), i));
      map[d] = { placed: 0, fulfilled: 0 };
    }

    placed.forEach((o) => {
      const d = toISODate(o.createdAt);
      if (map[d]) map[d].placed++;
    });
    fulfilled.forEach((o) => {
      const d = toISODate(o.updatedAt);
      if (map[d]) map[d].fulfilled++;
    });

    const data = Object.entries(map).map(([date, v]) => ({ date, ...v }));
    return { success: true, data };
  }

  // ─── Recent Activity (audit log) ─────────────────────────────────────────
  async getRecentActivity(limit = 10) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const data = logs.map((log) => ({
      id: log.id,
      module: log.entityType.toLowerCase().replace(/s$/, ''),
      description: `${log.user?.firstName ?? 'System'} ${log.user?.lastName ?? ''} ${log.action.toLowerCase().replace('_', ' ')} a ${log.entityType.toLowerCase().replace(/s$/, '')}`,
      createdAt: log.createdAt.toISOString(),
    }));

    return { success: true, data };
  }
}
