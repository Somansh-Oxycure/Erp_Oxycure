'use client';

import React from 'react';
import { Printer, ArrowLeft, Package } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { BoQ, BoQProduct, BoQItem, ProductCharges } from '@/types/api';

function getChargesTotal(charges: ProductCharges | null | undefined): number {
  if (!charges) return 0;
  if (charges.mode === 'combined') return charges.combined ?? 0;
  return (charges.installation ?? 0) + (charges.freight ?? 0) + (charges.labor ?? 0);
}

function hasAnyCharges(products: BoQProduct[]): boolean {
  return products.some((p) => getChargesTotal(p.charges) > 0);
}

function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface BoQViewPanelProps { boq: BoQ; onBack: () => void; }

function ProductTable({ product, startIdx, customColumns }: { product: BoQProduct; startIdx: number; customColumns: { id: string; label: string }[] }) {
  const isFixed = product.priceMode === 'fixed';
  const includedItems = product.items.filter((i) => i.isIncluded);
  const subtotal = isFixed ? Number(product.fixedPrice ?? 0) : includedItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
  const totalCols = 4 + (isFixed ? 0 : 2);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1 flex-wrap">
        <Package className="w-4 h-4 text-sky-400 shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
        {product.template && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{product.template.code}</span>}
        {isFixed && <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Fixed Price</span>}
        {customColumns.length > 0 && customColumns.map((col) => {
          const val = (product.customValues as Record<string, string> | null | undefined)?.[col.id];
          return val ? (
            <span key={col.id} className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full">
              <span className="font-medium">{col.label}:</span> {val}
            </span>
          ) : null;
        })}
      </div>
      <div className="overflow-x-auto">
        {!(includedItems.length === 0 && isFixed) && (
        <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-8">#</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Description</th>
              <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">Size</th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-20">Qty</th>
              {!isFixed && <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground w-32">Rate</th>}
              {!isFixed && <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-36">Total</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {includedItems.length === 0 ? (
              <tr><td colSpan={totalCols} className="px-4 py-4 text-center text-sm text-muted-foreground italic">No components yet — add one below.</td></tr>
            ) : includedItems.map((item, idx) => (
              <tr key={item.id} className="break-inside-avoid">
                <td className="px-4 py-3 text-muted-foreground text-xs">{startIdx + idx + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  {item.remarks && <p className="text-xs text-amber-600 mt-0.5 italic">{item.remarks}</p>}
                </td>
                <td className="px-3 py-3 text-center text-muted-foreground">{item.size ?? '—'}</td>
                <td className="px-3 py-3 text-right text-muted-foreground font-mono">{Number(item.quantity)}</td>
                {!isFixed && <td className="px-3 py-3 text-right text-muted-foreground font-mono">{formatINR(item.unitRate)}</td>}
                {!isFixed && <td className="px-4 py-3 text-right font-semibold text-foreground font-mono">{formatINR(item.totalPrice)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      <div className="flex justify-end pr-1">
        <div className="text-sm font-mono flex items-center gap-3">
          <span className="text-muted-foreground text-xs">{isFixed ? 'Fixed Product Price' : 'Product Subtotal'}</span>
          <span className="font-semibold text-foreground">{formatINR(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Professional Print Function ──────────────────────────────────────────────
function buildPrintHTML(boq: BoQ): string {
  const customCols = (boq.customColumns ?? []) as { id: string; label: string }[];

  const productsSubtotal = boq.products.reduce(
    (sum, p) => sum + (p.priceMode === 'fixed' ? Number(p.fixedPrice ?? 0) : p.items.filter((i: BoQItem) => i.isIncluded).reduce((s: number, i: BoQItem) => s + Number(i.totalPrice), 0)),
    0,
  );
  const chargesSubtotal = boq.products.reduce((sum, p) => sum + getChargesTotal(p.charges), 0);
  const grandTotal = productsSubtotal + chargesSubtotal;
  const anyCharges = chargesSubtotal > 0;
  const anyItemizedCharges = boq.products.some(
    (p) => p.charges?.mode === 'itemized' && getChargesTotal(p.charges) > 0,
  );

  // ─── Per-product sections (own table per product, columns adapt to type) ──
  const productSections = boq.products.map((product, idx) => {
    const isFixed = product.priceMode === 'fixed';
    const includedItems = product.items.filter((i: BoQItem) => i.isIncluded);
    const productPrice = isFixed
      ? Number(product.fixedPrice ?? 0)
      : includedItems.reduce((s: number, i: BoQItem) => s + Number(i.totalPrice), 0);

    const customVals = (product.customValues as Record<string, string> | null) ?? {};
    const pillsHtml = customCols
      .filter((col) => customVals[col.id])
      .map((col) => `<span class="cpill"><span class="cpill-k">${col.label}</span>&nbsp;${customVals[col.id]}</span>`)
      .join('');

    const hdr = `<div class="ps-hdr">
        <div class="ps-hdr-l">
          <span class="ps-num">${String(idx + 1).padStart(2, '0')}</span>
          <span class="ps-name">${product.name}</span>
          ${product.template ? `<span class="badge bd-blue">${product.template.code}</span>` : ''}
          ${isFixed ? `<span class="badge bd-green">Fixed&nbsp;Price</span>` : ''}
          ${pillsHtml}
        </div>
        <span class="ps-ctr">${idx + 1}&nbsp;/&nbsp;${boq.products.length}</span>
      </div>`;

    let body = '';
    if (isFixed) {
      if (includedItems.length > 0) {
        const hasSz = includedItems.some((i: BoQItem) => i.size && i.size.trim());
        let n = 0;
        const rows = includedItems.map((item: BoQItem) => {
          n++;
          return `<tr>
            <td class="td-num">${n}</td>
            <td class="td-desc"><strong>${item.name}</strong>${item.description ? `<div class="td-sub">${item.description}</div>` : ''}${item.remarks ? `<div class="td-rem">${item.remarks}</div>` : ''}</td>
            ${hasSz ? `<td class="td-ctr">${item.size || '—'}</td>` : ''}
            <td class="td-r">${Number(item.quantity)}</td>
          </tr>`;
        }).join('');
        body = `<table class="pt"><thead><tr>
            <th class="td-num">#</th><th>Description / Component</th>
            ${hasSz ? `<th class="td-ctr" style="width:65px">Size</th>` : ''}
            <th class="td-r" style="width:50px">Qty</th>
          </tr></thead><tbody>${rows}</tbody></table>`;
      }
      body += `<div class="ps-fp"><span class="ps-fp-lbl">Lump&nbsp;Sum&nbsp;Fixed&nbsp;Price</span><span class="ps-fp-val">${formatINR(productPrice)}</span></div>`;
    } else {
      const hasSz = includedItems.some((i: BoQItem) => i.size && i.size.trim());
      let n = 0;
      const rows = includedItems.map((item: BoQItem) => {
        n++;
        return `<tr>
          <td class="td-num">${n}</td>
          <td class="td-desc"><strong>${item.name}</strong>${item.description ? `<div class="td-sub">${item.description}</div>` : ''}${item.remarks ? `<div class="td-rem">${item.remarks}</div>` : ''}</td>
          ${hasSz ? `<td class="td-ctr">${item.size || '—'}</td>` : ''}
          <td class="td-r">${Number(item.quantity)}</td>
          <td class="td-r td-mono">${formatINR(item.unitRate)}</td>
          <td class="td-r td-mono td-amt">${formatINR(item.totalPrice)}</td>
        </tr>`;
      }).join('');
      const subCs = hasSz ? 4 : 3;
      body = `<table class="pt"><thead><tr>
          <th class="td-num">#</th><th>Description / Component</th>
          ${hasSz ? `<th class="td-ctr" style="width:65px">Size</th>` : ''}
          <th class="td-r" style="width:50px">Qty</th>
          <th class="td-r" style="width:110px">Rate&nbsp;(₹)</th>
          <th class="td-r" style="width:120px">Amount&nbsp;(₹)</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="pt-sub">
          <td colspan="${subCs}" class="td-r pt-sub-lbl">Sub-total</td>
          <td colspan="2" class="td-r td-mono td-amt pt-sub-val">${formatINR(productPrice)}</td>
        </tr></tfoot>
      </table>`;
    }
    return `<div class="ps">${hdr}${body}</div>`;
  }).join('');

  // ─── Summary section (only columns with actual data) ───────────────────────
  const summaryRows = boq.products.map((product, idx) => {
    const isFixed = product.priceMode === 'fixed';
    const productPrice = isFixed
      ? Number(product.fixedPrice ?? 0)
      : product.items.filter((i: BoQItem) => i.isIncluded).reduce((s: number, i: BoQItem) => s + Number(i.totalPrice), 0);
    const c = product.charges;
    const chargeTotal = getChargesTotal(c);
    const rowTotal = productPrice + chargeTotal;
    const isItemized = c?.mode === 'itemized';
    const customVals = (product.customValues as Record<string, string> | null) ?? {};
    const pillsHtml = customCols
      .filter((col) => customVals[col.id])
      .map((col) => `<span class="s-pill"><span class="s-pk">${col.label}</span>&nbsp;${customVals[col.id]}</span>`)
      .join('');

    const installTd = anyItemizedCharges
      ? `<td class="td-r td-mono">${isItemized && chargeTotal > 0 ? formatINR(c?.installation ?? 0) : '<span class="nil">—</span>'}</td>` : '';
    const freightTd = anyItemizedCharges
      ? `<td class="td-r td-mono">${isItemized && chargeTotal > 0 ? formatINR(c?.freight ?? 0) : '<span class="nil">—</span>'}</td>` : '';
    const labourTd = anyItemizedCharges
      ? `<td class="td-r td-mono">${isItemized && chargeTotal > 0 ? formatINR(c?.labor ?? 0) : '<span class="nil">—</span>'}</td>` : '';
    // "Other/Combined" col: show combined-mode totals; itemized products show — here (their breakdown is in install/freight/labour cols)
    const chargesTd = anyCharges
      ? `<td class="td-r td-mono">${chargeTotal > 0 && (!anyItemizedCharges || !isItemized) ? formatINR(chargeTotal) : '<span class="nil">—</span>'}</td>` : '';
    const totalTd = anyCharges
      ? `<td class="td-r td-mono s-row-total">${formatINR(rowTotal)}</td>` : '';

    return `<tr>
      <td class="td-num">${idx + 1}</td>
      <td class="td-desc"><strong>${product.name}</strong>${pillsHtml ? `<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:3px">${pillsHtml}</div>` : ''}</td>
      <td class="td-r td-mono">${formatINR(productPrice)}</td>
      ${installTd}${freightTd}${labourTd}${chargesTd}${totalTd}
    </tr>`;
  }).join('');

  const installTh = anyItemizedCharges ? `<th class="td-r" style="width:85px">Installation</th>` : '';
  const freightTh  = anyItemizedCharges ? `<th class="td-r" style="width:70px">Freight</th>` : '';
  const labourTh   = anyItemizedCharges ? `<th class="td-r" style="width:70px">Labour</th>` : '';
  const chargesTh  = anyCharges ? `<th class="td-r" style="width:100px">${anyItemizedCharges ? 'Other' : 'Installation2q '}</th>` : '';
  const totalTh    = anyCharges ? `<th class="td-r" style="width:115px">Grand Total</th>` : '';

  const installFt = anyItemizedCharges ? `<td></td>` : '';
  const freightFt  = anyItemizedCharges ? `<td></td>` : '';
  const labourFt   = anyItemizedCharges ? `<td></td>` : '';
  const chargesFt  = anyCharges ? `<td class="td-r td-mono s-ft-charges">${formatINR(chargesSubtotal)}</td>` : '';
  const totalFt    = anyCharges ? `<td class="td-r td-mono s-ft-grand">${formatINR(grandTotal)}</td>` : '';
  const priceFt    = `<td class="td-r td-mono ${anyCharges ? 's-ft-charges' : 's-ft-grand'}">${formatINR(productsSubtotal)}</td>`;

  const summarySection = `
  <div class="sum-wrap">
    <div class="sum-title">Project Summary</div>
    <table class="sum-table">
      <thead><tr>
        <th class="td-num">#</th>
        <th>Product / System</th>
        <th class="td-r" style="width:115px">Product Price</th>
        ${installTh}${freightTh}${labourTh}${chargesTh}${totalTh}
      </tr></thead>
      <tbody>${summaryRows}</tbody>
      <tfoot><tr class="s-ft">
        <td colspan="2" class="s-ft-lbl">TOTALS</td>
        ${priceFt}${installFt}${freightFt}${labourFt}${chargesFt}${totalFt}
      </tr></tfoot>
    </table>
  </div>`;

  const preparedBy = boq.preparedBy
    ? `${boq.preparedBy.firstName} ${boq.preparedBy.lastName}`
    : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Bill of Quantities — ${boq.boqNumber}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1a202c; background: #fff; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 14mm 20mm; position: relative; }

    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 3px solid #1e293b; margin-bottom: 16px; }
    .co-name { font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1; }
    .co-tag { font-size: 7.5pt; color: #64748b; margin-top: 2px; letter-spacing: 0.5px; text-transform: uppercase; }
    .co-contact { text-align: right; font-size: 7.5pt; color: #475569; line-height: 1.7; }
    .co-contact strong { color: #1e293b; }

    .doc-title-bar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 9px 14px; border-radius: 5px; margin-bottom: 16px; }
    .doc-title-bar h1 { font-size: 12pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
    .doc-meta { text-align: right; font-size: 8pt; line-height: 1.7; color: #94a3b8; }
    .doc-meta strong { color: #e2e8f0; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #cbd5e1; border-radius: 5px; overflow: hidden; margin-bottom: 18px; font-size: 9pt; }
    .info-cell { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
    .info-cell:nth-child(odd) { border-right: 1px solid #e2e8f0; }
    .info-cell:nth-last-child(-n+2) { border-bottom: none; }
    .info-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 2px; }
    .info-value { font-weight: 600; color: #1e293b; }

    .sec-div { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; padding: 12px 0 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px; }

    /* ── Per-product sections ── */
    .ps { margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; page-break-inside: avoid; }
    .ps-hdr { display: flex; justify-content: space-between; align-items: center; background: #1e293b; color: #fff; padding: 7px 12px; flex-wrap: wrap; gap: 6px; }
    .ps-hdr-l { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1; min-width: 0; }
    .ps-num { font-size: 8.5pt; font-weight: 700; color: #94a3b8; font-family: monospace; min-width: 22px; flex-shrink: 0; }
    .ps-name { font-size: 10pt; font-weight: 700; color: #f1f5f9; }
    .ps-ctr { font-size: 7pt; color: #64748b; white-space: nowrap; flex-shrink: 0; }
    .badge { font-size: 7pt; padding: 2px 6px; border-radius: 3px; font-weight: 600; white-space: nowrap; }
    .bd-blue { background: #334155; color: #e2e8f0; }
    .bd-green { background: #334155; color: #e2e8f0; }
    .cpill { display: inline-flex; align-items: center; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; padding: 1px 6px; font-size: 7pt; color: #cbd5e1; }
    .cpill-k { color: #94a3b8; margin-right: 2px; }

    /* ── Product table ── */
    .pt { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .pt thead tr { background: #f1f5f9; }
    .pt thead th { padding: 5px 8px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #475569; border-bottom: 2px solid #cbd5e1; text-align: left; }
    .pt tbody tr:nth-child(even) { background: #f8fafc; }
    .pt tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .td-num { text-align: center; color: #9ca3af; font-size: 8pt; width: 26px; background: #f8fafc; border-right: 1px solid #e2e8f0; }
    .td-desc strong { font-weight: 600; color: #1e293b; font-size: 9pt; }
    .td-sub { color: #64748b; font-size: 7.5pt; margin-top: 1px; }
    .td-rem { color: #78716c; font-style: italic; font-size: 7.5pt; margin-top: 1px; }
    .td-ctr { text-align: center; color: #6b7280; }
    .td-r { text-align: right; }
    .td-mono { font-family: 'Courier New', monospace; }
    .td-amt { font-weight: 600; color: #0f172a; }
    .ps-fp { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .ps-fp-lbl { font-size: 7.5pt; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
    .ps-fp-val { font-size: 11pt; font-weight: 700; color: #0f172a; font-family: 'Courier New', monospace; }
    .pt-sub td { background: #f1f5f9 !important; border-top: 2px solid #cbd5e1 !important; padding: 6px 8px; }
    .pt-sub-lbl { font-size: 8pt; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.3px; }
    .pt-sub-val { font-size: 10.5pt; color: #0f172a; }

    /* ── Summary section ── */
    .sum-wrap { margin-top: 18px; margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; }
    .sum-title { background: #1e293b; color: #e2e8f0; padding: 7px 12px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .sum-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .sum-table thead tr { background: #334155; }
    .sum-table thead th { padding: 6px 10px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #cbd5e1; border-right: 1px solid rgba(255,255,255,0.1); text-align: left; }
    .sum-table thead th:last-child { border-right: none; }
    .sum-table tbody tr:nth-child(even) { background: #f8fafc; }
    .sum-table tbody td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; vertical-align: middle; }
    .sum-table tbody td:last-child { border-right: none; }
    .s-pill { display: inline-flex; align-items: center; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; padding: 1px 6px; font-size: 7pt; color: #334155; }
    .s-pk { color: #6b7280; font-weight: 400; margin-right: 2px; }
    .s-row-total { font-weight: 700; color: #0f172a; background: #f1f5f9 !important; }
    .nil { color: #d1d5db; }
    .s-ft td { padding: 8px 10px; border-top: 2px solid #334155; background: #f1f5f9; font-weight: 700; }
    .s-ft-lbl { font-size: 9pt; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
    .s-ft-charges { text-align: right; font-family: 'Courier New', monospace; color: #374151; font-size: 9.5pt; }
    .s-ft-grand { text-align: right; font-family: 'Courier New', monospace; color: #0f172a; font-size: 11pt; font-weight: 700; background: #e2e8f0 !important; }

    /* ── Grand Total Box ── */
    .gt-section { display: flex; justify-content: flex-end; margin: 18px 0 22px; }
    .gt-box { width: 290px; border: 2px solid #334155; border-radius: 5px; overflow: hidden; }
    .gt-row { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 9pt; border-bottom: 1px solid #e2e8f0; }
    .gt-row:last-child { border-bottom: none; }
    .gt-lbl { color: #64748b; }
    .gt-val { font-family: 'Courier New', monospace; font-weight: 600; color: #1e293b; }
    .gt-grand { background: #0f172a; }
    .gt-grand .gt-lbl { color: #94a3b8; font-weight: 700; font-size: 9.5pt; text-transform: uppercase; }
    .gt-grand .gt-val { color: #fff; font-size: 12pt; }

    .notes-wrap { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 9px 12px; margin-bottom: 20px; font-size: 9pt; }
    .notes-wrap .n-lbl { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 3px; font-weight: 700; }
    .terms { font-size: 7.5pt; color: #64748b; line-height: 1.7; margin-bottom: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    .terms strong { color: #1e293b; font-size: 8pt; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; }
    .sig-block { font-size: 9pt; }
    .sig-lbl { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 34px; }
    .sig-line { border-top: 1px solid #1e293b; padding-top: 4px; font-weight: 600; color: #1e293b; }
    .footer { position: absolute; bottom: 8mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; font-size: 7pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; }

    @media print {
      body { padding: 0; }
      .page { padding: 8mm 10mm 18mm; }
      .ps { page-break-inside: avoid; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="letterhead">
    <div>
      <div class="co-name">OXYCURE</div>
      <div class="co-tag">Air Quality Solutions &amp; Engineering</div>
    </div>
    <div class="co-contact">
      <strong>Oxycure Technologies Pvt. Ltd.</strong><br/>
      www.oxycure.in &nbsp;|&nbsp; info@oxycure.in<br/>
      GSTIN: 00AAAAA0000A0Z0
    </div>
  </div>

  <div class="doc-title-bar">
    <h1>Bill of Quantities</h1>
    <div class="doc-meta">
      <strong>${boq.boqNumber}</strong><br/>
      Date: ${formatDate(boq.createdAt)}<br/>
      Status: ${boq.status.toUpperCase()}
    </div>
  </div>

  <div class="info-grid">
    <div class="info-cell"><div class="info-label">Client Name</div><div class="info-value">${boq.proposal?.ticket?.clientName ?? '—'}</div></div>
    <div class="info-cell"><div class="info-label">Reference No.</div><div class="info-value">${boq.proposal?.ticket?.referenceId ?? '—'}</div></div>
    <div class="info-cell"><div class="info-label">Project Name</div><div class="info-value">${boq.proposal?.ticket?.projectName ?? '—'}</div></div>
    <div class="info-cell"><div class="info-label">Prepared By</div><div class="info-value">${preparedBy}</div></div>
  </div>

  <div class="sec-div">Itemised Breakdown</div>

  ${productSections}

  ${summarySection}

  <div class="gt-section">
    <div class="gt-box">
      ${anyCharges ? `
      <div class="gt-row"><span class="gt-lbl">Products Sub-total</span><span class="gt-val">${formatINR(productsSubtotal)}</span></div>
      <div class="gt-row"><span class="gt-lbl">Additional Charges</span><span class="gt-val">${formatINR(chargesSubtotal)}</span></div>` : ''}
      <div class="gt-row gt-grand"><span class="gt-lbl">GRAND TOTAL</span><span class="gt-val">${formatINR(grandTotal)}</span></div>
    </div>
  </div>

  ${boq.notes ? `<div class="notes-wrap"><div class="n-lbl">Notes</div><div>${boq.notes.replace(/\n/g, '<br/>')}</div></div>` : ''}

  <div class="terms">
    <strong>Terms &amp; Conditions:</strong><br/>
    1. This Bill of Quantities is subject to revision based on final site measurements and specifications.<br/>
    2. Prices are exclusive of GST unless otherwise stated. GST will be charged as applicable.<br/>
    3. Validity of this quotation is 30 days from the date of issue.<br/>
    4. Payment terms: as per agreement.
  </div>

  <div class="sig-grid">
    <div class="sig-block"><div class="sig-lbl">Prepared &amp; Authorised by</div><div class="sig-line">For Oxycure Technologies Pvt. Ltd.</div></div>
    <div class="sig-block"><div class="sig-lbl">Client Acceptance</div><div class="sig-line">Authorised Signatory</div></div>
  </div>

  <div class="footer">
    <span>Oxycure Technologies Pvt. Ltd. — Confidential</span>
    <span>${boq.boqNumber} | Generated ${new Date().toLocaleDateString('en-IN')}</span>
  </div>

</div>
<script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
}
export function BoQViewPanel({ boq, onBack }: BoQViewPanelProps) {
  const productsSubtotal = boq.products.reduce((sum, p) => sum + (p.priceMode === 'fixed' ? Number(p.fixedPrice ?? 0) : p.items.filter((i) => i.isIncluded).reduce((s, i) => s + Number(i.totalPrice), 0)), 0);
  const chargesSubtotal = boq.products.reduce((sum, p) => sum + getChargesTotal(p.charges), 0);
  const grandTotal = productsSubtotal + chargesSubtotal;

  function handlePrint() {
    const html = buildPrintHTML(boq);
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Proposal
        </button>
        <div className="flex items-center gap-2">
          <StatusBadge status={boq.status} />
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print BoQ
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-wide uppercase">Bill of Quantities</h2>
            <p className="text-sm font-mono text-muted-foreground mt-0.5">{boq.boqNumber}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{formatDate(boq.createdAt)}</p>
            <p className="mt-0.5 text-xs">{boq.products.length} product{boq.products.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border text-sm">
          <div className="space-y-1">
            <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">Project</span><span className="font-medium text-foreground">{boq.proposal?.ticket?.projectName || '—'}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-20 shrink-0">Client</span><span className="font-medium text-foreground">{boq.proposal?.ticket?.clientName || '—'}</span></div>
          </div>
          <div className="space-y-1">
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Prepared by</span><span className="font-medium text-foreground">{boq.preparedBy ? `${boq.preparedBy.firstName} ${boq.preparedBy.lastName}` : '—'}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Ref (Proposal)</span><span className="font-medium text-foreground">{boq.proposal?.ticket?.referenceId || '—'}</span></div>
          </div>
        </div>

        {boq.products.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8 italic">No products in this BoQ.</p>
        ) : (
          <div className="space-y-6">
            {boq.products.map((product) => (
              <ProductTable key={product.id} product={product} startIdx={0} customColumns={boq.customColumns ?? []} />
            ))}
          </div>
        )}

        {/* Summary & Additional Charges */}
        {boq.products.length > 0 && (
          <div className="border border-amber-500/30 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
              <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Summary &amp; Additional Charges</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Product / System</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-32">Product Price</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">Installation</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-24">Freight</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-24">Labour</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">Add. Charges</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground w-36">Row Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {boq.products.map((product) => {
                    const c = product.charges;
                    const chargeTotal = getChargesTotal(c);
                    const isItemized = c?.mode === 'itemized';
                    const isFixed = product.priceMode === 'fixed';
                    const productPrice = isFixed
                      ? Number(product.fixedPrice ?? 0)
                      : product.items.filter((i) => i.isIncluded).reduce((s, i) => s + Number(i.totalPrice), 0);
                    const rowTotal = productPrice + chargeTotal;
                    const customCols = (boq.customColumns ?? []) as { id: string; label: string }[];
                    const customVals = (product.customValues as Record<string, string> | null) ?? {};
                    const colPills = customCols.filter((col) => customVals[col.id]);
                    const dash = <span className="text-muted-foreground">—</span>;
                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-foreground">{product.name}</p>
                          {colPills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {colPills.map((col) => (
                                <span key={col.id} className="inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 rounded px-1.5 py-0.5 text-[10px] text-sky-600 dark:text-sky-400">
                                  <span className="text-muted-foreground font-normal">{col.label}</span>
                                  <span className="font-semibold">{customVals[col.id]}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-foreground font-mono text-xs">{formatINR(productPrice)}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground font-mono text-xs">{c && isItemized ? formatINR(c.installation ?? 0) : dash}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground font-mono text-xs">{c && isItemized ? formatINR(c.freight ?? 0) : dash}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground font-mono text-xs">{c && isItemized ? formatINR(c.labor ?? 0) : dash}</td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground font-mono text-xs">{chargeTotal > 0 ? formatINR(chargeTotal) : dash}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(rowTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-border">
                  <tr className="bg-muted/30">
                    <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" colSpan={5}>Totals</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-foreground font-mono text-xs">{formatINR(chargesSubtotal)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <div className="w-72 space-y-1.5 text-sm font-mono">
            {chargesSubtotal > 0 && <>
              <div className="flex justify-between text-muted-foreground">
                <span className="font-sans text-xs">Products Sub-total</span>
                <span>{formatINR(productsSubtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="font-sans text-xs">Additional Charges</span>
                <span>{formatINR(chargesSubtotal)}</span>
              </div>
            </>}
            <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border">
              <span className="font-sans">Grand Total</span>
              <span className="text-emerald-500">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {boq.notes && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
            <p className="text-foreground whitespace-pre-wrap">{boq.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

