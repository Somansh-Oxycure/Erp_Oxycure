'use client';

import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import { Clock, TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgingEntry = {
  status: string;
  enteredAt: string;
  exitedAt: string | null;
  durationMs: string;
  durationDays: number;
  isActive: boolean;
  changedBy: { firstName: string; lastName: string } | null;
};

type AgingData = {
  ticketId: string;
  referenceId: string;
  currentStatus: string;
  createdAt: string;
  totalAgeDays: number;
  statusHistory: AgingEntry[];
};

// ─── Status colour palette ────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; bar: string; badge: string; dot: string }
> = {
  new: {
    label: 'New',
    bar: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  contacted: {
    label: 'Contacted',
    bar: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  site_inspection: {
    label: 'Site Inspection',
    bar: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  design_review: {
    label: 'Design Review',
    bar: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  quoted: {
    label: 'Quoted',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  won: {
    label: 'Won',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  lost: {
    label: 'Lost',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
};

const meta = (status: string) =>
  STATUS_META[status] ?? {
    label: status,
    bar: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(days: number): string {
  if (days < 1 / 24) {
    const mins = Math.round(days * 24 * 60);
    return `${mins}m`;
  }
  if (days < 1) {
    const hrs = Math.round(days * 24);
    return `${hrs}h`;
  }
  if (days < 2) return '1 day';
  return `${Math.round(days)} days`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TicketAgingTimeline({ ticketId }: { ticketId: string }) {
  const { data, isLoading, isError } = useQuery<{ data: { data: AgingData } }>({
    queryKey: ['ticket-aging', ticketId],
    queryFn: () => ticketsApi.aging(ticketId),
    enabled: !!ticketId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-card border border-border animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-3 w-full bg-muted rounded" />
      </div>
    );
  }

  if (isError || !data?.data?.data) return null;

  const aging = data.data.data;
  const history = aging.statusHistory;

  // Total days for percentage calculation — at least 0.01 to avoid /0
  const totalDays = Math.max(aging.totalAgeDays, 0.01);

  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-semibold text-foreground">Ticket Aging</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Total age:{' '}
          <span className="text-foreground font-semibold">
            {formatDuration(aging.totalAgeDays)}
          </span>
        </span>
      </div>

      {/* Stacked progress bar */}
      <div className="relative flex w-full h-3 rounded-full overflow-hidden bg-muted gap-px">
        {history.map((entry, i) => {
          const pct = Math.max((entry.durationDays / totalDays) * 100, 0.5);
          const m = meta(entry.status);
          return (
            <div
              key={i}
              title={`${m.label}: ${formatDuration(entry.durationDays)}`}
              className={cn('h-full transition-all', m.bar)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Per-status rows */}
      <div className="space-y-2">
        {history.map((entry, i) => {
          const m = meta(entry.status);
          const pct = ((entry.durationDays / totalDays) * 100).toFixed(1);
          return (
            <div key={i} className="flex items-center gap-3">
              {/* dot */}
              <span className={cn('w-2 h-2 rounded-full shrink-0', m.dot)} />

              {/* label + active badge */}
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0',
                  m.badge,
                )}
              >
                {m.label}
                {entry.isActive && (
                  <span className="ml-1 text-[10px] font-bold opacity-70">← now</span>
                )}
              </span>

              {/* thin bar */}
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', m.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* duration */}
              <span className="text-xs font-semibold text-foreground tabular-nums w-14 text-right shrink-0">
                {formatDuration(entry.durationDays)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Timeline list */}
      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Status Timeline
        </p>
        <ol className="relative border-l border-border ml-2 space-y-4">
          {history.map((entry, i) => {
            const m = meta(entry.status);
            return (
              <li key={i} className="ml-4">
                {/* circle on line */}
                <span
                  className={cn(
                    'absolute -left-[5px] w-2.5 h-2.5 rounded-full border-2 border-background',
                    m.dot,
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full border',
                        m.badge,
                      )}
                    >
                      {m.label}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {formatDuration(entry.durationDays)}
                    </span>
                    {entry.isActive && (
                      <span className="text-xs text-sky-500 font-semibold">Current</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>Entered {formatDateTime(entry.enteredAt)}</span>
                    {entry.exitedAt && (
                      <>
                        <span>·</span>
                        <span>Exited {formatDateTime(entry.exitedAt)}</span>
                      </>
                    )}
                    {entry.changedBy && (
                      <>
                        <span>·</span>
                        <span>
                          by {entry.changedBy.firstName} {entry.changedBy.lastName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
