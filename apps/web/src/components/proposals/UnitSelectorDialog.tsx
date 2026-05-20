'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitsApi } from '@/lib/api';
import { Plus, Search, ArrowLeft, X, Loader2, Package, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface Unit {
  id: string;
  name: string;
  description?: string | null;
  price?: number | string | null;
}

interface EditState {
  name: string;
  description: string;
  amount: string;
}

interface DbEditState extends EditState {
  id: string;
  saving: boolean;
}

interface UnitSelectorProps {
  onSelect: (unit: { name: string; description: string; amount: number }) => void;
  onClose: () => void;
}

export function UnitSelectorDialog({ onSelect, onClose }: UnitSelectorProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'select' | 'create'>('select');
  // When non-null, we're in "edit before add" mode for a picked unit
  const [editing, setEditing] = useState<EditState | null>(null);
  // When non-null, we're in "permanent DB edit" mode
  const [dbEditing, setDbEditing] = useState<DbEditState | null>(null);

  // Create-new form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsApi.findAll(),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string; price?: number }) =>
      unitsApi.create(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['units'] });
      const unit = (res.data?.data ?? res.data) as Unit;
      toast.success(`Unit "${unit.name}" created`);
      onSelect({
        name: unit.name,
        description: unit.description || '',
        amount: unit.price ? Number(unit.price) : 0,
      });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to create unit');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; description?: string; price?: number } }) =>
      unitsApi.update(id, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['units'] });
      const unit = (res.data?.data ?? res.data) as Unit;
      toast.success(`"${unit.name}" updated`);
      setDbEditing(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Failed to save changes');
      setDbEditing((prev) => prev ? { ...prev, saving: false } : null);
    },
  });

  const rawUnits: Unit[] = (data?.data?.data as Unit[] | undefined) ?? [];
  const units = rawUnits.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.description || '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Unit name is required'); return; }
    setCreating(true);
    try {
      await createMutation.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        price: newPrice ? Number(newPrice) : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-foreground">
              {dbEditing ? 'Edit Unit (saves to database)' : editing ? 'Configure Unit' : 'Add Unit to Proposal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { setTab('select'); setEditing(null); setDbEditing(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition ${
              tab === 'select'
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Select Existing
          </button>
          <button
            onClick={() => { setTab('create'); setEditing(null); setDbEditing(null); }}
            className={`flex-1 py-2.5 text-sm font-medium transition ${
              tab === 'create'
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create New Unit
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {tab === 'select' ? (
            dbEditing ? (
              /* ── Permanent DB edit panel ── */
              <div className="p-4 space-y-4">
                <button
                  onClick={() => setDbEditing(null)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to list
                </button>
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2">
                  Changes saved here update the database permanently and will be the new default for future proposals.
                </p>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Name</label>
                  <input
                    value={dbEditing.name}
                    onChange={(e) => setDbEditing({ ...dbEditing, name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={dbEditing.description}
                    onChange={(e) => setDbEditing({ ...dbEditing, description: e.target.value })}
                    rows={5}
                    className={inputCls + ' resize-none'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Default Price (Rs)</label>
                  <input
                    type="number"
                    value={dbEditing.amount}
                    onChange={(e) => setDbEditing({ ...dbEditing, amount: e.target.value })}
                    placeholder="e.g. 45000"
                    min={0}
                    className={inputCls}
                  />
                </div>
                <button
                  disabled={dbEditing.saving || !dbEditing.name.trim()}
                  onClick={async () => {
                    if (!dbEditing.name.trim()) { toast.error('Unit name is required'); return; }
                    setDbEditing({ ...dbEditing, saving: true });
                    await updateMutation.mutateAsync({
                      id: dbEditing.id,
                      payload: {
                        name: dbEditing.name.trim(),
                        description: dbEditing.description.trim() || undefined,
                        price: dbEditing.amount ? Number(dbEditing.amount) : undefined,
                      },
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 disabled:opacity-60 transition"
                >
                  {dbEditing.saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Pencil className="w-4 h-4" /> Save Changes to Database</>
                  )}
                </button>
              </div>
            ) : editing ? (
              /* ── Edit-before-add panel ── */
              <div className="p-4 space-y-4">
                <button
                  onClick={() => setEditing(null)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to list
                </button>
                <p className="text-xs text-muted-foreground">
                  Review and adjust before adding to the proposal.
                </p>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Name</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    rows={4}
                    className={inputCls + ' resize-none'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (Rs)</label>
                  <input
                    type="number"
                    value={editing.amount}
                    onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                    placeholder="e.g. 45000"
                    min={0}
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!editing.name.trim()) { toast.error('Unit name is required'); return; }
                    onSelect({
                      name: editing.name.trim(),
                      description: editing.description.trim(),
                      amount: editing.amount ? Number(editing.amount) : 0,
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add to Proposal
                </button>
              </div>
            ) : (
              /* ── Unit list ── */
              <div className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search units…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : units.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {search ? 'No units match your search.' : 'No units found. Create one!'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {units.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex items-center rounded-xl border border-border hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition group"
                      >
                        {/* Click name → configure-before-add */}
                        <button
                          onClick={() =>
                            setEditing({
                              name: unit.name,
                              description: unit.description || '',
                              amount: unit.price ? String(Number(unit.price)) : '',
                            })
                          }
                          className="flex-1 text-left px-4 py-2.5"
                        >
                          <span className="text-sm font-medium text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                            {unit.name}
                          </span>
                        </button>
                        {/* Pencil → permanent DB edit */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDbEditing({
                              id: unit.id,
                              name: unit.name,
                              description: unit.description || '',
                              amount: unit.price ? String(Number(unit.price)) : '',
                              saving: false,
                            });
                          }}
                          className="p-2.5 mr-1 text-muted-foreground hover:text-amber-600 transition shrink-0"
                          title="Edit unit in database"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Creating a new unit saves it to the database and adds it to this proposal.
              </p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Unit Name *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. HEPA Filter Unit"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of this unit…"
                  rows={4}
                  className={inputCls + ' resize-none'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Default Price (Rs) — optional
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="e.g. 45000"
                  min={0}
                  className={inputCls}
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create &amp; Add to Proposal
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
