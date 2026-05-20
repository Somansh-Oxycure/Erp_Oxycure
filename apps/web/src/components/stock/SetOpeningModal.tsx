'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { stockApi } from '@/lib/api';
import { StockWithProduct } from '@/types/api';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface Props {
  product: StockWithProduct;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SetOpeningModal({ product, onClose, onSuccess }: Props) {
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      stockApi.setOpening(product.id, {
        qty: Number(qty),
        ...(unitCost ? { unitCost: Number(unitCost) } : {}),
      }),
    onSuccess: () => {
      toast.success('Opening stock set successfully');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to set opening stock');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Set Opening Stock</h2>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Opening Quantity ({product.unitOfMeasure}) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Unit Cost (₹) — optional</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
              placeholder="Cost per unit"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!qty || Number(qty) < 0 || mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Set Opening Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
