'use client';

import { useQuery } from '@tanstack/react-query';
import { proposalsApi, ticketsApi } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import { Clock, TrendingUp, GitBranch, BarChart3, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgingEntry = {
  status: string;
  enteredAt: string;
  exitedAt: string | null;
  durationDays: number;
  isActive: boolean;
  changedBy: { firstName: string; lastName: string } | null;
};

type TicketAgingData = {
  ticketId: string;
  referenceId: string;
  currentStatus: string;
  createdAt: string;
  totalAgeDays: number;
  statusHistory: AgingEntry[];
};

type ProposalAgingData = {
  proposalId: string;
  referenceId: string;
  revisionNumber: number;
  currentStatus: string;
  createdAt: string;
  totalAgeDays: number;
  statusHistory: AgingEntry[];
};

type ProposalSummary = {
  id: string;
  status: string;
  revisionNumber: number;
  parentProposalId: string | null;
};

// ─── Colour palettes ──────────────────────────────────────────────────────────

const TICKET_STATUS_META: Record<string, { label: string; bar: string; badge: string; dot: string }> = {
  new:             { label: 'New',             bar: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-700 border-slate-200',   dot: 'bg-slate-400' },
  contacted:       { label: 'Contacted',       bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 border-blue-200',      dot: 'bg-blue-500' },
  site_inspection: { label: 'Site Inspection', bar: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700 border-violet-200',dot: 'bg-violet-500' },
  design_review:   { label: 'Design Review',   bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200',dot: 'bg-orange-500' },
  quoted:          { label: 'Quoted',          bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  won:             { label: 'Won',             bar: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',dot: 'bg-emerald-500' },
  lost:            { label: 'Lost',            bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-500' },
};

const PROPOSAL_STATUS_META: Record<string, { label: string; bar: string; badge: string; dot: string }> = {
  draft:    { label: 'Draft',    bar: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-700 border-slate-200',   dot: 'bg-slate-400' },
  sent:     { label: 'Sent',     bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 border-blue-200',      dot: 'bg-blue-500' },
  accepted: { label: 'Accepted', bar: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-500' },
  expired:  { label: 'Expired',  bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
};

const tMeta = (status: string) =>
  TICKET_STATUS_META[status] ?? { label: status, bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };

const pMeta = (status: string) =>
  PROPOSAL_STATUS_META[status] ?? { label: status, bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };

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

// ─── Mini stacked bar ─────────────────────────────────────────────────────────

function StackedBar({
  history,
  totalDays,
  palette,
}: {
  history: AgingEntry[];
  totalDays: number;
  palette: (s: string) => { bar: string };
}) {
  return (
    <div className="flex w-full h-2 rounded-full overflow-hidden bg-muted gap-px">
      {history.map((entry, i) => {
        const pct = Math.max((entry.durationDays / Math.max(totalDays, 0.01)) * 100, 0.5);
        return (
          <div
            key={i}
            className={cn('h-full', palette(entry.status).bar)}
            style={{ width: `${pct}%` }}
            title={`${entry.status}: ${formatDuration(entry.durationDays)}`}
          />
        );
      })}
    </div>
  );
}

// ─── Single proposal aging card (compact) ─────────────────────────────────────

function ProposalAgingCard({
  proposalId,
  proposals,
}: {
  proposalId: string;
  proposals: ProposalSummary[];
}) {
  const router = useRouter();
  const { data, isLoading } = useQuery<{ data: { data: ProposalAgingData } }>({
    queryKey: ['proposal-aging', proposalId],
    queryFn: () => proposalsApi.aging(proposalId),
    enabled: !!proposalId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-muted/50 border border-border animate-pulse">
        <div className="h-3 w-32 bg-muted rounded mb-3" />
        <div className="h-2 w-full bg-muted rounded" />
      </div>
    );
  }

  if (!data?.data?.data) return null;

  const aging = data.data.data;
  const history = aging.statusHistory;
  const totalDays = Math.max(aging.totalAgeDays, 0.01);
  const isOriginal = !proposals.find((p) => p.id === proposalId)?.parentProposalId;

  return (
    <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {!isOriginal && (
            <span className="text-muted-foreground/40 text-[10px]">↳</span>
          )}
          <span className="text-xs font-semibold text-violet-500">
            {isOriginal ? 'Original' : `Rev ${aging.revisionNumber}`}
          </span>
          <span
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
              pMeta(aging.currentStatus).badge,
            )}
          >
            {pMeta(aging.currentStatus).label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            <span className="text-foreground font-semibold">{formatDuration(aging.totalAgeDays)}</span>
          </span>
          <button
            onClick={() => router.push(`/proposals/${proposalId}`)}
            className="flex items-center gap-1 text-[10px] text-sky-500 hover:text-sky-400 font-semibold"
          >
            View <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Stacked bar */}
      <StackedBar history={history} totalDays={totalDays} palette={pMeta} />

      {/* Per-status breakdown */}
      <div className="space-y-1.5">
        {history.map((entry, i) => {
          const m = pMeta(entry.status);
          const pct = ((entry.durationDays / totalDays) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />
              <span className={cn('font-semibold px-1.5 py-0.5 rounded-full border text-[10px] shrink-0', m.badge)}>
                {m.label}
                {entry.isActive && <span className="ml-1 opacity-70">← now</span>}
              </span>
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div className={cn('h-full rounded-full', m.bar)} style={{ width: `${pct}%` }} />
              </div>
              <span className="tabular-nums text-foreground font-semibold text-[10px] w-10 text-right shrink-0">
                {formatDuration(entry.durationDays)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Inline timeline */}
      <div className="border-t border-border/60 pt-2.5 space-y-2">
        <ol className="relative border-l border-border/60 ml-1.5 space-y-3">
          {history.map((entry, i) => {
            const m = pMeta(entry.status);
            return (
              <li key={i} className="ml-3.5">
                <span className={cn('absolute -left-[4px] w-2 h-2 rounded-full border border-background', m.dot)} />
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                  <span className={cn('font-semibold px-1.5 py-0.5 rounded-full border text-[10px]', m.badge)}>
                    {m.label}
                  </span>
                  <span>·</span>
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span>{formatDateTime(entry.enteredAt)}</span>
                  {entry.exitedAt && (
                    <>
                      <span>→</span>
                      <span>{formatDateTime(entry.exitedAt)}</span>
                    </>
                  )}
                  {entry.changedBy && (
                    <span className="text-muted-foreground/70">
                      by {entry.changedBy.firstName} {entry.changedBy.lastName}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TicketProposalAging({
  ticketId,
  proposals,
}: {
  ticketId: string;
  proposals: ProposalSummary[];
}) {
  const { data: ticketAgingResp, isLoading: ticketAgingLoading } = useQuery<{
    data: { data: TicketAgingData };
  }>({
    queryKey: ['ticket-aging', ticketId],
    queryFn: () => ticketsApi.aging(ticketId),
    enabled: !!ticketId,
    staleTime: 30_000,
  });

  const ticketAging = ticketAgingResp?.data?.data;

  if (ticketAgingLoading) {
    return (
      <div className="p-5 rounded-2xl bg-card border border-border animate-pulse space-y-4">
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-3/4 bg-muted rounded" />
      </div>
    );
  }

  if (!ticketAging && proposals.length === 0) return null;

  // Total combined age: ticket age (or sum of ticket + proposal ages for display)
  const totalDays = ticketAging ? Math.max(ticketAging.totalAgeDays, 0.01) : 0.01;

  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-6">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-500" />
          <h3 className="text-sm font-semibold text-foreground">Deal Aging</h3>
        </div>
        {ticketAging && (
          <span className="text-xs text-muted-foreground font-medium">
            Ticket age:{' '}
            <span className="text-foreground font-semibold">{formatDuration(ticketAging.totalAgeDays)}</span>
          </span>
        )}
      </div>

      {/* ── Ticket status timeline ── */}
      {ticketAging && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ticket Pipeline
            </p>
          </div>

          {/* Stacked bar */}
          <StackedBar
            history={ticketAging.statusHistory}
            totalDays={totalDays}
            palette={tMeta}
          />

          {/* Per-status rows */}
          <div className="space-y-1.5">
            {ticketAging.statusHistory.map((entry, i) => {
              const m = tMeta(entry.status);
              const pct = ((entry.durationDays / totalDays) * 100).toFixed(0);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />
                  <span className={cn('font-semibold px-1.5 py-0.5 rounded-full border text-[10px] shrink-0', m.badge)}>
                    {m.label}
                    {entry.isActive && <span className="ml-1 opacity-70">← now</span>}
                  </span>
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full rounded-full', m.bar)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="tabular-nums text-foreground font-semibold text-[10px] w-10 text-right shrink-0">
                    {formatDuration(entry.durationDays)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Ticket status timeline */}
          <div className="border-t border-border/60 pt-3 space-y-2">
            <ol className="relative border-l border-border/60 ml-1.5 space-y-3">
              {ticketAging.statusHistory.map((entry, i) => {
                const m = tMeta(entry.status);
                return (
                  <li key={i} className="ml-3.5">
                    <span className={cn('absolute -left-[4px] w-2 h-2 rounded-full border border-background', m.dot)} />
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                      <span className={cn('font-semibold px-1.5 py-0.5 rounded-full border text-[10px]', m.badge)}>
                        {m.label}
                      </span>
                      <span>·</span>
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span>{formatDateTime(entry.enteredAt)}</span>
                      {entry.exitedAt && (
                        <>
                          <span>→</span>
                          <span>{formatDateTime(entry.exitedAt)}</span>
                        </>
                      )}
                      {entry.changedBy && (
                        <span className="text-muted-foreground/70">
                          by {entry.changedBy.firstName} {entry.changedBy.lastName}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {/* ── Proposal revisions ── */}
      {proposals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-violet-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Proposal Versions
              <span className="ml-1 text-violet-500">({proposals.length})</span>
            </p>
            {proposals.length > 1 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                <GitBranch className="w-3 h-3" />
                {proposals.length - 1} revision{proposals.length - 1 > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {proposals.map((proposal) => (
              <ProposalAgingCard
                key={proposal.id}
                proposalId={proposal.id}
                proposals={proposals}
              />
            ))}
          </div>
        </div>
      )}

      {proposals.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground italic py-1">
          <FileText className="w-3.5 h-3.5 opacity-50" />
          No proposals created yet
        </div>
      )}
    </div>
  );
}
