'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, PowerOff, RefreshCw, FileCode } from 'lucide-react';
import { useBoQTemplates } from '@/hooks/boq/useBoQTemplates';
import { boqTemplatesApi } from '@/lib/api';
import { BoQTemplateForm } from '@/components/boq/BoQTemplateForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useRole } from '@/hooks/useRole';
import type { BoQTemplate } from '@/types/api';

export default function BoQTemplatesPage() {
  const router = useRouter();
  const role = useRole();
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useBoQTemplates(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BoQTemplate | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => boqTemplatesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-templates'] });
      toast.success('Template deactivated');
      setDeactivatingId(null);
    },
    onError: () => {
      toast.error('Failed to deactivate template');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => boqTemplatesApi.reactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-templates'] });
      toast.success('Template reactivated');
    },
    onError: () => {
      toast.error('Failed to reactivate template');
    },
  });

  // Redirect non-admins
  if (role && role !== 'admin') {
    router.replace('/');
    return null;
  }

  function openCreate() {
    setEditingTemplate(null);
    setFormOpen(true);
  }

  function openEdit(t: BoQTemplate) {
    setEditingTemplate(t);
    setFormOpen(true);
  }

  function handleSaved() {
    setFormOpen(false);
    setEditingTemplate(null);
  }

  function handleClose() {
    setFormOpen(false);
    setEditingTemplate(null);
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <FileCode className="w-4 h-4 text-sky-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">BoQ Templates</h1>
            <p className="text-xs text-muted-foreground">
              Manage reusable Bill of Quantities product templates
            </p>
          </div>
        </div>
        {!formOpen && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      {/* ── Form panel ── */}
      {formOpen && (
        <BoQTemplateForm
          template={editingTemplate}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}

      {/* ── Templates table ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={5} rows={5} />
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileCode className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No templates yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create your first BoQ template to get started
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Components</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((t: BoQTemplate) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded">
                      {t.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {t.description || <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                      {t.components?.length ?? 0} items
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.isActive ? (
                      <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {t.isActive ? (
                        <button
                          onClick={() => setDeactivatingId(t.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Deactivate"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(t.id)}
                          disabled={reactivateMutation.isPending}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                          title="Reactivate"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivatingId}
        title="Deactivate Template?"
        description="This template will no longer be available when generating new BoQs. Existing BoQs are not affected."
        confirmLabel="Deactivate"
        variant="danger"
        isPending={deactivateMutation.isPending}
        onConfirm={() => deactivateMutation.mutate(deactivatingId!)}
        onCancel={() => setDeactivatingId(null)}
      />
    </div>
  );
}
