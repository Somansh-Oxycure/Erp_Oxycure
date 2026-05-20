'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { purchaseOrdersApi, suppliersApi, productsApi } from '@/lib/api';
import { Supplier, Product } from '@/types/api';
import { toast } from 'sonner';
import { X, Plus, Trash2, Search } from 'lucide-react';

interface LineItem {
  productId: string;
  productName: string;
  productCode: string;
  unitOfMeasure: string;
  qtyOrdered: string;
  unitPrice: string;
  notes: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewPurchaseOrderModal({ onClose, onSuccess }: Props) {
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.findAll().then((r) => r.data.data),
    staleTime: 60000,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () =>
      productsApi.findAll({ search: productSearch, status: 'active', limit: '20' }).then((r) => r.data.data),
    enabled: productSearch.length > 1,
    staleTime: 10000,
  });

  const mutation = useMutation({
    mutationFn: () =>
      purchaseOrdersApi.create({
        supplierId,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          qtyOrdered: Number(i.qtyOrdered),
          unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
          notes: i.notes || undefined,
        })),
      }),
    onSuccess: (res) => {
      toast.success(`Purchase Order ${res.data.data.poNumber} created`);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create PO'),
  });

  function addProduct(p: Product) {
    if (items.find((i) => i.productId === p.id)) {
      toast.error('Product already added');
      return;
    }
    setItems([...items, {
      productId: p.id,
      productName: p.name,
      productCode: p.productCode,
      unitOfMeasure: p.unitOfMeasure,
      qtyOrdered: '1',
      unitPrice: '',
      notes: '',
    }]);
    setProductSearch('');
    setShowProductSearch(false);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  const totalAmount = items.reduce((sum, i) => {
    const qty = Number(i.qtyOrdered) || 0;
    const price = Number(i.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const canSubmit = supplierId && items.length > 0 && items.every((i) => Number(i.qtyOrdered) > 0);

  const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">New Purchase Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* PO Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select supplier…</option>
                  {(suppliersData ?? [])
                    .filter((s: Supplier) => s.status === 'active')
                    .map((s: Supplier) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expected Date</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Order notes…"
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Line Items</h3>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  className="flex items-center gap-1.5 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              {showProductSearch && (
                <div className="bg-muted/30 border border-border rounded-xl p-3 mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      autoFocus
                      className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Search product name or code…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  {productsData && productsData.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {productsData.map((p: Product) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm transition-colors"
                        >
                          <span className="text-foreground">{p.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{p.productCode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  No items added yet
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
                    <div className="col-span-4">Product</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-3 text-right">Unit Price (₹)</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1" />
                  </div>
                  {items.map((item, idx) => (
                    <div key={item.productId} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-xl p-2">
                      <div className="col-span-4">
                        <p className="text-sm text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productCode} · {item.unitOfMeasure}</p>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.qtyOrdered}
                          onChange={(e) => updateItem(idx, 'qtyOrdered', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2 text-right text-sm font-mono text-foreground/70">
                        {item.unitPrice
                          ? `₹${(Number(item.qtyOrdered) * Number(item.unitPrice)).toLocaleString('en-IN')}`
                          : '—'}
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => removeItem(idx)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex justify-end px-2 pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground mr-4">Total</span>
                    <span className="text-sm font-bold text-foreground font-mono">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Creating…' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
