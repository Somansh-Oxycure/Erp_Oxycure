'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { stockTransfersApi } from '@/lib/api';
import { StockTransfer, StockTransferStats } from '@/types/api';
import { useRole } from '@/hooks/useRole';
import { format } from 'date-fns';
import { Eye, CheckCircle2, XCircle, RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import TransferStatusBadge from '@/components/stock-transfers/TransferStatusBadge';
import TransferStatsBar from '@/components/stock-transfers/TransferStatsBar';
import ConfirmTransferModal from '@/components/stock-transfers/ConfirmTransferModal';
import CancelTransferModal from '@/components/stock-transfers/CancelTransferModal';
import { toast } from 'sonner';

export default function StockTransfersPage() {
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [confirmTarget, setConfirmTarget] = useState<StockTransfer | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StockTransfer | null>(null);

  const params: Record<string, string> = { page: String(page), limit: '30' };
  if (search) params.partyName = search;
  if (typeFilter) params.transferType = typeFilter;
  if (statusFilter) params.status = statusFilter;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', params],
    queryFn: () => stockTransfersApi.findAll(params).then((r) => r.data),
    staleTime: 10000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['stock-transfer-stats'],
    queryFn: () => stockTransfersApi.getStats().then((r) => r.data.data as StockTransferStats),
    staleTime: 30000,
  });

  const transfers: StockTransfer[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };
  const stats = statsData ?? { total: 0, drafts: 0, confirmed: 0, cancelled: 0, totalOut: 0, totalIn: 0 };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Transfers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Challan-based stock movement management</p>
        </div>
        {isAdminOrManager && (
          <div className="flex gap-2">
            <Link
              href="/stock-transfers/new?type=TRANSFER_OUT"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4" />
              New Transfer OUT
            </Link>
            <Link
              href="/stock-transfers/new?type=TRANSFER_IN"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
            >
              <ArrowDownCircle className="w-4 h-4" />
              New Transfer IN
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <TransferStatsBar stats={stats} />

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <input
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search party name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="TRANSFER_OUT">Outward (OUT)</option>
          <option value="TRANSFER_IN">Inward (IN)</option>
        </select>
        <select
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input
          type="date"
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          title="Date from"
        />
        <input
          type="date"
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          title="Date to"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Transfer #</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Party Name</th>
                <th className="text-left px-4 py-3">Bill #</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-center px-4 py-3">Items</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Loading…
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No transfers found
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{t.transferNumber}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.transferType === 'TRANSFER_OUT' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'}`}
                      >
                        {t.transferType === 'TRANSFER_OUT' ? 'OUT' : 'IN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{t.partyName}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.billNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(t.transferDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {t._count?.items ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TransferStatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/stock-transfers/${t.id}`}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {isAdminOrManager && t.status === 'DRAFT' && (
                          <>
                            <button
                              title="Confirm"
                              onClick={() => setConfirmTarget(t)}
                              className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Cancel"
                              onClick={() => setCancelTarget(t)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {meta.total} transfers · Page {page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-muted border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted/80 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-muted border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted/80 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {confirmTarget && (
        <ConfirmTransferModal
          transferId={confirmTarget.id}
          transferNumber={confirmTarget.transferNumber}
          onClose={() => setConfirmTarget(null)}
        />
      )}
      {cancelTarget && (
        <CancelTransferModal
          transferId={cancelTarget.id}
          transferNumber={cancelTarget.transferNumber}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
