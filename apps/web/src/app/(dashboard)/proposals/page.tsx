'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { proposalsApi } from '@/lib/api';
import { formatCurrency, formatDate, formatFollowUpDate, isOverdue } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ProposalStatsCards } from '@/components/proposals/proposal-stats-cards';
import { FileText, Search } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export default function ProposalsPage() {
  const router  = useRouter();
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page,   setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', { search, status, page }],
    queryFn: () =>
      proposalsApi.findAll({ search: search || undefined, status: status || undefined, page }),
  });

  const proposals = data?.data?.data || [];
  const meta      = data?.data?.meta;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Proposals</h1>
            <p className="text-xs text-muted-foreground">
              {meta ? `${meta.total} total` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="shrink-0 px-6 py-4 border-b border-border bg-background/50">
        <ProposalStatsCards />
      </div>

      {/* ── Filters ── */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-border bg-background/50">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search proposals..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <TableSkeleton rows={10} cols={8} />
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <FileText className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">No proposals found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters or create a proposal by converting a ticket.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Proposal #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ticket</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow-up</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valid Until</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {proposals.map((p: {
                  id: string;
                  status: string;
                  totalAmount: number;
                  validUntil?: string;
                  createdAt: string;
                  nextFollowUpDate?: string | null;
                  ticket?: { referenceId: string; clientName: string; projectName?: string };
                }) => {
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/proposals/${p.id}`)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded font-semibold text-foreground">
                          {p.ticket?.referenceId || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {p.ticket?.clientName || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {p.ticket?.projectName || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.ticket && (
                          <span className="font-mono text-xs text-sky-500">{p.ticket.referenceId}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-500">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className={p.nextFollowUpDate && isOverdue(p.nextFollowUpDate) ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                          {formatFollowUpDate(p.nextFollowUpDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">
                        {p.validUntil ? formatDate(p.validUntil) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">
                        {formatDate(p.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {meta && meta.totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-border bg-background">
          <p className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} proposals
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
