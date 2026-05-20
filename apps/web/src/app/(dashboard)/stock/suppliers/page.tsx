'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '@/lib/api';
import { Supplier } from '@/types/api';
import { useRole } from '@/hooks/useRole';
import { toast } from 'sonner';
import { Plus, Search, Truck, Phone, Mail, Edit2, Trash2, Package, RefreshCw } from 'lucide-react';
import SupplierFormModal from '@/components/suppliers/SupplierFormModal';

export default function SuppliersPage() {
  const role = useRole();
  const isAdmin = role === 'admin';
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.findAll(search || undefined).then((r) => r.data.data),
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      toast.success('Supplier deleted');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Delete failed'),
  });

  const suppliers: Supplier[] = data ?? [];

  function handleEdit(s: Supplier) {
    setEditSupplier(s);
    setModalOpen(true);
  }

  function handleDelete(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(s.id);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your product suppliers</p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => { setEditSupplier(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No suppliers found</p>
          {isAdminOrManager && (
            <button
              onClick={() => { setEditSupplier(null); setModalOpen(true); }}
              className="mt-3 px-4 py-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl text-sm hover:bg-sky-500/20 transition-colors"
            >
              Add your first supplier
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-2xl p-5 space-y-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    {s.contactName && <p className="text-xs text-muted-foreground">{s.contactName}</p>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  s.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {s.status}
                </span>
              </div>

              <div className="space-y-1.5">
                {s.phone && (
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />{s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />{s.email}
                  </div>
                )}
                {s.gstin && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-muted-foreground/60">GSTIN:</span>{s.gstin}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {s._count?.productSuppliers ?? 0} products
                  </span>
                  <span>Lead: {s.leadTimeDays}d</span>
                </div>
                {isAdminOrManager && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <SupplierFormModal
          supplier={editSupplier}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['suppliers'] });
          }}
        />
      )}
    </div>
  );
}
