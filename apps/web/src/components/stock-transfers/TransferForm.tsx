'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { stockApi, stockTransfersApi } from '@/lib/api';
import { StockWithProduct } from '@/types/api';
import { toast } from 'sonner';
import { Plus, Trash2, Search, X } from 'lucide-react';

interface Charge {
  label: string;
  amount: number | '';
}

interface LineItem {
  productId: string;
  productName: string;
  productCode: string;
  unitOfMeasure: string;
  qtyOnHand: number;
  qtyRequested: number | '';
  unitCost: number | '';
}

interface Props {
  transferType: 'TRANSFER_OUT' | 'TRANSFER_IN';
}

const inputCls =
  'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5';

export default function TransferForm({ transferType }: Props) {
  const router = useRouter();
  const isOut = transferType === 'TRANSFER_OUT';

  // ── Header / Challan fields ────────────────────────────────────────────
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [eWayBillNumber, setEWayBillNumber] = useState('');

  // ── Billed To ──────────────────────────────────────────────────────────
  const [partyName, setPartyName] = useState('');
  const [partyGSTNumber, setPartyGSTNumber] = useState('');
  const [partyAddress, setPartyAddress] = useState('');

  // ── Shipped To ─────────────────────────────────────────────────────────
  const [shippedToName, setShippedToName] = useState('');
  const [shippedToGST, setShippedToGST] = useState('');
  const [shippedToAddress, setShippedToAddress] = useState('');

  // ── Notes ──────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState('');

  // ── Products ───────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);

  // ── Additional charges ─────────────────────────────────────────────────
  const [charges, setCharges] = useState<Charge[]>([]);

  const addCharge = () => setCharges((p) => [...p, { label: '', amount: '' }]);
  const updateCharge = (idx: number, field: keyof Charge, value: string | number) =>
    setCharges((p) => p.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  const removeCharge = (idx: number) => setCharges((p) => p.filter((_, i) => i !== idx));

  const { data: stockData } = useQuery({
    queryKey: ['stock', { page: '1', limit: '500' }],
    queryFn: () => stockApi.findAll({ page: '1', limit: '500' }).then((r) => r.data.data as StockWithProduct[]),
    staleTime: 30000,
  });

  const allItems: StockWithProduct[] = stockData ?? [];

  const filteredProducts =
    searchTerm.length >= 1
      ? allItems
          .filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.productCode.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .slice(0, 10)
      : allItems.slice(0, 10);

  const addProduct = useCallback(
    (p: StockWithProduct) => {
      if (lines.some((l) => l.productId === p.id)) {
        toast.error('Product already added');
        return;
      }
      setLines((prev) => [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          productCode: p.productCode,
          unitOfMeasure: p.unitOfMeasure,
          qtyOnHand: p.onHand,
          qtyRequested: '',
          unitCost: '',
        },
      ]);
      setSearchTerm('');
      setShowProductSearch(false);
    },
    [lines],
  );

  const updateLine = (idx: number, field: keyof LineItem, value: string | number) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const createMutation = useMutation({
    mutationFn: (opts: { autoConfirm: boolean }) => {
      const payload = {
        transferType,
        partyName,
        partyGSTNumber: partyGSTNumber || undefined,
        partyAddress: partyAddress || undefined,
        transferDate,
        billNumber: billNumber || undefined,
        billDate: billDate || undefined,
        placeOfSupply: placeOfSupply || undefined,
        poNumber: poNumber || undefined,
        contactNumber: contactNumber || undefined,
        transporterName: transporterName || undefined,
        vehicleNumber: vehicleNumber || undefined,
        eWayBillNumber: eWayBillNumber || undefined,
        shippedToName: shippedToName || undefined,
        shippedToAddress: shippedToAddress || undefined,
        shippedToGST: shippedToGST || undefined,
        notes: notes || undefined,
        additionalCharges: charges
          .filter((c) => c.label.trim() && c.amount !== '' && Number(c.amount) >= 0)
          .map((c) => ({ label: c.label.trim(), amount: Number(c.amount) })),
        items: lines.map((l) => ({
          productId: l.productId,
          qtyRequested: Number(l.qtyRequested),
          unitCost: l.unitCost !== '' ? Number(l.unitCost) : undefined,
        })),
      };
      return stockTransfersApi.create(payload).then(async (res) => {
        const transfer = res.data.data;
        if (opts.autoConfirm) await stockTransfersApi.confirm(transfer.id);
        return transfer;
      });
    },
    onSuccess: (transfer) => {
      toast.success('Transfer created successfully');
      router.push(`/stock-transfers/${transfer.id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Failed to create transfer');
    },
  });

  const validate = (): boolean => {
    if (!partyName.trim()) { toast.error('Billed To party name is required'); return false; }
    if (!transferDate) { toast.error('Transfer date is required'); return false; }
    if (lines.length === 0) { toast.error('Add at least one product'); return false; }
    for (const l of lines) {
      if (!l.qtyRequested || Number(l.qtyRequested) <= 0) {
        toast.error(`Enter a valid quantity for ${l.productName}`);
        return false;
      }
      if (isOut && Number(l.qtyRequested) > l.qtyOnHand) {
        toast.error(`${l.productName}: requested qty exceeds available stock (${l.qtyOnHand})`);
        return false;
      }
    }
    return true;
  };

  const totalQty = lines.reduce((s, l) => s + (Number(l.qtyRequested) || 0), 0);
  const itemsAmount = lines.reduce((s, l) => s + (Number(l.qtyRequested) || 0) * (Number(l.unitCost) || 0), 0);
  const chargesTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const grandTotal = itemsAmount + chargesTotal;

  const accentBorder = isOut ? 'border-l-red-500' : 'border-l-emerald-500';
  const accentBtn = isOut
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-emerald-600 hover:bg-emerald-700 text-white';

  return (
    <div className="space-y-5">
      {/* ── Section 1: Challan / Document Info ────────────────────────── */}
      <div className={`bg-card border border-border border-l-4 ${accentBorder} rounded-xl`}>
        <div className="px-6 pt-5 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {isOut ? 'Outward Challan Details' : 'Inward Challan Details'}
          </h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Invoice No.</label>
            <input
              className={inputCls}
              placeholder="INV-0001"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputCls}
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Invoice / Bill Date</label>
            <input
              type="date"
              className={inputCls}
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Place of Supply</label>
            <input
              className={inputCls}
              placeholder="e.g. Maharashtra"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>PO No.</label>
            <input
              className={inputCls}
              placeholder="Purchase Order ref"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Contact No.</label>
            <input
              className={inputCls}
              placeholder="+91 XXXXX XXXXX"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Transport</label>
            <input
              className={inputCls}
              placeholder="Courier / lorry service"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Vehicle No.</label>
            <input
              className={inputCls}
              placeholder="MH-XX-XXXX"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>E-way Bill</label>
            <input
              className={inputCls}
              placeholder="12-digit e-Way bill number"
              value={eWayBillNumber}
              onChange={(e) => setEWayBillNumber(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Party Details ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-6 pt-5 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Party Details</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Billed To */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              {isOut ? 'Billed To (Customer)' : 'Billed To (Supplier)'}
            </p>
            <div>
              <label className={labelCls}>
                Party / Company Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                placeholder="Full name or company"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>GST / UIN</label>
              <input
                className={inputCls}
                placeholder="15-char GST number"
                maxLength={15}
                value={partyGSTNumber}
                onChange={(e) => setPartyGSTNumber(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Full billing address"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Shipped To */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              {isOut ? 'Shipped To (Delivery)' : 'Shipped To (Warehouse)'}
            </p>
            <div>
              <label className={labelCls}>Party / Company Name</label>
              <input
                className={inputCls}
                placeholder="If different from Billed To"
                value={shippedToName}
                onChange={(e) => setShippedToName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>GST / UIN</label>
              <input
                className={inputCls}
                placeholder="15-char GST number"
                maxLength={15}
                value={shippedToGST}
                onChange={(e) => setShippedToGST(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Full shipping / delivery address"
                value={shippedToAddress}
                onChange={(e) => setShippedToAddress(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Product Lines ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Items</h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProductSearch((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
            {showProductSearch && (
              <div className="absolute right-0 top-10 z-20 bg-popover border border-border rounded-xl shadow-xl w-80 p-3">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Search by name or code…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-border">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No products found</p>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.productCode} · On hand:{' '}
                          <span className={p.onHand > 0 ? 'text-emerald-600' : 'text-red-500'}>
                            {p.onHand.toFixed(3)}
                          </span>
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground">
            <p className="text-sm">No items added yet. Click "Add Product" to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-center px-4 py-3 w-12">S. No.</th>
                  <th className="text-left px-4 py-3">Description of Goods</th>
                  <th className="text-center px-4 py-3 w-28">Qty</th>
                  <th className="text-center px-4 py-3 w-24">UOM</th>
                  <th className="text-right px-4 py-3 w-36">Price (₹)</th>
                  <th className="text-right px-4 py-3 w-36">Amount (₹)</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {lines.map((line, idx) => {
                  const amount = (Number(line.qtyRequested) || 0) * (Number(line.unitCost) || 0);
                  return (
                    <tr key={line.productId} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-center text-muted-foreground font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{line.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{line.productCode}</p>
                        {isOut && (
                          <p className="text-xs mt-0.5">
                            <span className="text-muted-foreground">On hand: </span>
                            <span className={line.qtyOnHand > 0 ? 'text-emerald-600' : 'text-red-500'}>
                              {line.qtyOnHand.toFixed(3)}
                            </span>
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0.001}
                          step={0.001}
                          max={isOut ? line.qtyOnHand : undefined}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-center text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="0"
                          value={line.qtyRequested}
                          onChange={(e) => {
                            let val: number | '' = e.target.value === '' ? '' : Number(e.target.value);
                            if (isOut && val !== '' && val > line.qtyOnHand) val = line.qtyOnHand;
                            updateLine(idx, 'qtyRequested', val as number);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs uppercase">
                          {line.unitOfMeasure || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="0.00"
                          value={line.unitCost}
                          onChange={(e) =>
                            updateLine(idx, 'unitCost', e.target.value === '' ? '' : Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {amount > 0 ? (
                          <span className="text-foreground">
                            ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t border-border font-semibold text-sm">
                  <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground text-xs uppercase tracking-wider">
                    {lines.length} item{lines.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-foreground">{totalQty.toFixed(3)}</td>
                  <td colSpan={2} className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {itemsAmount > 0
                      ? `₹${itemsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 4: Additional Charges ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl">
        <div className="px-6 pt-5 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Additional Charges</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Freight, labour, packing, insurance, etc.</p>
          </div>
          <button
            type="button"
            onClick={addCharge}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted text-foreground text-sm font-semibold hover:bg-muted/70 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Charge
          </button>
        </div>

        <div className="p-6">
          {charges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-5 border border-dashed border-border rounded-xl">
              No additional charges. Click "Add Charge" above.
            </p>
          ) : (
            <div className="space-y-2">
              {charges.map((charge, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. Freight, Labour, Packing"
                    value={charge.label}
                    onChange={(e) => updateCharge(idx, 'label', e.target.value)}
                  />
                  <div className="relative w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-right text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="0.00"
                      value={charge.amount}
                      onChange={(e) =>
                        updateCharge(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCharge(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {grandTotal > 0 && (
            <div className="flex justify-end mt-5 pt-4 border-t border-border">
              <div className="w-72 space-y-2 text-sm">
                {itemsAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Items Subtotal</span>
                    <span className="font-mono">
                      ₹{itemsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {charges.map((c, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{c.label || 'Charge'}</span>
                    <span className="font-mono">
                      ₹{Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                  <span>Grand Total</span>
                  <span className="font-mono">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 5: Internal Notes ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <label className={labelCls}>Internal Notes</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Any internal remarks or instructions"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* ── Footer Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-end pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={() => { if (validate()) createMutation.mutate({ autoConfirm: false }); }}
          className="px-5 py-2 text-sm rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition-colors disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          disabled={createMutation.isPending}
          onClick={() => { if (validate()) createMutation.mutate({ autoConfirm: true }); }}
          className={`px-5 py-2 text-sm rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 ${accentBtn}`}
        >
          {createMutation.isPending && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Save & Confirm
        </button>
      </div>
    </div>
  );
}
