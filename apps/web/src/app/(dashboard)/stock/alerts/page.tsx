'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api';
import { AlertLog, AlertStatus } from '@/types/api';
import { useRole } from '@/hooks/useRole';
import { toast } from 'sonner';
import {
  Bell, BellOff, CheckCircle2, Clock, AlertTriangle, RefreshCw, Plus, Settings,
} from 'lucide-react';
import AlertRulesModal from '@/components/alerts/AlertRulesModal';

const STATUS_CONFIG: Record<AlertStatus, { label: string; className: string; icon: React.ElementType }> = {
  open:         { label: 'Open',         className: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',       icon: Bell },
  acknowledged: { label: 'Acknowledged', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20', icon: Clock },
  resolved:     { label: 'Resolved',     className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20', icon: CheckCircle2 },
};

export default function AlertsPage() {
  const role = useRole();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('open');
  const [rulesOpen, setRulesOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () => alertsApi.findLogs(statusFilter || undefined).then((r) => r.data.data),
    staleTime: 15000,
  });

  const { data: countData } = useQuery({
    queryKey: ['alerts-count'],
    queryFn: () => alertsApi.getOpenCount().then((r) => r.data.data),
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: () => { toast.success('Alert acknowledged'); qc.invalidateQueries({ queryKey: ['alerts'] }); qc.invalidateQueries({ queryKey: ['alerts-count'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertsApi.resolve(id),
    onSuccess: () => { toast.success('Alert resolved'); qc.invalidateQueries({ queryKey: ['alerts'] }); qc.invalidateQueries({ queryKey: ['alerts-count'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const logs: AlertLog[] = data ?? [];
  const openCount = countData?.count ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Stock Alerts</h1>
              {openCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {openCount}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">Monitor and manage stock level alerts</p>
          </div>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => setRulesOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-sm font-medium transition-colors border border-border"
          >
            <Settings className="w-4 h-4" /> Manage Rules
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {(['open', 'acknowledged', 'resolved', ''] as const).map((s) => {
          const label = s === '' ? 'All' : STATUS_CONFIG[s]?.label ?? 'All';
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-sky-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border'
              }`}
            >
              {label}
              {s === 'open' && openCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{openCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loadingâ€¦
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No alerts found</p>
          </div>
        ) : (
          logs.map((log) => {
            const cfg = STATUS_CONFIG[log.status];
            const Icon = cfg.icon;
            return (
              <div key={log.id} className={`bg-card border rounded-xl p-4 flex items-start justify-between gap-4 ${log.status === 'open' ? 'border-red-500/30' : 'border-border'}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-lg ${log.status === 'open' ? 'bg-red-500/10' : log.status === 'acknowledged' ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                    <Icon className={`w-4 h-4 ${log.status === 'open' ? 'text-red-600 dark:text-red-400' : log.status === 'acknowledged' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{log.product?.name}</p>
                      <span className="text-xs text-muted-foreground">{log.product?.productCode}</span>
                    </div>
                    <p className="text-sm text-foreground/70 mt-0.5">{log.alertMessage}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>Rule: {log.rule?.ruleName}</span>
                      <span>Â·</span>
                      <span>{new Date(log.triggeredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {log.resolvedBy && (
                        <>
                          <span>Â·</span>
                          <span>Resolved by {log.resolvedBy.firstName} {log.resolvedBy.lastName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>
                  {isAdminOrManager && (
                    <>
                      {log.status === 'open' && (
                        <button
                          onClick={() => ackMutation.mutate(log.id)}
                          disabled={ackMutation.isPending}
                          className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(log.status === 'open' || log.status === 'acknowledged') && (
                        <button
                          onClick={() => resolveMutation.mutate(log.id)}
                          disabled={resolveMutation.isPending}
                          className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {rulesOpen && (
        <AlertRulesModal onClose={() => setRulesOpen(false)} />
      )}
    </div>
  );
}
