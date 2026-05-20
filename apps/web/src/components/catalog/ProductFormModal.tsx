'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { Product, ProductSpecInput, CreateProductInput, UnitOfMeasure } from '@/types/api';
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const UNIT_OPTIONS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'pcs', label: 'Pcs (Pieces)' },
  { value: 'kg', label: 'Kg (Kilograms)' },
  { value: 'ltr', label: 'Ltr (Litres)' },
  { value: 'mtr', label: 'Mtr (Metres)' },
  { value: 'set', label: 'Set' },
  { value: 'box', label: 'Box' },
  { value: 'roll', label: 'Roll' },
];

// Spec templates per category keyword
const SPEC_TEMPLATES: Record<string, { key: string; unit?: string }[]> = {
  'split ac': [
    { key: 'Capacity (Ton)' }, { key: 'Star Rating' }, { key: 'Inverter' }, { key: 'Refrigerant Type' },
    { key: 'Power Supply', unit: 'V' }, { key: 'Noise Level', unit: 'dB' }, { key: 'ISEER Rating' },
    { key: 'Warranty', unit: 'years' },
  ],
  'cassette': [
    { key: 'Capacity (Ton)' }, { key: 'Star Rating' }, { key: 'Refrigerant Type' }, { key: 'Airflow', unit: 'm³/hr' },
  ],
  'refrigerant': [
    { key: 'Refrigerant Type' }, { key: 'Cylinder Size', unit: 'kg' }, { key: 'GWP' }, { key: 'Pressure', unit: 'bar' },
  ],
  'filter': [
    { key: 'Filter Type' }, { key: 'Dimensions', unit: 'mm' }, { key: 'MERV Rating' },
    { key: 'Filter Efficiency', unit: '%' }, { key: 'Airflow', unit: 'm³/hr' },
  ],
  'copper pipe': [
    { key: 'Outer Diameter', unit: 'mm' }, { key: 'Wall Thickness', unit: 'mm' }, { key: 'Length per coil', unit: 'mtr' }, { key: 'Grade' },
  ],
  'compressor': [
    { key: 'Compatible Brand' }, { key: 'Compatible Model' }, { key: 'Part Number' },
    { key: 'Voltage', unit: 'V' }, { key: 'Power', unit: 'HP' }, { key: 'Warranty', unit: 'months' },
  ],
};

function getSpecTemplate(categoryName: string, subCategory: string): { key: string; unit?: string }[] {
  const text = `${categoryName} ${subCategory}`.toLowerCase();
  for (const [keyword, specs] of Object.entries(SPEC_TEMPLATES)) {
    if (text.includes(keyword)) return specs;
  }
  return [];
}

const EMPTY_SPEC: ProductSpecInput = { specKey: '', specValue: '', specUnit: '' };

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null; // if provided = edit mode
}

export function ProductFormModal({ open, onClose, product }: Props) {
  const qc = useQueryClient();
  const isEdit = !!product;

  const [step, setStep] = useState(1);

  // Step 1 fields
  const [form, setForm] = useState<Partial<CreateProductInput>>({
    productCode: '', name: '', brand: '', categoryName: '', subCategory: '',
    unitOfMeasure: 'pcs', status: 'active', description: '', location: '', tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  // Step 2 fields
  const [specs, setSpecs] = useState<ProductSpecInput[]>([]);

  // Reset on open/product change
  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        productCode: product.productCode,
        name: product.name,
        brand: product.brand ?? '',
        categoryName: product.categoryName ?? '',
        subCategory: product.subCategory ?? '',
        unitOfMeasure: product.unitOfMeasure,
        status: product.status,
        description: product.description ?? '',
        location: product.location ?? '',
        tags: product.tags ?? [],
      });
      setSpecs(
        product.specifications?.map((s) => ({
          specKey: s.specKey,
          specValue: s.specValue,
          specUnit: s.specUnit ?? '',
          sortOrder: s.sortOrder,
        })) ?? [],
      );
    } else {
      setForm({ productCode: '', name: '', brand: '', categoryName: '', subCategory: '', unitOfMeasure: 'pcs', status: 'active', description: '', location: '', tags: [] });
      setSpecs([]);
    }
    setStep(1);
    setTagInput('');
  }, [open, product]);

  const createMut = useMutation({
    mutationFn: (data: CreateProductInput) => productsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Failed to create product'),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<CreateProductInput>) => productsApi.update(product!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', product?.id] });
      toast.success('Product updated');
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Failed to update product'),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const handleSubmit = () => {
    if (!form.name?.trim()) return toast.error('Product name is required');
    const payload: CreateProductInput = {
      ...form as CreateProductInput,
      specifications: specs.filter((s) => s.specKey.trim() && s.specValue.trim()),
    };
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags?.includes(t)) {
      setForm((f) => ({ ...f, tags: [...(f.tags ?? []), t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) ?? [] }));
  };

  const addSpecRow = () => setSpecs((s) => [...s, { ...EMPTY_SPEC }]);

  const applyTemplate = () => {
    const catName = form.categoryName ?? '';
    const template = getSpecTemplate(catName, form.subCategory ?? '');
    if (template.length === 0) return toast.info('No template for this category');
    setSpecs(template.map((t) => ({ specKey: t.key, specValue: '', specUnit: t.unit ?? '', sortOrder: 0 })));
    toast.success('Template applied — fill in the values');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Step {step} of 2 — {step === 1 ? 'Basic Information' : 'Specifications'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4 pb-3 flex items-center gap-2 shrink-0">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => s < step && setStep(s)}
                className={cn(
                  'w-7 h-7 rounded-full text-xs font-bold transition-colors',
                  step === s ? 'bg-sky-500 text-white' : step > s ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-400',
                )}
              >
                {s}
              </button>
              {s < 2 && <div className={cn('h-0.5 w-12 rounded', step > s ? 'bg-sky-300' : 'bg-slate-100')} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Product Code
                    <span className="ml-1.5 font-normal text-slate-400">(optional — auto-generated if blank)</span>
                  </label>
                  <input
                    value={form.productCode ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. DAI-SPL-001 or leave blank"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                  <select
                    value={form.status ?? 'active'}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'draft' | 'discontinued' }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Product Name *</label>
                <input
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Daikin 1.5 Ton Inverter Split AC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Brand</label>
                  <input
                    value={form.brand ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="Daikin"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unit of Measure</label>
                  <select
                    value={form.unitOfMeasure ?? 'pcs'}
                    onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value as UnitOfMeasure }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-white"
                  >
                    {UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                  <input
                    value={form.categoryName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                    placeholder="e.g. Split AC, Compressor, Refrigerant"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sub-Category</label>
                  <input
                    value={form.subCategory ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                    placeholder="Inverter Split AC"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the product..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
                <input
                  value={form.location ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Warehouse 1, Rack A3"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tags</label>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Type a tag and press Enter"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
                  />
                  <button onClick={addTag} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors">
                    Add
                  </button>
                </div>
                {form.tags && form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-sky-50 text-sky-700 text-xs rounded-full">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-sky-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Add technical specifications for this product.</p>
                <div className="flex gap-2">
                  <button
                    onClick={applyTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Apply Template
                  </button>
                  <button
                    onClick={addSpecRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Spec
                  </button>
                </div>
              </div>

              {specs.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-400">No specifications yet</p>
                  <p className="text-xs text-slate-300 mt-1">Use "Apply Template" or "Add Spec" to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_100px_36px] gap-2 px-1">
                    <span className="text-xs font-semibold text-slate-400">Spec Name</span>
                    <span className="text-xs font-semibold text-slate-400">Value</span>
                    <span className="text-xs font-semibold text-slate-400">Unit</span>
                    <span />
                  </div>
                  {specs.map((spec, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_100px_36px] gap-2 items-center">
                      <input
                        value={spec.specKey}
                        onChange={(e) => {
                          const s = [...specs]; s[idx] = { ...s[idx], specKey: e.target.value }; setSpecs(s);
                        }}
                        placeholder="e.g. Capacity"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                      />
                      <input
                        value={spec.specValue}
                        onChange={(e) => {
                          const s = [...specs]; s[idx] = { ...s[idx], specValue: e.target.value }; setSpecs(s);
                        }}
                        placeholder="e.g. 1.5"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                      />
                      <input
                        value={spec.specUnit ?? ''}
                        onChange={(e) => {
                          const s = [...specs]; s[idx] = { ...s[idx], specUnit: e.target.value }; setSpecs(s);
                        }}
                        placeholder="Ton"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                      />
                      <button
                        onClick={() => setSpecs((s) => s.filter((_, i) => i !== idx))}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            {step === 1 ? (
              <button
                onClick={() => {
                  if (!form.name?.trim()) return toast.error('Product name is required');
                  setStep(2);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : (
                  isEdit ? 'Save Changes' : 'Create Product'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
