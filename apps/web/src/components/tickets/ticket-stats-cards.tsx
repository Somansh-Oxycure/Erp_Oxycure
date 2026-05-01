'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
  href?: string;
}

function StatCard({ label, value, icon: Icon, color, bg, href }: StatCardProps) {
  const inner = (
    <div className={cn('p-4 rounded-xl border border-border bg-card flex items-start gap-3 hover:bg-accent/50 transition-colors', href && 'cursor-pointer')}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
        <Icon className={cn('w-4.5 h-4.5', color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className={cn('text-lg font-bold mt-0.5', color)}>{value}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function TicketStatsCards() {
  const { data } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => ticketsApi.stats(),
    staleTime: 30_000,
  });

  const stats = data?.data?.data;
  if (!stats) return null;

  const cards: StatCardProps[] = [
    {
      label: 'Total Tickets',
      value: stats.total ?? 0,
      icon: Users,
      color: 'text-sky-600',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'New This Week',
      value: stats.newThisWeek ?? 0,
      icon: TrendingUp,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(stats.pipelineValue ?? 0),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} />
      ))}
    </div>
  );
}
