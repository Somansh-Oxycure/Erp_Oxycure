'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, productCategoriesApi } from '@/lib/api';
import { AlertRule, AlertRuleType, ProductCategory } from '@/types/api';
import { toast } from 'sonner';
import { X, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const RULE_TYPE_LABELS: Record<AlertRuleType, string> = {
  low_stock: 'Low Stock',
  reorder: 'Reorder Point',
  expiry: 'Expiry',
  overstock: 'Overstock',
};

interface Props {
  onClose: () => void;
}

export default function AlertRulesModal({ onClose }: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({
    ruleName: '',
    ruleType: 'low_stock' as AlertRuleType,
    categoryId: '',
    thresholdValue: '',
    autoCreatePo: false,
    escalateAfterHrs: '24',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => alertsApi.findRules().then((r) => r.data.data),
    staleTime: 30000,
  });

  const { data: catData } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => productCategoriesApi.findFlat().then((r) => r.data.data),
    staleTime: 300000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      alertsApi.createRule({
        ruleName: newRule.ruleName,
        ruleType: newRule.ruleType,
        categoryId: newRule.categoryId || undefined,
        thresholdValue: newRule.thresholdValue ? Number(newRule.thresholdValue) : undefined,
        autoCreatePo: newRule.autoCreatePo,
        escalateAfterHrs: Number(newRule.escalateAfterHrs),
      }),
    onSuccess: () => {
      toast.success('Alert rule created');
      qc.invalidateQueries({ queryKey: ['alert-rules'] });
      setShowCreate(false);
      setNewRule({ ruleName: '', ruleType: 'low_stock', categoryId: '', thresholdValue: '', autoCreatePo: false, escalateAfterHrs: '24' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      alertsApi.updateRule(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsApi.deleteRule(id),
    onSuccess: () => { toast.success('Rule deleted'); qc.invalidateQueries({ queryKey: ['alert-rules'] }); },
  });

  const rules: AlertRule[] = data ?? [];

  const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Alert Rules</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 rounded-xl hover:bg-sky-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Rule
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Create form */}
          {showCreate && (
            <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-sky-700 dark:text-sky-400">New Alert Rule</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Rule Name *</label>
                  <input
                    value={newRule.ruleName}
                    onChange={(e) => setNewRule((p) => ({ ...p, ruleName: e.target.value }))}
                    className={inputCls}
                    placeholder="e.g. Low VRF Stock Alert"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rule Type</label>
                  <select
                    value={newRule.ruleType}
                    onChange={(e) => setNewRule((p) => ({ ...p, ruleType: e.target.value as AlertRuleType }))}
                    className={inputCls}
                  >
                    {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category (optional)</label>
                  <select
                    value={newRule.categoryId}
                    onChange={(e) => setNewRule((p) => ({ ...p, categoryId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">All products</option>
                    {(catData ?? []).map((c: ProductCategory) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Threshold (qty, overrides reorder pt.)</label>
                  <input
                    type="number"
                    min="0"
                    value={newRule.thresholdValue}
                    onChange={(e) => setNewRule((p) => ({ ...p, thresholdValue: e.target.value }))}
                    className={inputCls}
                    placeholder="Leave blank to use product reorder pt."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Escalate After (hrs)</label>
                  <input
                    type="number"
                    min="1"
                    value={newRule.escalateAfterHrs}
                    onChange={(e) => setNewRule((p) => ({ ...p, escalateAfterHrs: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-xl border border-border text-foreground text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newRule.ruleName || createMutation.isPending}
                  className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create Rule'}
                </button>
              </div>
            </div>
          )}

          {/* Rules list */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading rules…</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No alert rules configured</div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className={`flex items-center justify-between p-4 rounded-xl border ${rule.isActive ? 'bg-card border-border' : 'bg-muted/20 border-border opacity-60'}`}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{rule.ruleName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 bg-muted rounded-md">{RULE_TYPE_LABELS[rule.ruleType]}</span>
                      {rule.category && <span>· {rule.category.name}</span>}
                      {rule.thresholdValue !== null && <span>· Threshold: {rule.thresholdValue}</span>}
                      <span>· {rule._count?.alertLogs ?? 0} alerts fired</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this rule?')) deleteMutation.mutate(rule.id); }}
                      className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
