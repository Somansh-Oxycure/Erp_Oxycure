'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { stockApi, productCategoriesApi } from '@/lib/api';
import { Download, Upload } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { StockWithProduct, ProductCategory } from '@/types/api';
import { toast } from 'sonner';
import {
  Search, Package, CheckCircle2, XCircle, RefreshCw,
  ChevronUp, ChevronDown, Minus, Plus, Settings2, ArrowUpDown, ArrowLeftRight,
} from 'lucide-react';
import StockAdjustModal from '@/components/stock/StockAdjustModal';
import SetOpeningModal from '@/components/stock/SetOpeningModal';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ok:       { label: 'OK',       className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' },
  low:      { label: 'Low',      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' },
  out:      { label: 'Out',      className: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20' },
  on_order: { label: 'On Order', className: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20' },
};

export default function StockPage() {
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [alertFilter, setAlertFilter] = useState('');
  const [page, setPage] = useState(1);
  const [adjustProduct, setAdjustProduct] = useState<StockWithProduct | null>(null);
  const [openingProduct, setOpeningProduct] = useState<StockWithProduct | null>(null);

  // Import / Export
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await stockApi.exportCsv();
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Stock data exported successfully');
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
      const response = await stockApi.importCsv(formData);
      const result = response.data as { success: boolean; data: { updated: number; skipped: number; errors: string[] } };
      const { updated, skipped, errors } = result.data;
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['stock-stats'] });
      if (errors.filter((e) => !e.includes('not found')).length > 0) {
        toast.warning(`Updated ${updated}, skipped ${skipped}, ${errors.length} issues`);
        console.warn('Import issues:', errors);
      } else {
        toast.success(`Updated ${updated} product${updated !== 1 ? 's' : ''}, ${skipped} not found in catalog`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const { data: statsData } = useQuery({
    queryKey: ['stock-stats'],
    queryFn: () => stockApi.getStats().then((r) => r.data.data),
    staleTime: 30000,
  });

  const { data: catData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => productCategoriesApi.findFlat().then((r) => r.data.data),
    staleTime: 300000,
  });

  const params: Record<string, string> = { page: String(page), limit: '30' };
  if (search) params.search = search;
  if (categoryId) params.categoryId = categoryId;
  if (alertFilter) params.alertStatus = alertFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['stock', params],
    queryFn: () => stockApi.findAll(params).then((r) => r.data),
    staleTime: 10000,
  });

  const products: StockWithProduct[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, totalPages: 1 };
  const stats = statsData ?? { total: 0, ok: 0, out: 0 };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track inventory levels across all products</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Link
            href="/stock-transfers"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transfers
          </Link>
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
          {isAdminOrManager && (
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
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: stats.total, icon: Package, color: 'text-muted-foreground' },
          { label: 'In Stock', value: stats.ok, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Out of Stock', value: stats.out, icon: XCircle, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            placeholder="Search product name or code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {(catData ?? []).map((c: ProductCategory) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={alertFilter}
          onChange={(e) => { setAlertFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="ok">OK</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
          <option value="on_order">On Order</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-right px-4 py-3">On Hand</th>
                <th className="text-right px-4 py-3">On Order</th>
                <th className="text-center px-4 py-3">Status</th>
                {isAdminOrManager && <th className="text-center px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />Loading…
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">No products found</td>
                </tr>
              ) : (
                products.map((p) => {
                  const badge = STATUS_BADGE[p.alertStatus];
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.productCode}</p>
                        {p.specifications && p.specifications.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {p.specifications.slice(0, 4).map((s) => (
                              <span key={s.id} className="text-[11px] text-slate-500">
                                <span className="text-slate-400">{s.specKey}:</span>{' '}
                                <span className="font-medium">{s.specValue}{s.specUnit && <span className="font-normal text-slate-400"> {s.specUnit}</span>}</span>
                              </span>
                            ))}
                            {p.specifications.length > 4 && (
                              <span className="text-[11px] text-slate-400">+{p.specifications.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.categoryName ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.location ?? '—'}</td>                      <td className="px-4 py-3 text-right font-mono text-foreground">{p.onHand.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sky-600 dark:text-sky-400">{p.onOrder.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                      </td>
                      {isAdminOrManager && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Adjust Stock"
                              onClick={() => setAdjustProduct(p)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                            {p.onHand === 0 && (
                              <button
                                title="Set Opening Stock"
                                onClick={() => setOpeningProduct(p)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {meta.total} products · Page {page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-muted border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted/80 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-muted border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted/80 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSuccess={() => {
            setAdjustProduct(null);
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stock-stats'] });
          }}
        />
      )}
      {openingProduct && (
        <SetOpeningModal
          product={openingProduct}
          onClose={() => setOpeningProduct(null)}
          onSuccess={() => {
            setOpeningProduct(null);
            qc.invalidateQueries({ queryKey: ['stock'] });
            qc.invalidateQueries({ queryKey: ['stock-stats'] });
          }}
        />
      )}
    </div>
  );
}
