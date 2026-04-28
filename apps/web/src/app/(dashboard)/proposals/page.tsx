'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { proposalsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { FileText, Loader2, Search, AlertCircle } from 'lucide-react';

const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Draft',    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  sent:     { label: 'Sent',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  expired:  { label: 'Expired',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

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
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No proposals found</p>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valid Until</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {proposals.map((p: {
                  id: string;
                  proposalNumber: string;
                  status: string;
                  totalAmount: number;
                  validUntil?: string;
                  createdAt: string;
                  ticket?: { ticketNumber: string; clientName: string; projectName?: string };
                }) => {
                  const statusCfg = PROPOSAL_STATUS[p.status] || PROPOSAL_STATUS.draft;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/proposals/${p.id}`)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded font-semibold text-foreground">
                          {p.proposalNumber}
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
                          <span className="font-mono text-xs text-sky-500">{p.ticket.ticketNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-500">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusCfg.color)}>
                          {statusCfg.label}
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
