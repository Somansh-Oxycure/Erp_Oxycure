'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { Product } from '@/types/api';
import { X, Tag, Package, Pencil, Copy, Trash2, CheckCircle, XCircle, FileText, ChevronRight } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRole } from '@/hooks/useRole';

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  active:       { label: 'Active',       dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  discontinued: { label: 'Discontinued', dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50' },
  draft:        { label: 'Draft',        dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50' },
};

const UOM_LABELS: Record<string, string> = {
  pcs: 'Pcs', kg: 'Kg', ltr: 'Ltr', mtr: 'Mtr', set: 'Set', box: 'Box', roll: 'Roll',
};

interface Props {
  productId: string | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
}

export function ProductDetailDrawer({ productId, onClose, onEdit }: Props) {
  const qc = useQueryClient();
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const { data, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.findOne(productId!),
    enabled: !!productId,
    select: (res) => res.data?.data as Product,
  });

  const duplicateMut = useMutation({
    mutationFn: () => productsApi.duplicate(productId!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Duplicated as "${res.data?.data?.productCode}"`);
    },
    onError: () => toast.error('Failed to duplicate'),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => productsApi.update(productId!, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (!productId) return null;

  const product = data;
  const sc = product ? STATUS_CONFIG[product.status] : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Package className="w-4 h-4" />
            <span>Product Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 font-medium truncate max-w-[200px]">
              {isLoading ? '...' : product?.productCode}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading || !product ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Product image + hero */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-6 border-b border-slate-100">
              <div className="flex gap-4">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                    <Package className="w-8 h-8 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {sc && (
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold', sc.bg, sc.text)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                        {sc.label}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">{product.productCode}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">{product.name}</h2>
                  {product.brand && (
                    <p className="text-sm text-slate-500 mt-0.5">{product.brand}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    {product.categoryName && (
                      <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                        {product.categoryName}
                      </span>
                    )}
                    {product.subCategory && (
                      <span className="text-slate-400">→ {product.subCategory}</span>
                    )}
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {UOM_LABELS[product.unitOfMeasure] ?? product.unitOfMeasure}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6">
              {/* Location */}
              {product.location && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</h3>
                  <span className="inline-block text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
                    {product.location}
                  </span>
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specifications */}
              {product.specifications && product.specifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Specifications
                  </h3>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {product.specifications.map((spec, idx) => (
                          <tr
                            key={spec.id}
                            className={cn(
                              'border-b border-slate-50 last:border-0',
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                            )}
                          >
                            <td className="px-4 py-2.5 text-sm text-slate-500 font-medium w-1/2">{spec.specKey}</td>
                            <td className="px-4 py-2.5 text-sm text-slate-800 font-semibold">
                              {spec.specValue}
                              {spec.specUnit && <span className="text-slate-400 font-normal ml-1">{spec.specUnit}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-50">
                <div>Added {formatDate(product.createdAt)}</div>
                <div>Last updated {formatDate(product.updatedAt)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {product && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-slate-50/50">
            <div className="flex gap-2">
              {/* Status toggles */}
              {isAdminOrManager && product.status !== 'active' && (
                <button
                  onClick={() => statusMut.mutate('active')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Activate
                </button>
              )}
              {isAdminOrManager && product.status === 'active' && (
                <button
                  onClick={() => statusMut.mutate('discontinued')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Discontinue
                </button>
              )}
              {isAdminOrManager && (
                <button
                  onClick={() => duplicateMut.mutate()}
                  disabled={duplicateMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
              )}
            </div>
            {isAdminOrManager && (
              <button
                onClick={() => onEdit(product)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Product
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
