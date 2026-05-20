'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boqTemplatesApi } from '@/lib/api';
import type { BoQTemplate, BoQTemplateComponent } from '@/types/api';

interface ComponentDraft {
  localId: string;
  name: string;
  description: string;
  size: string;
  defaultQty: number;
  defaultUnitRate: number;
  sortOrder: number;
  isOptional: boolean;
}

function newComponent(sortOrder: number): ComponentDraft {
  return {
    localId: crypto.randomUUID(),
    name: '',
    description: '',
    size: '',
    defaultQty: 1,
    defaultUnitRate: 0,
    sortOrder,
    isOptional: false,
  };
}

interface BoQTemplateFormProps {
  template?: BoQTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export function BoQTemplateForm({ template, onClose, onSaved }: BoQTemplateFormProps) {
  const isEditing = !!template;
  const qc = useQueryClient();

  const [name, setName] = useState(template?.name ?? '');
  const [code, setCode] = useState(template?.code ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [components, setComponents] = useState<ComponentDraft[]>([newComponent(0)]);
  const [populated, setPopulated] = useState(false);

  // Fetch full template (with components) when editing — the list API omits components
  const { data: fullTemplate, isLoading: fullLoading } = useQuery<BoQTemplate>({
    queryKey: ['boq-template', template?.id],
    queryFn: async () => {
      const res = await boqTemplatesApi.findOne(template!.id);
      return res.data?.data ?? res.data;
    },
    enabled: isEditing,
    staleTime: 5 * 60 * 1000,
  });

  // Populate all form state once the full template is loaded
  useEffect(() => {
    if (fullTemplate && !populated) {
      setName(fullTemplate.name);
      setCode(fullTemplate.code);
      setDescription(fullTemplate.description ?? '');
      if (fullTemplate.components && fullTemplate.components.length > 0) {
        setComponents(
          fullTemplate.components.map((c: BoQTemplateComponent) => ({
            localId: crypto.randomUUID(),
            name: c.name,
            description: c.description ?? '',
            size: c.size ?? '',
            defaultQty: Number(c.defaultQty),
            defaultUnitRate: Number(c.defaultUnitRate ?? 0),
            sortOrder: c.sortOrder,
            isOptional: c.isOptional,
          }))
        );
      }
      setPopulated(true);
    }
  }, [fullTemplate, populated]);

  const [errors, setErrors] = useState<{ name?: string; code?: string; components?: string }>({});

  const createMutation = useMutation({
    mutationFn: (data: unknown) => boqTemplatesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-templates'] });
      toast.success('Template created');
      onSaved();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => boqTemplatesApi.update(template!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-templates'] });
      qc.invalidateQueries({ queryKey: ['boq-template', template!.id] });
      toast.success('Template updated');
      onSaved();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update template');
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isLoadingFull = isEditing && fullLoading;

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Required';
    if (!code.trim()) e.code = 'Required';
    if (components.some((c) => !c.name.trim())) e.components = 'All component names are required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      components: components.map((c, i) => ({
        name: c.name.trim(),
        description: c.description.trim() || undefined,
        size: c.size.trim() || undefined,
        defaultQty: c.defaultQty,
        defaultUnitRate: c.defaultUnitRate,
        sortOrder: i,
        isOptional: c.isOptional,
      })),
    };

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  function updateComponent(localId: string, patch: Partial<ComponentDraft>) {
    setComponents((prev) =>
      prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)),
    );
  }

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/50">
        <h2 className="text-sm font-semibold text-foreground">
          {isEditing ? `Edit Template — ${template.code}` : 'New BoQ Template'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {isLoadingFull && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading template data…
          </div>
        )}
        {/* Template fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ERV Unit"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ERV"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono uppercase"
            />
            {errors.code && <p className="text-xs text-red-500 mt-0.5">{errors.code}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description shown to users"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </div>
        </div>

        {/* Components */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Default Components
            </p>
          </div>
          {errors.components && (
            <p className="text-xs text-red-500 mb-2">{errors.components}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Component Name</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-32">Size</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-24">Default Qty</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-28">Rate (Rs.)</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground w-20">Optional</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {components.map((comp) => (
                  <tr key={comp.localId} className="bg-card">
                    <td className="px-3 py-2">
                      <input
                        value={comp.name}
                        onChange={(e) => updateComponent(comp.localId, { name: e.target.value })}
                        placeholder="e.g. Supply Fan Motor"
                        className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-sky-500 text-sm focus:outline-none py-0.5 placeholder:text-muted-foreground/50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={comp.size}
                        onChange={(e) => updateComponent(comp.localId, { size: e.target.value })}
                        placeholder="e.g. 100×40×30"
                        className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-sky-500 text-sm focus:outline-none py-0.5 placeholder:text-muted-foreground/50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={comp.defaultQty}
                        onChange={(e) =>
                          updateComponent(comp.localId, { defaultQty: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-sky-500 text-sm focus:outline-none py-0.5"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={comp.defaultUnitRate}
                        onChange={(e) =>
                          updateComponent(comp.localId, { defaultUnitRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-transparent border-b border-transparent hover:border-border focus:border-sky-500 text-sm focus:outline-none py-0.5"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={comp.isOptional}
                        onChange={(e) => updateComponent(comp.localId, { isOptional: e.target.checked })}
                        className="w-3.5 h-3.5 rounded accent-sky-500"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() =>
                          setComponents((prev) => prev.filter((c) => c.localId !== comp.localId))
                        }
                        disabled={components.length === 1}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setComponents((prev) => [...prev, newComponent(prev.length)])}
            className="mt-3 flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-400 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Component
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
