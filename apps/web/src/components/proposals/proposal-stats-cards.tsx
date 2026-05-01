'use client';

import { useQuery } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { FileText, CheckCircle2, XCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function StatCard({ label, value, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card flex items-start gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
        <Icon className={cn('w-4.5 h-4.5', color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className={cn('text-lg font-bold mt-0.5', color)}>{value}</p>
      </div>
    </div>
  );
}

export function ProposalStatsCards() {
  const { data } = useQuery({
    queryKey: ['proposal-stats'],
    queryFn: () => proposalsApi.stats(),
    staleTime: 30_000,
  });

  const stats = data?.data?.data;
  if (!stats) return null;

  const cards: StatCardProps[] = [
    {
      label: 'Total Proposals',
      value: stats.total ?? 0,
      icon: FileText,
      color: 'text-sky-600',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(stats.pipelineValue ?? 0),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Accepted',
      value: stats.byStatus?.accepted ?? 0,
      icon: CheckCircle2,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Pending / Sent',
      value: (stats.byStatus?.draft ?? 0) + (stats.byStatus?.sent ?? 0),
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Rejected',
      value: stats.byStatus?.rejected ?? 0,
      icon: XCircle,
      color: (stats.byStatus?.rejected ?? 0) > 0 ? 'text-red-600' : 'text-muted-foreground',
      bg: (stats.byStatus?.rejected ?? 0) > 0 ? 'bg-red-500/10' : 'bg-muted',
    },
    {
      label: "Today's Follow-ups",
      value: stats.todayFollowUps ?? 0,
      icon: Clock,
      color: (stats.todayFollowUps ?? 0) > 0 ? 'text-sky-600' : 'text-muted-foreground',
      bg: (stats.todayFollowUps ?? 0) > 0 ? 'bg-sky-500/10' : 'bg-muted',
    },
    {
      label: 'Overdue Follow-ups',
      value: stats.overdueFollowUps ?? 0,
      icon: AlertCircle,
      color: (stats.overdueFollowUps ?? 0) > 0 ? 'text-red-600' : 'text-muted-foreground',
      bg: (stats.overdueFollowUps ?? 0) > 0 ? 'bg-red-500/10' : 'bg-muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
