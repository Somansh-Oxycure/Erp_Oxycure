'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { stockApi } from '@/lib/api';
import { StockWithProduct } from '@/types/api';
import { toast } from 'sonner';
import { X, Plus, Minus } from 'lucide-react';

interface Props {
  product: StockWithProduct;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockAdjustModal({ product, onClose, onSuccess }: Props) {
  const [type, setType] = useState<'add' | 'remove'>('add');
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      stockApi.adjust(product.id, {
        type,
        qty: Number(qty),
        ...(unitCost ? { unitCost: Number(unitCost) } : {}),
        ...(notes ? { notes } : {}),
      }),
    onSuccess: () => {
      toast.success(`Stock ${type === 'add' ? 'added' : 'removed'} successfully`);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to adjust stock');
    },
  });

  const canSubmit = qty && Number(qty) > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Adjust Stock</h2>
            <p className="text-sm text-muted-foreground">{product.name} ({product.productCode})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current stock info */}
        <div className="mx-5 mt-5 bg-muted/30 border border-border rounded-xl p-4 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">On Hand</p>
            <p className="text-lg font-bold text-foreground">{product.onHand}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">On Order</p>
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{product.onOrder}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('add')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                type === 'add'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted border border-border text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Plus className="w-4 h-4" /> Add Stock
            </button>
            <button
              onClick={() => setType('remove')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                type === 'remove'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400'
                  : 'bg-muted border border-border text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Minus className="w-4 h-4" /> Remove Stock
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Quantity ({product.unitOfMeasure}) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              placeholder="0"
            />
          </div>

          {type === 'add' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Unit Cost (₹) — optional</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
                placeholder="Leave blank to keep current avg cost"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes — optional</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring resize-none"
              placeholder="Reason for adjustment…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
              type === 'add'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {mutation.isPending ? 'Saving…' : type === 'add' ? 'Add Stock' : 'Remove Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
