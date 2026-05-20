'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { purchaseOrdersApi } from '@/lib/api';
import { PurchaseOrder } from '@/types/api';
import { toast } from 'sonner';
import { X, PackageCheck } from 'lucide-react';

interface ReceiveEntry {
  itemId: string;
  qtyReceived: string;
  unitPrice: string;
}

interface Props {
  po: PurchaseOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReceiveGoodsModal({ po, onClose, onSuccess }: Props) {
  const pendingItems = (po.items ?? []).filter(
    (i) => Number(i.qtyOrdered) > Number(i.qtyReceived),
  );

  const [entries, setEntries] = useState<ReceiveEntry[]>(
    pendingItems.map((i) => ({
      itemId: i.id,
      qtyReceived: String(Math.max(0, Number(i.qtyOrdered) - Number(i.qtyReceived))),
      unitPrice: i.unitPrice ? String(i.unitPrice) : '',
    })),
  );
  const [receiveNotes, setReceiveNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      purchaseOrdersApi.receiveGoods(po.id, {
        items: entries
          .filter((e) => Number(e.qtyReceived) > 0)
          .map((e) => ({
            itemId: e.itemId,
            qtyReceived: Number(e.qtyReceived),
            ...(e.unitPrice ? { unitPrice: Number(e.unitPrice) } : {}),
          })),
        notes: receiveNotes || undefined,
      }),
    onSuccess: () => {
      toast.success('Goods received and stock updated');
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to receive goods'),
  });

  function updateEntry(idx: number, field: keyof ReceiveEntry, value: string) {
    setEntries(entries.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  const canSubmit = entries.some((e) => Number(e.qtyReceived) > 0);

  const inputCls = "w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Receive Goods</h2>
            <p className="text-sm text-muted-foreground">PO {po.poNumber} · {po.supplier?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Enter the quantity received for each item. Leave at 0 to skip.</p>

          {/* Items */}
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
              <div className="col-span-4">Product</div>
              <div className="col-span-2 text-right">Pending</div>
              <div className="col-span-3 text-right">Qty Received</div>
              <div className="col-span-3 text-right">Unit Price (₹)</div>
            </div>
            {entries.map((entry, idx) => {
              const poItem = pendingItems[idx];
              const pending = Number(poItem.qtyOrdered) - Number(poItem.qtyReceived);
              return (
                <div key={entry.itemId} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-xl p-3">
                  <div className="col-span-4">
                    <p className="text-sm text-foreground">{poItem.product?.name}</p>
                    <p className="text-xs text-muted-foreground">{poItem.product?.productCode}</p>
                  </div>
                  <div className="col-span-2 text-right text-sm font-mono text-muted-foreground">
                    {pending.toFixed(2)}
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      max={pending}
                      step="0.01"
                      value={entry.qtyReceived}
                      onChange={(e) => updateEntry(idx, 'qtyReceived', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.unitPrice}
                      onChange={(e) => updateEntry(idx, 'unitPrice', e.target.value)}
                      className={`${inputCls} placeholder:text-muted-foreground`}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Delivery challan no., remarks…"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <PackageCheck className="w-4 h-4" />
            {mutation.isPending ? 'Processing…' : 'Confirm Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
