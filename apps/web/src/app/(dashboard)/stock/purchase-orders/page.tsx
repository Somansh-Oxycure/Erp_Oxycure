'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi } from '@/lib/api';
import { PurchaseOrder, PurchaseOrderStatus } from '@/types/api';
import { useRole } from '@/hooks/useRole';
import { Plus, Search, FileText, RefreshCw, Calendar } from 'lucide-react';
import Link from 'next/link';
import NewPurchaseOrderModal from '@/components/purchase-orders/NewPurchaseOrderModal';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft:              { label: 'Draft',      className: 'bg-muted text-muted-foreground border border-border' },
  sent:               { label: 'Sent',       className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20' },
  partially_received: { label: 'Partial',    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' },
  received:           { label: 'Received',   className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' },
  cancelled:          { label: 'Cancelled',  className: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' },
};

export default function PurchaseOrdersPage() {
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [newModalOpen, setNewModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', search, statusFilter],
    queryFn: () =>
      purchaseOrdersApi
        .findAll({ ...(statusFilter && { status: statusFilter }), ...(search && { search }) })
        .then((r) => r.data.data),
    staleTime: 15000,
  });

  const orders: PurchaseOrder[] = data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage supplier purchase orders</p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New PO
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            placeholder="Search PO number or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partially_received">Partial</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">PO Number</th>
              <th className="text-left px-4 py-3">Supplier</th>
              <th className="text-center px-4 py-3">Items</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Expected</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Loading…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  No purchase orders found
                </td>
              </tr>
            ) : (
              orders.map((po) => {
                const cfg = STATUS_CONFIG[po.status];
                return (
                  <tr key={po.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/stock/purchase-orders/${po.id}`} className="text-sky-600 dark:text-sky-400 hover:underline font-mono font-medium">
                        {po.poNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">{po.supplier?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{po._count?.items ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {po.expectedDate
                        ? new Date(po.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {newModalOpen && (
        <NewPurchaseOrderModal
          onClose={() => setNewModalOpen(false)}
          onSuccess={() => {
            setNewModalOpen(false);
            qc.invalidateQueries({ queryKey: ['purchase-orders'] });
          }}
        />
      )}
    </div>
  );
}
