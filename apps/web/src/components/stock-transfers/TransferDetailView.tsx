'use client';

import { StockTransfer } from '@/types/api';
import TransferStatusBadge from './TransferStatusBadge';
import { format } from 'date-fns';
import {
  Phone, Truck, FileCheck, Package, FileText, ClipboardList,
  MapPin, Landmark, CreditCard, Hash, Building2,
} from 'lucide-react';

interface Props {
  transfer: StockTransfer;
}

function fmt(date: string | null | undefined) {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy');
}

function userName(user?: { firstName: string; lastName: string } | null) {
  if (!user) return '—';
  return `${user.firstName} ${user.lastName}`;
}

function RefCell({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</span>
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
        {Icon && <Icon className="w-3 h-3 text-slate-400 shrink-0" />}
        {value}
      </span>
    </div>
  );
}

export default function TransferDetailView({ transfer }: Props) {
  const isOut = transfer.transferType === 'TRANSFER_OUT';
  const items = transfer.items ?? [];
  const charges = transfer.additionalCharges ?? [];
  const totalQty = items.reduce((s, i) => s + Number(i.qtyRequested), 0);
  const itemsValue = items.reduce((s, i) => s + Number(i.qtyRequested) * Number(i.unitCost ?? 0), 0);
  const chargesTotal = charges.reduce((s, c) => s + Number(c.amount), 0);
  const grandTotal = itemsValue + chargesTotal;

  const hasRefs =
    transfer.billNumber || transfer.billDate || transfer.placeOfSupply ||
    transfer.poNumber || transfer.contactNumber || transfer.transporterName ||
    transfer.vehicleNumber || transfer.eWayBillNumber;

  const accent       = isOut ? 'from-red-500 to-rose-600'              : 'from-emerald-500 to-teal-600';
  const accentBg     = isOut ? 'bg-red-50 dark:bg-red-900/10'          : 'bg-emerald-50 dark:bg-emerald-900/10';
  const accentBorder = isOut ? 'border-red-200 dark:border-red-800/30' : 'border-emerald-200 dark:border-emerald-800/30';
  const accentText   = isOut ? 'text-red-700 dark:text-red-400'        : 'text-emerald-700 dark:text-emerald-400';
  const accentBadge  = isOut
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  const D = 'border-slate-200 dark:border-slate-700';

  return (
    <div className={`print:shadow-none bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto border ${D} text-xs`}>

      {/* Header */}
      <div className={`bg-gradient-to-r ${accent} px-5 py-3 flex items-center justify-between gap-3`}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/60 font-semibold leading-none mb-0.5">Oxycure ERP</p>
          <h1 className="text-lg font-bold text-white leading-tight">
            {isOut ? 'Outward Delivery Challan' : 'Inward Receipt Challan'}
          </h1>
          <p className="font-mono text-sm font-semibold text-white/90 leading-tight">{transfer.transferNumber}</p>
          <p className="text-[11px] text-white/60">{fmt(transfer.transferDate)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/20 text-white border border-white/25">
            {isOut ? 'Outward' : 'Inward'}
          </span>
          <TransferStatusBadge status={transfer.status} variant="header" />
        </div>
      </div>

      {/* Challan References */}
      {hasRefs && (
        <div className={`px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b ${D}`}>
          <div className="grid grid-cols-4 gap-x-4 gap-y-2">
            <RefCell label="Invoice No."     value={transfer.billNumber}      icon={FileText} />
            <RefCell label="Invoice Date"    value={fmt(transfer.billDate)}   icon={FileText} />
            <RefCell label="Place of Supply" value={transfer.placeOfSupply}   icon={MapPin} />
            <RefCell label="PO No."          value={transfer.poNumber}        icon={ClipboardList} />
            <RefCell label="Contact No."     value={transfer.contactNumber}   icon={Phone} />
            <RefCell label="Transport"       value={transfer.transporterName} icon={Package} />
            <RefCell label="Vehicle No."     value={transfer.vehicleNumber}   icon={Truck} />
            <RefCell label="E-way Bill"      value={transfer.eWayBillNumber}  icon={FileCheck} />
          </div>
        </div>
      )}

      {/* Party Details — side by side */}
      <div className={`grid grid-cols-2 border-b ${D}`}>
        <div className={`px-4 py-3 border-r ${D} space-y-0.5`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {isOut ? 'Billed To — Customer' : 'Billed To — Supplier'}
          </p>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{transfer.partyName || '—'}</p>
          {transfer.partyGSTNumber && (
            <p className="text-[11px] text-slate-500">GST/UIN: <span className="font-mono text-slate-700 dark:text-slate-300">{transfer.partyGSTNumber}</span></p>
          )}
          {transfer.partyAddress && (
            <p className="text-[11px] text-slate-500 whitespace-pre-line leading-snug">{transfer.partyAddress}</p>
          )}
        </div>
        <div className="px-4 py-3 space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {isOut ? 'Shipped To — Delivery' : 'Shipped To — Warehouse'}
          </p>
          {transfer.shippedToName
            ? <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{transfer.shippedToName}</p>
            : <p className="text-[11px] text-slate-400 italic">—</p>}
          {transfer.shippedToGST && (
            <p className="text-[11px] text-slate-500">GST/UIN: <span className="font-mono text-slate-700 dark:text-slate-300">{transfer.shippedToGST}</span></p>
          )}
          {transfer.shippedToAddress && (
            <p className="text-[11px] text-slate-500 whitespace-pre-line leading-snug">{transfer.shippedToAddress}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={`bg-slate-50 dark:bg-slate-800/50 border-b ${D} text-[9px] uppercase tracking-widest text-slate-400 font-bold`}>
              <th className="text-center px-3 py-2 w-8">#</th>
              <th className="text-left px-3 py-2">Description of Goods</th>
              <th className="text-center px-3 py-2 w-20">Qty</th>
              <th className="text-center px-3 py-2 w-16">UOM</th>
              <th className="text-right px-3 py-2 w-24">Price</th>
              <th className="text-right px-3 py-2 w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const price = Number(item.unitCost ?? 0);
              const amount = Number(item.qtyRequested) * price;
              return (
                <tr key={item.id} className={`border-b ${D} ${idx % 2 === 1 ? 'bg-slate-50/60 dark:bg-slate-800/20' : ''} hover:bg-blue-50/30`}>
                  <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{item.product?.name ?? '—'}</p>
                    {item.product?.productCode && (
                      <p className="text-[10px] text-slate-400 font-mono">{item.product.productCode}</p>
                    )}
                    {item.notes && <p className="text-[10px] text-slate-400 italic">{item.notes}</p>}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-slate-700 dark:text-slate-300">
                    {Number(item.qtyRequested).toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${accentBadge}`}>
                      {item.product?.unitOfMeasure ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">
                    {price > 0 ? `Rs.${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {amount > 0 ? `Rs.${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={`bg-slate-100/70 dark:bg-slate-800/50 border-t-2 ${D} font-semibold`}>
              <td colSpan={2} className="px-3 py-2 text-right text-[9px] text-slate-400 uppercase tracking-wider">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </td>
              <td className="px-3 py-2 text-center font-mono text-slate-700 dark:text-slate-300">{totalQty.toFixed(3)}</td>
              <td /><td />
              <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                {itemsValue > 0 ? `Rs.${itemsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Totals */}
      {(charges.length > 0 || grandTotal > 0) && (
        <div className={`flex justify-end px-5 py-3 border-t ${D}`}>
          <div className="w-60 space-y-1">
            {itemsValue > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal</span>
                <span className="font-mono">Rs.{itemsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {charges.map((c, i) => (
              <div key={i} className="flex justify-between text-slate-500">
                <span>{c.label}</span>
                <span className="font-mono">Rs.{Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {grandTotal > 0 && (
              <div className={`mt-1.5 rounded-lg px-4 py-2 flex justify-between items-center ${accentBg} border ${accentBorder}`}>
                <span className={`text-xs font-bold uppercase tracking-wide ${accentText}`}>Grand Total</span>
                <span className={`text-lg font-extrabold font-mono ${accentText}`}>
                  Rs.{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bank Details + Signature */}
      <div className={`grid grid-cols-2 border-t ${D}`}>
        <div className={`px-4 py-3 border-r ${D}`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Bank Details</p>
          <div className="space-y-1.5">
            {[
              { icon: Landmark,   label: 'Bank Name',    value: 'HDFC Bank' },
              { icon: Building2,  label: 'Account Name', value: 'Oxycure Pvt. Ltd.' },
              { icon: CreditCard, label: 'Account No.',  value: 'XXXX XXXX XXXX 1234' },
              { icon: Hash,       label: 'IFSC Code',    value: 'HDFC0001234' },
              { icon: MapPin,     label: 'Branch',       value: 'Main Branch' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-slate-400 w-22 shrink-0">{label}</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 flex flex-col">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Receiver&apos;s Signature</p>
          <div className={`flex-1 border border-dashed ${D} rounded-lg min-h-[55px] mb-3`} />
          <div className="space-y-2">
            {['Name', 'Date', 'Stamp / Seal'].map((field) => (
              <div key={field} className="flex items-center gap-2">
                <span className="text-slate-400 w-20 shrink-0">{field}</span>
                <span className={`flex-1 border-b ${D}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`px-5 py-2.5 border-t ${D} bg-slate-50 dark:bg-slate-800/30 flex flex-wrap gap-x-8 gap-y-1.5`}>
        {transfer.notes && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Notes</p>
            <p className="text-slate-600 dark:text-slate-400">{transfer.notes}</p>
          </div>
        )}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Created By</p>
          <p className="font-medium text-slate-700 dark:text-slate-300">{userName(transfer.createdBy)}</p>
          <p className="text-[10px] text-slate-400">{fmt(transfer.createdAt)}</p>
        </div>
        {transfer.confirmedBy && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Confirmed By</p>
            <p className="font-medium text-slate-700 dark:text-slate-300">{userName(transfer.confirmedBy)}</p>
            <p className="text-[10px] text-slate-400">{fmt(transfer.confirmedAt)}</p>
          </div>
        )}
        {transfer.cancelledBy && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Cancelled By</p>
            <p className="font-medium text-slate-700 dark:text-slate-300">{userName(transfer.cancelledBy)}</p>
            <p className="text-[10px] text-slate-400">{fmt(transfer.cancelledAt)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
