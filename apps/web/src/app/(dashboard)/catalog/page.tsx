'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { Product, ProductsListResponse } from '@/types/api';
import {
  Package, Plus, Search, LayoutGrid, List, Filter, X, Pencil, Copy,
  ChevronLeft, ChevronRight, Tag, Building2, CheckCircle, XCircle, AlertCircle,
  Download, Upload, ArrowUpDown,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { toast } from 'sonner';
import { ProductDetailDrawer } from '@/components/catalog/ProductDetailDrawer';
import { ProductFormModal } from '@/components/catalog/ProductFormModal';

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:       { label: 'Active',       dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-500/10', icon: CheckCircle },
  discontinued: { label: 'Discontinued', dot: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-500/10',     icon: XCircle },
  draft:        { label: 'Draft',        dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-500/10',   icon: AlertCircle },
} as const;

const UOM_LABELS: Record<string, string> = {
  pcs: 'Pcs', kg: 'Kg', ltr: 'Ltr', mtr: 'Mtr', set: 'Set', box: 'Box', roll: 'Roll',
};

// ─── Grid card ──────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onView,
  onEdit,
}: {
  product: Product;
  onView: (id: string) => void;
  onEdit: (p: Product) => void;
}) {
  const sc = STATUS_CONFIG[product.status];
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';

  return (
    <div
      className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:border-sky-200 transition-all duration-200 cursor-pointer group"
      onClick={() => onView(product.id)}
    >
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-12 h-12 text-slate-200" />
        )}
        <div className="absolute top-2 right-2">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', sc.bg, sc.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
            {sc.label}
          </span>
        </div>
        {isAdminOrManager && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(product); }}
              className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-foreground/70 hover:text-sky-600 shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-[10px] font-mono text-slate-400 mb-1">{product.productCode}</p>
        <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-sky-700 transition-colors">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {product.brand}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {product.categoryName && (
              <span className="text-[11px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium truncate max-w-[100px]">
                {product.categoryName}
              </span>
            )}
          </div>
          <span className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
            {UOM_LABELS[product.unitOfMeasure] ?? product.unitOfMeasure}
          </span>
        </div>        {product.location && (
          <div className="mt-1.5">
            <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              📦 {product.location}
            </span>
          </div>
        )}        {product.specifications && product.specifications.length > 0 && (
          <div className="mt-3 border-t border-border/50 pt-2.5 space-y-1">
            {product.specifications.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] text-slate-400 truncate max-w-[50%]">{s.specKey}</span>
                <span className="text-[11px] font-semibold text-slate-700 text-right">
                  {s.specValue}{s.specUnit && <span className="text-[10px] font-normal text-slate-400 ml-0.5">{s.specUnit}</span>}
                </span>
              </div>
            ))}
            {product.specifications.length > 4 && (
              <p className="text-[10px] text-slate-400 pt-0.5">+{product.specifications.length - 4} more</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List row ────────────────────────────────────────────────────────────────
function ProductRow({
  product,
  onView,
  onEdit,
}: {
  product: Product;
  onView: (id: string) => void;
  onEdit: (p: Product) => void;
}) {
  const sc = STATUS_CONFIG[product.status];
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';

  return (
    <tr
      className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors group"
      onClick={() => onView(product.id)}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <Package className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground group-hover:text-sky-700 transition-colors">{product.name}</p>
            <p className="text-[11px] font-mono text-slate-400">{product.productCode}</p>
            {product.specifications && product.specifications.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {product.specifications.slice(0, 4).map((s) => (
                  <span key={s.id} className="text-[11px] text-slate-500">
                    <span className="text-slate-400">{s.specKey}:</span>{' '}
                    <span className="font-medium">{s.specValue}{s.specUnit && <span className="font-normal text-slate-400"> {s.specUnit}</span>}</span>
                  </span>
                ))}
                {product.specifications.length > 4 && (
                  <span className="text-[11px] text-slate-400">+{product.specifications.length - 4} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm text-foreground/70">{product.brand ?? '—'}</td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground">
        {product.categoryName ?? '—'}
        {product.subCategory && <span className="text-slate-400 ml-1 text-xs">/ {product.subCategory}</span>}
      </td>      <td className="px-5 py-3.5 text-sm text-muted-foreground">{product.location ?? '\u2014'}</td>      <td className="px-5 py-3.5 text-xs text-muted-foreground">{UOM_LABELS[product.unitOfMeasure] ?? product.unitOfMeasure}</td>
      <td className="px-5 py-3.5">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', sc.bg, sc.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
          {sc.label}
        </span>
      </td>
      <td className="px-5 py-3.5 text-xs text-slate-400">{formatDate(product.updatedAt)}</td>
      <td className="px-5 py-3.5">
        {isAdminOrManager && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(product); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-sky-600 transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const qc = useQueryClient();
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Import/Export
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importErrorsOpen, setImportErrorsOpen] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await productsApi.exportCsv();
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Products exported successfully');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await productsApi.importCsv(formData);
      const result = response.data as { success: boolean; data: { created: number; skipped: number; errors: string[]; warnings: string[] } };
      const { created, skipped, errors, warnings } = result.data;

      if (created > 0) {
        qc.invalidateQueries({ queryKey: ['products'] });
        qc.invalidateQueries({ queryKey: ['product-brands'] });
      }

      if (errors.length > 0 || warnings.length > 0) {
        setImportErrors(errors);
        setImportWarnings(warnings);
        setImportErrorsOpen(true);
        if (errors.length > 0) {
          toast.warning(`Imported ${created} products, ${skipped} skipped, ${errors.length} failed, ${warnings.length} warnings`);
        } else {
          toast.success(`Imported ${created} product${created !== 1 ? 's' : ''}, ${skipped} skipped`);
        }
      } else {
        toast.success(`Imported ${created} new product${created !== 1 ? 's' : ''}, ${skipped} already existed`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Filters
  const [search, setSearch] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data: categoryData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productsApi.categories(),
    select: (r) => r.data?.data as string[],
  });
  const categoryNames = categoryData ?? [];

  const { data: brandData } = useQuery({
    queryKey: ['product-brands'],
    queryFn: () => productsApi.brands(),
    select: (r) => r.data?.data as string[],
  });
  const brands = brandData ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, categoryName, brand, status, sortBy, page }],
    queryFn: () =>
      productsApi.findAll({
        ...(search && { search }),
        ...(categoryName && { categoryName }),
        ...(brand && { brand }),
        ...(status && { status }),
        sortBy,
        page: String(page),
        limit: String(LIMIT),
      }),
    select: (r) => r.data as ProductsListResponse,
    placeholderData: (prev) => prev,
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const clearFilters = () => {
    setSearch(''); setCategoryName(''); setBrand(''); setStatus(''); setSortBy('newest'); setPage(1);
  };
  const hasFilters = !!(search || categoryName || brand || status || sortBy !== 'newest');

  const handleView = useCallback((id: string) => setSelectedId(id), []);
  const handleEdit = useCallback((p: Product) => {
    setEditProduct(p);
    setFormOpen(true);
    setSelectedId(null);
  }, []);
  const openAdd = () => { setEditProduct(null); setFormOpen(true); };

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-card shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-sky-500" />
              Product Catalog
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {meta ? `${meta.total} products` : 'Manage your HVAC product library'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            {isAdminOrManager && (
              <>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export CSV
                </button>
                <button
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                >
                  {isImporting ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import CSV
                </button>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, code, or brand..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 bg-card"
            />
          </div>

          {/* Category filter */}
          {categoryNames.length > 0 && (
            <select
              value={categoryName}
              onChange={(e) => { setCategoryName(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 bg-card min-w-[160px]"
            >
              <option value="">All Categories</option>
              {categoryNames.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Brand filter */}
          {brands.length > 0 && (
            <select
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 bg-card min-w-[140px]"
            >
              <option value="">All Brands</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 bg-card"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="discontinued">Discontinued</option>
          </select>

          {/* Sort */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="text-sm bg-transparent focus:outline-none text-foreground cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="name_asc">Name A → Z</option>
              <option value="name_desc">Name Z → A</option>
              <option value="brand_asc">Brand A → Z</option>
              <option value="category_asc">Category A → Z</option>
            </select>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('px-3 py-2 transition-colors', viewMode === 'grid' ? 'bg-sky-500 text-white' : 'bg-card text-slate-400 hover:bg-muted/40')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('px-3 py-2 transition-colors border-l border-border', viewMode === 'list' ? 'bg-sky-500 text-white' : 'bg-card text-slate-400 hover:bg-muted/40')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-14 h-14 text-slate-200 mb-4" />
            <p className="text-muted-foreground font-semibold text-lg">
              {hasFilters ? 'No products match your filters' : 'No products yet'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {hasFilters ? 'Try adjusting your search or filters' : 'Add your first product to get started'}
            </p>
            {isAdminOrManager && !hasFilters && (
              <button
                onClick={openAdd}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add First Product
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onView={handleView} onEdit={handleEdit} />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-muted/40 border-b border-border/60">
                <tr>
                  {['Product', 'Brand', 'Category', 'Location', 'UoM', 'Status', 'Updated', ''].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <ProductRow key={p.id} product={p} onView={handleView} onEdit={handleEdit} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground/70 font-medium">
              Page {page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <ProductDetailDrawer
        productId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={handleEdit}
      />

      {/* Add/Edit form */}
      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editProduct}
      />

      {/* Import errors/warnings dialog */}
      {importErrorsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-foreground">Import Results</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {importErrors.length > 0 && `${importErrors.length} failed`}
                  {importErrors.length > 0 && importWarnings.length > 0 && ' · '}
                  {importWarnings.length > 0 && `${importWarnings.length} warning${importWarnings.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => setImportErrorsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4 flex-1 space-y-4">
              {importErrors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-2">Failed rows (not imported)</p>
                  <ul className="space-y-2">
                    {importErrors.map((err, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {importWarnings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 mb-2">Warnings (imported, but check these)</p>
                  <ul className="space-y-2">
                    {importWarnings.map((w, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button
                onClick={() => setImportErrorsOpen(false)}
                className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
