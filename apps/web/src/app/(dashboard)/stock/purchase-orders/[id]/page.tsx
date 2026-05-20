'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { purchaseOrdersApi } from '@/lib/api';
import { PurchaseOrder, PurchaseOrderStatus } from '@/types/api';
import { useRole } from '@/hooks/useRole';
import { toast } from 'sonner';
import {
  ArrowLeft, RefreshCw, CheckCircle2, Send, XCircle, PackageCheck,
} from 'lucide-react';
import Link from 'next/link';
import ReceiveGoodsModal from '@/components/purchase-orders/ReceiveGoodsModal';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  draft:              { label: 'Draft',      className: 'bg-muted text-muted-foreground border border-border' },
  sent:               { label: 'Sent',       className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20' },
  partially_received: { label: 'Partial',    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' },
  received:           { label: 'Received',   className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' },
  cancelled:          { label: 'Cancelled',  className: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' },
};

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.id as string;
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const qc = useQueryClient();
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => purchaseOrdersApi.findOne(poId).then((r) => r.data.data),
  });

  const markSentMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.markSent(poId),
    onSuccess: () => { toast.success('PO marked as sent'); qc.invalidateQueries({ queryKey: ['purchase-order', poId] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => purchaseOrdersApi.cancel(poId),
    onSuccess: () => { toast.success('PO cancelled'); qc.invalidateQueries({ queryKey: ['purchase-order', poId] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const po: PurchaseOrder = data;
  if (!po) return <div className="p-6 text-muted-foreground">Purchase order not found</div>;

  const cfg = STATUS_CONFIG[po.status];
  const canSend = po.status === 'draft';
  const canReceive = po.status === 'sent' || po.status === 'partially_received';
  const canCancel = po.status === 'draft' || po.status === 'sent';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/stock/purchase-orders" className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-mono">{po.poNumber}</h1>
              <span className={`text-sm px-2.5 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {po.supplier?.name} · Created by {po.createdBy?.firstName} {po.createdBy?.lastName}
            </p>
          </div>
        </div>

        {isAdminOrManager && (
          <div className="flex gap-2">
            {canSend && (
              <button
                onClick={() => markSentMutation.mutate()}
                disabled={markSentMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-xl text-sm hover:bg-sky-500/20 transition-colors"
              >
                <Send className="w-4 h-4" /> Mark Sent
              </button>
            )}
            {canReceive && (
              <button
                onClick={() => setReceiveOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-sm hover:bg-emerald-500/20 transition-colors"
              >
                <PackageCheck className="w-4 h-4" /> Receive Goods
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => { if (confirm('Cancel this PO?')) cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 rounded-xl text-sm hover:bg-red-500/20 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Supplier</p>
          <p className="font-medium text-foreground mt-1">{po.supplier?.name}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="font-bold text-foreground mt-1">
            ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Expected Delivery</p>
          <p className="font-medium text-foreground mt-1">
            {po.expectedDate
              ? new Date(po.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="font-medium text-foreground mt-1">
            {new Date(po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {po.notes && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-300">
          <span className="font-medium">Notes: </span>{po.notes}
        </div>
      )}

      {/* Line items */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Line Items</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-right px-4 py-3">Ordered</th>
                <th className="text-right px-4 py-3">Received</th>
                <th className="text-right px-4 py-3">Pending</th>
                <th className="text-right px-4 py-3">Unit Price</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {(po.items ?? []).map((item) => {
                const pending = Number(item.qtyOrdered) - Number(item.qtyReceived);
                const fullyReceived = pending <= 0;
                return (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground">{item.product?.productCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">{Number(item.qtyOrdered).toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${fullyReceived ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {Number(item.qtyReceived).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">{Math.max(0, pending).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground/70">
                      {item.unitPrice ? `₹${Number(item.unitPrice).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">
                      ₹{Number(item.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={5} className="px-4 py-3 text-right text-muted-foreground text-sm font-medium">Total Amount</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                  ₹{Number(po.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {receiveOpen && (
        <ReceiveGoodsModal
          po={po}
          onClose={() => setReceiveOpen(false)}
          onSuccess={() => {
            setReceiveOpen(false);
            qc.invalidateQueries({ queryKey: ['purchase-order', poId] });
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stock-stats'] });
          }}
        />
      )}
    </div>
  );
}
