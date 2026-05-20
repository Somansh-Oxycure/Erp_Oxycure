'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronDown, Loader2, X, Package, PackagePlus, Columns, Tag, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBoQReducer } from '@/hooks/boq/useBoQReducer';
import type { CustomColumn } from '@/hooks/boq/useBoQReducer';
import { useBoQTemplates } from '@/hooks/boq/useBoQTemplates';
import { useBoQTemplate } from '@/hooks/boq/useBoQTemplate';
import { useCreateBoQ } from '@/hooks/boq/useCreateBoQ';
import { useUpdateBoQ } from '@/hooks/boq/useUpdateBoQ';
import type { BoQ, BoQProductDraft } from '@/types/api';

function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface ItemError { name?: string; quantity?: string; unitRate?: string; fixedPrice?: string; }

function validateProducts(products: BoQProductDraft[]): {
  valid: boolean;
  errors: Record<string, ItemError>;
  productErrors: Record<string, ItemError>;
  noProducts: boolean;
  noItems: boolean;
} {
  if (products.length === 0) return { valid: false, errors: {}, productErrors: {}, noProducts: true, noItems: false };
  const errors: Record<string, ItemError> = {};
  const productErrors: Record<string, ItemError> = {};
  let valid = true;
  let anyMissingItems = false;

  for (const product of products) {
    if (product.priceMode === 'fixed') {
      if (product.fixedPrice < 0) {
        productErrors[product.localId] = { fixedPrice: 'Cannot be negative' };
        valid = false;
      }
    } else {
      const includedItems = product.items.filter((i) => i.isIncluded);
      if (includedItems.length === 0) { anyMissingItems = true; valid = false; }
      for (const item of includedItems) {
        const e: ItemError = {};
        if (!item.name.trim()) { e.name = 'Required'; valid = false; }
        if (item.quantity <= 0) { e.quantity = 'Must be > 0'; valid = false; }
        if (item.unitRate < 0) { e.unitRate = 'Cannot be negative'; valid = false; }
        if (Object.keys(e).length > 0) errors[item.localId] = e;
      }
    }
  }
  return { valid, errors, productErrors, noProducts: false, noItems: anyMissingItems };
}

// ─── Inline column label editor ───────────────────────────────────────────────

function ColumnLabelEditor({ col, dispatch }: { col: CustomColumn; dispatch: ReturnType<typeof useBoQReducer>[1] }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(col.label);

  // Sync local val with external col.label changes (e.g. after LOAD_EXISTING)
  useEffect(() => {
    if (!editing) setVal(col.label);
  }, [col.label, editing]);

  function commit() {
    const t = val.trim();
    if (t && t !== col.label) dispatch({ type: 'RENAME_COLUMN', colId: col.id, label: t });
    else setVal(col.label);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(col.label); setEditing(false); } }}
        className="bg-transparent border-b border-sky-500 text-xs focus:outline-none w-20"
      />
    );
  }
  return (
    <span className="cursor-pointer hover:text-sky-400 transition-colors" title="Click to rename" onClick={() => setEditing(true)}>
      {col.label}
    </span>
  );
}

// ─── Product Section ──────────────────────────────────────────────────────────

interface ProductSectionProps {
  product: BoQProductDraft;
  customColumns: CustomColumn[];
  errors: Record<string, ItemError>;
  productErrors: Record<string, ItemError>;
  dispatch: ReturnType<typeof useBoQReducer>[1];
  isOnly: boolean;
}

function ProductSection({ product, customColumns, errors, productErrors, dispatch, isOnly }: ProductSectionProps) {
  const isFixed = product.priceMode === 'fixed';
  const productTotal = isFixed
    ? product.fixedPrice
    : product.items.filter((i) => i.isIncluded).reduce((sum, i) => sum + i.totalPrice, 0);
  const prodErr = productErrors[product.localId];
  const totalCols = 4 + (isFixed ? 1 : 2);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Product header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border flex-wrap">
        <Package className="w-4 h-4 text-sky-400 shrink-0" />
        <input
          value={product.name}
          onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT_NAME', productLocalId: product.localId, name: e.target.value })}
          placeholder="Product / system name"
          className="flex-1 min-w-[140px] bg-transparent text-sm font-semibold text-foreground focus:outline-none placeholder:text-muted-foreground/50 border-b border-transparent hover:border-border focus:border-sky-500"
        />
        {product.templateId && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">Template</span>}

        {/* Pricing mode toggle */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => dispatch({ type: 'SET_PRODUCT_PRICE_MODE', productLocalId: product.localId, priceMode: 'component' })}
            className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', !isFixed ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            By Rate
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_PRODUCT_PRICE_MODE', productLocalId: product.localId, priceMode: 'fixed' })}
            className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', isFixed ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            Fixed Price
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-emerald-400">{formatINR(productTotal)}</span>
          {!isOnly && (
            <button onClick={() => dispatch({ type: 'REMOVE_PRODUCT', productLocalId: product.localId })} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove product">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Custom column values — one value per product */}
      {customColumns.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 bg-sky-500/5 border-b border-border/60">
          {customColumns.map((col) => (
            <label key={col.id} className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-sky-400 shrink-0 whitespace-nowrap">{col.label}:</span>
              <input
                value={product.customValues[col.id] ?? ''}
                onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT_CUSTOM_VALUE', productLocalId: product.localId, colId: col.id, value: e.target.value })}
                placeholder="—"
                className="w-24 bg-transparent border-b border-transparent hover:border-border focus:border-sky-500 text-xs text-foreground focus:outline-none py-0.5 placeholder:text-muted-foreground/40"
              />
            </label>
          ))}
        </div>
      )}

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-6">#</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Component</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">Size</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Qty</th>
              {!isFixed && <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">Rate (₹)</th>}
              {!isFixed && <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">Total</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {product.items.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  {isFixed ? 'No spec rows — this is a fixed-price product.' : 'No components yet — add one below.'}
                </td>
              </tr>
            ) : product.items.map((item, idx) => {
              const ie = errors[item.localId];
              return (
                <tr key={item.localId} className={cn('transition-colors', item.isOptional && !item.isIncluded ? 'opacity-50 bg-muted/20' : 'bg-card')}>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {item.isOptional
                      ? <input type="checkbox" checked={item.isIncluded} onChange={() => dispatch({ type: 'TOGGLE_INCLUDED', productLocalId: product.localId, itemLocalId: item.localId })} className="w-3.5 h-3.5 rounded accent-sky-500" />
                      : <span>{idx + 1}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <input value={item.name} onChange={(e) => dispatch({ type: 'UPDATE_ITEM', productLocalId: product.localId, itemLocalId: item.localId, patch: { name: e.target.value } })} placeholder="Component name" className={cn('w-full bg-transparent border-b text-sm focus:outline-none focus:border-sky-500 py-0.5 placeholder:text-muted-foreground/50', ie?.name ? 'border-red-500' : 'border-transparent hover:border-border')} />
                    {ie?.name && <p className="text-xs text-red-500 mt-0.5">{ie.name}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <input value={item.size} onChange={(e) => dispatch({ type: 'UPDATE_ITEM', productLocalId: product.localId, itemLocalId: item.localId, patch: { size: e.target.value } })} placeholder="e.g. 100×40" className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-sky-500 text-sm focus:outline-none py-0.5 placeholder:text-muted-foreground/50" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="0.001" value={item.quantity} onChange={(e) => dispatch({ type: 'UPDATE_ITEM', productLocalId: product.localId, itemLocalId: item.localId, patch: { quantity: parseFloat(e.target.value) || 0 } })} className={cn('w-full bg-transparent border-b text-sm focus:outline-none focus:border-sky-500 py-0.5', ie?.quantity ? 'border-red-500' : 'border-transparent hover:border-border')} />
                    {ie?.quantity && <p className="text-xs text-red-500 mt-0.5">{ie.quantity}</p>}
                  </td>
                  {!isFixed && (
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.01" value={item.unitRate} onChange={(e) => dispatch({ type: 'UPDATE_ITEM', productLocalId: product.localId, itemLocalId: item.localId, patch: { unitRate: parseFloat(e.target.value) || 0 } })} className={cn('w-full bg-transparent border-b text-sm focus:outline-none focus:border-sky-500 py-0.5', ie?.unitRate ? 'border-red-500' : 'border-transparent hover:border-border')} />
                      {ie?.unitRate && <p className="text-xs text-red-500 mt-0.5">{ie.unitRate}</p>}
                    </td>
                  )}
                  {!isFixed && (
                    <td className="px-3 py-2 text-right text-sm font-mono text-foreground">{formatINR(item.totalPrice)}</td>
                  )}
                  <td className="px-2 py-2">
                    <button onClick={() => dispatch({ type: 'REMOVE_ITEM', productLocalId: product.localId, itemLocalId: item.localId })} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove row">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Product footer */}
      <div className="px-3 py-2 border-t border-border bg-muted/10 flex items-center gap-4 flex-wrap">
        <button onClick={() => dispatch({ type: 'ADD_ITEM', productLocalId: product.localId })} className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-400 font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> {isFixed ? 'Add Spec Row' : 'Add Component'}
        </button>
        {isFixed && (
          <div className="flex items-center gap-2 ml-auto">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs text-muted-foreground">Product Price (₹)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={product.fixedPrice}
              onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT_FIXED_PRICE', productLocalId: product.localId, fixedPrice: parseFloat(e.target.value) || 0 })}
              className={cn('w-36 bg-background border rounded-lg px-2 py-1 text-sm font-mono text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30', prodErr?.fixedPrice ? 'border-red-500' : 'border-border')}
            />
            {prodErr?.fixedPrice && <span className="text-xs text-red-500">{prodErr.fixedPrice}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface BoQBuilderPanelProps { proposalId: string; existingBoQ?: BoQ | null; onClose: () => void; onSaved: () => void; }

export function BoQBuilderPanel({ proposalId, existingBoQ, onClose, onSaved }: BoQBuilderPanelProps) {
  const isEditing = !!existingBoQ;
  const [state, dispatch] = useBoQReducer();
  const [errors, setErrors] = useState<Record<string, ItemError>>({});
  const [productErrors, setProductErrors] = useState<Record<string, ItemError>>({});
  const [noProductsError, setNoProductsError] = useState(false);
  const [noItemsError, setNoItemsError] = useState(false);
  const [pickerTemplateId, setPickerTemplateId] = useState<string>('');
  const [showPicker, setShowPicker] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);

  const { data: templates = [], isLoading: templatesLoading } = useBoQTemplates();
  const { data: pickedTemplate, isFetching: templateFetching } = useBoQTemplate(pickerTemplateId || null);
  const createMutation = useCreateBoQ(proposalId);
  const updateMutation = useUpdateBoQ(existingBoQ?.id ?? '', proposalId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const initialised = useRef(false);
  useEffect(() => {
    if (isEditing && existingBoQ && !initialised.current) {
      initialised.current = true;
      dispatch({ type: 'LOAD_EXISTING', boq: existingBoQ });
    }
  }, [isEditing, existingBoQ, dispatch]);

  const prevPickedId = useRef<string | null>(null);
  useEffect(() => {
    if (pickedTemplate && pickedTemplate.id !== prevPickedId.current && pickerTemplateId) {
      prevPickedId.current = pickedTemplate.id;
      dispatch({ type: 'ADD_PRODUCT_FROM_TEMPLATE', template: pickedTemplate });
      setPickerTemplateId('');
      setShowPicker(false);
    }
  }, [pickedTemplate, pickerTemplateId, dispatch]);

  const grandTotal = state.products.reduce((sum, p) => {
    const productTotal = p.priceMode === 'fixed' ? p.fixedPrice : p.items.filter((i) => i.isIncluded).reduce((s, i) => s + i.totalPrice, 0);
    const c = p.charges;
    const chargesTotal = c.mode === 'combined' ? (c.combined ?? 0) : (c.installation ?? 0) + (c.freight ?? 0) + (c.labor ?? 0);
    return sum + productTotal + chargesTotal;
  }, 0);

  function handleAddColumn() {
    const label = newColLabel.trim();
    if (!label) return;
    dispatch({ type: 'ADD_COLUMN', label });
    setNewColLabel('');
    setShowAddCol(false);
  }

  async function handleSave() {
    const { valid, errors: itemErrors, productErrors: pErrors, noProducts, noItems } = validateProducts(state.products);
    setErrors(itemErrors);
    setProductErrors(pErrors);
    setNoProductsError(noProducts);
    setNoItemsError(noItems);
    if (!valid) {
      toast.error(noProducts ? 'Add at least one product' : noItems ? 'Each component-priced product needs at least one included item' : 'Please fix validation errors');
      return;
    }
    const productsPayload = state.products.map((prod, i) => ({
      templateId: prod.templateId ?? undefined,
      name: prod.name,
      description: prod.description || undefined,
      sortOrder: i,
      priceMode: prod.priceMode,
      fixedPrice: prod.priceMode === 'fixed' ? prod.fixedPrice : undefined,
      customValues: Object.keys(prod.customValues).length > 0 ? prod.customValues : undefined,
      charges: prod.charges,
      items: prod.items.map((item, j) => ({
        templateComponentId: item.templateComponentId ?? undefined,
        name: item.name,
        description: item.description || undefined,
        size: item.size || undefined,
        quantity: item.quantity,
        unitRate: prod.priceMode === 'component' ? item.unitRate : 0,
        remarks: item.remarks || undefined,
        sortOrder: item.sortOrder ?? j,
        isOptional: item.isOptional,
        isIncluded: item.isIncluded,
      })),
    }));
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ notes: state.notes, customColumns: state.customColumns, products: productsPayload });
      } else {
        await createMutation.mutateAsync({ proposalId, notes: state.notes, customColumns: state.customColumns, products: productsPayload });
      }
      toast.success(isEditing ? 'BoQ updated successfully' : 'BoQ created successfully');
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isEditing ? 'Failed to update BoQ' : 'Failed to create BoQ'));
    }
  }

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/50">
        <h2 className="text-sm font-semibold text-foreground">{isEditing ? 'Edit Bill of Quantities' : 'Generate Bill of Quantities'}</h2>
        <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-5 space-y-5">
        {/* Validation banners */}
        {noProductsError && <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">Add at least one product to the BoQ.</p>}
        {noItemsError && <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">Each component-priced product must have at least one included component.</p>}

        {/* Custom columns toolbar */}
        <div className="flex items-center flex-wrap gap-2 p-3 bg-muted/20 rounded-xl border border-border/50">
          <Columns className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground font-medium shrink-0">Custom Columns:</span>

          {state.customColumns.length === 0 && !showAddCol && (
            <span className="text-xs text-muted-foreground/50 italic">None added — use these for CFM, Location, Floor, etc.</span>
          )}

          {state.customColumns.map((col) => (
            <span key={col.id} className="inline-flex items-center gap-1 bg-background border border-border rounded-full px-2.5 py-0.5 text-xs text-foreground shadow-sm">
              <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
              <ColumnLabelEditor col={col} dispatch={dispatch} />
              <button onClick={() => dispatch({ type: 'REMOVE_COLUMN', colId: col.id })} className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors" title="Remove column">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {showAddCol ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                autoFocus
                value={newColLabel}
                onChange={(e) => setNewColLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') { setShowAddCol(false); setNewColLabel(''); } }}
                placeholder="e.g. CFM, Location, Floor"
                className="h-7 bg-background border border-border rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/40 w-44"
              />
              <button onClick={handleAddColumn} className="h-7 px-2.5 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600 transition-colors">Add</button>
              <button onClick={() => { setShowAddCol(false); setNewColLabel(''); }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-3.5 h-3.5" /></button>
            </span>
          ) : (
            <button onClick={() => setShowAddCol(true)} className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 font-medium transition-colors">
              <Plus className="w-3 h-3" /> Add Column
            </button>
          )}
        </div>

        {/* Products */}
        {state.products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl">
            <Package className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No products added yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add a product template or create a custom product below.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.products.map((product) => (
              <ProductSection
                key={product.localId}
                product={product}
                customColumns={state.customColumns}
                errors={errors}
                productErrors={productErrors}
                dispatch={dispatch}
                isOnly={state.products.length === 1}
              />
            ))}
          </div>
        )}

        {/* Add product toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {!showPicker ? (
            <button onClick={() => setShowPicker(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-sky-500/50 text-sky-500 hover:bg-sky-500/10 text-xs font-medium transition-colors">
              <PackagePlus className="w-3.5 h-3.5" /> Add from Template
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {templatesLoading ? (
                <div className="h-9 w-48 bg-muted animate-pulse rounded-lg" />
              ) : (
                <div className="relative">
                  <select value={pickerTemplateId} onChange={(e) => setPickerTemplateId(e.target.value)} className="appearance-none pl-3 pr-8 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 min-w-[200px]" autoFocus>
                    <option value="">— Select a template —</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              )}
              {templateFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button onClick={() => { setShowPicker(false); setPickerTemplateId(''); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
            </div>
          )}
          <button onClick={() => dispatch({ type: 'ADD_BLANK_PRODUCT' })} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Custom Product
          </button>
        </div>

        {/* Summary & Additional Charges */}
        {state.products.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Summary &amp; Additional Charges</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Add installation, freight &amp; labour charges per product (optional)</p>
            </div>
            <div className="divide-y divide-border">
              {state.products.map((product) => {
                const c = product.charges;
                const isItemized = c.mode === 'itemized';
                const colPills = state.customColumns.filter((col) => (product.customValues as Record<string, string>)[col.id]);
                return (
                  <div key={product.localId} className="px-4 py-3 flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[140px] pt-1">
                      <p className="text-sm font-medium text-foreground">{product.name || 'Unnamed Product'}</p>
                      {colPills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {colPills.map((col) => (
                            <span key={col.id} className="inline-flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 rounded px-1.5 py-0.5 text-[10px] text-sky-600 dark:text-sky-400">
                              <span className="text-muted-foreground font-normal">{col.label}</span>
                              <span className="font-semibold">{(product.customValues as Record<string, string>)[col.id]}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Mode toggle */}
                    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'UPDATE_PRODUCT_CHARGES', productLocalId: product.localId, patch: { mode: 'combined' } })}
                        className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', !isItemized ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                      >
                        Combined
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'UPDATE_PRODUCT_CHARGES', productLocalId: product.localId, patch: { mode: 'itemized' } })}
                        className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', isItemized ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                      >
                        Itemized
                      </button>
                    </div>
                    {/* Inputs */}
                    {!isItemized ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Total Charges (₹)</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={c.combined ?? ''}
                          onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT_CHARGES', productLocalId: product.localId, patch: { combined: parseFloat(e.target.value) || 0 } })}
                          placeholder="0"
                          className="w-32 bg-background border border-border rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {(['installation', 'freight', 'labor'] as const).map((key) => (
                          <label key={key} className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground capitalize whitespace-nowrap">{key} (₹)</span>
                            <input
                              type="number" min="0" step="0.01"
                              value={c[key] ?? ''}
                              onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT_CHARGES', productLocalId: product.localId, patch: { [key]: parseFloat(e.target.value) || 0 } })}
                              placeholder="0"
                              className="w-28 bg-background border border-border rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes (optional)</label>
          <textarea value={state.notes} onChange={(e) => dispatch({ type: 'SET_NOTES', notes: e.target.value })} rows={2} placeholder="Any additional notes for this BoQ…" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none placeholder:text-muted-foreground/50" />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-sm font-semibold text-foreground">
            Grand Total: <span className="font-mono text-emerald-400">{formatINR(grandTotal)}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors disabled:opacity-60">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Update BoQ' : 'Create BoQ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
