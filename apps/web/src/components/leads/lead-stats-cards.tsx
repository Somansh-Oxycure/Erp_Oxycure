'use client';

import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  DollarSign,
  CalendarClock,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  newThisWeek: number;
  conversionRate: number;
  pipelineValue: number | string;
  todayFollowUps: number;
  overdueFollowUps: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

export function LeadStatsCards() {
  const { data: response, isLoading } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => leadsApi.stats(),
    refetchInterval: 60000,
  });

  const stats: LeadStats | undefined = response?.data?.data;

  const cards = [
    {
      title: 'Total Leads',
      value: stats?.total ?? '—',
      sub: `${stats?.newThisWeek ?? 0} new this week`,
      subIcon: TrendingUp,
      subColor: 'text-emerald-600',
      icon: Users,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      border: 'border-sky-100',
    },
    {
      title: 'Pipeline Value',
      value: stats ? formatCurrency(stats.pipelineValue) : '—',
      sub: `${(stats?.byStatus?.qualified ?? 0) + (stats?.byStatus?.quoted ?? 0)} active`,
      subIcon: ArrowUpRight,
      subColor: 'text-blue-600',
      icon: DollarSign,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      title: 'Conversion Rate',
      value: stats ? `${stats.conversionRate}%` : '—',
      sub: `${stats?.byStatus?.won ?? 0} won vs ${stats?.byStatus?.lost ?? 0} lost`,
      subIcon: stats && stats.conversionRate >= 20 ? TrendingUp : TrendingDown,
      subColor: stats && stats.conversionRate >= 20 ? 'text-emerald-600' : 'text-amber-600',
      icon: Zap,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      border: 'border-violet-100',
    },
    {
      title: "Today's Follow-ups",
      value: stats?.todayFollowUps ?? '—',
      sub: stats?.overdueFollowUps
        ? `${stats.overdueFollowUps} overdue`
        : 'All on track',
      subIcon: CalendarClock,
      subColor: stats?.overdueFollowUps ? 'text-red-600' : 'text-emerald-600',
      icon: CalendarClock,
      iconBg: stats?.overdueFollowUps ? 'bg-red-50' : 'bg-amber-50',
      iconColor: stats?.overdueFollowUps ? 'text-red-600' : 'text-amber-600',
      border: stats?.overdueFollowUps ? 'border-red-100' : 'border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          custom={i}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div
            className={cn(
              'bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all duration-300 group cursor-default',
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.iconBg)}>
                <card.icon className={cn('w-5 h-5', card.iconColor)} />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
            </div>

            <div className="space-y-1">
              {isLoading ? (
                <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-3xl font-bold text-foreground tabular-nums">{card.value}</p>
              )}

              <div className={cn('flex items-center gap-1 text-xs font-medium', card.subColor)}>
                <card.subIcon className="w-3 h-3" />
                <span>{card.sub}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Mini status bar ──────────────────────────────────────────────────────────
export function LeadStatusBar({ stats }: { stats: LeadStats | undefined }) {
  if (!stats) return null;

  const statuses = [
    { key: 'new', label: 'New', color: 'bg-blue-500' },
    { key: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
    { key: 'qualified', label: 'Qualified', color: 'bg-violet-500' },
    { key: 'quoted', label: 'Quoted', color: 'bg-cyan-500' },
    { key: 'won', label: 'Won', color: 'bg-emerald-500' },
    { key: 'lost', label: 'Lost', color: 'bg-red-400' },
  ];

  const total = stats.total || 1;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Lead Distribution</p>
        <p className="text-xs text-muted-foreground">{stats.total} total</p>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
        {statuses.map((s) => {
          const count = stats.byStatus[s.key] || 0;
          const pct = (count / total) * 100;
          return pct > 0 ? (
            <div
              key={s.key}
              className={cn('h-full rounded-full transition-all', s.color)}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${count}`}
            />
          ) : null;
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {statuses.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={cn('w-2 h-2 rounded-full', s.color)} />
            <span>{s.label}</span>
            <span className="font-semibold text-foreground">{stats.byStatus[s.key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
