'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ChevronRight,
  Loader2,
  Clock,
  TrendingUp,
  Trophy,
  XCircle,
  DollarSign,
  Flame,
  AlertTriangle,
  Minus,
  AlertCircle,
  MoveRight,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { opportunitiesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

// ─── Stage config ─────────────────────────────────────────────────────────────
export const STAGES = [
  {
    key: 'prospect',
    label: 'Prospect',
    step: 1,
    sla: 14,
    accent: '#94a3b8',
    ring: 'ring-slate-500/40',
    dot: 'bg-slate-400',
    badge: 'text-slate-300 bg-slate-500/15',
  },
  {
    key: 'discovery',
    label: 'Discovery',
    step: 2,
    sla: 10,
    accent: '#22d3ee',
    ring: 'ring-cyan-500/40',
    dot: 'bg-cyan-400',
    badge: 'text-cyan-300 bg-cyan-500/15',
  },
  {
    key: 'proposal',
    label: 'Proposal',
    step: 3,
    sla: 7,
    accent: '#a78bfa',
    ring: 'ring-violet-500/40',
    dot: 'bg-violet-400',
    badge: 'text-violet-300 bg-violet-500/15',
  },
  {
    key: 'negotiation',
    label: 'Negotiation',
    step: 4,
    sla: 5,
    accent: '#fbbf24',
    ring: 'ring-amber-500/40',
    dot: 'bg-amber-400',
    badge: 'text-amber-300 bg-amber-500/15',
  },
];

const NEXT_STAGES: Record<string, string[]> = {
  prospect: ['discovery', 'closed_lost'],
  discovery: ['proposal', 'closed_lost'],
  proposal: ['negotiation', 'closed_lost'],
  negotiation: ['closed_won', 'closed_lost'],
};

export interface Opportunity {
  id: string;
  opportunityNumber: string;
  title: string;
  stage: string;
  dealValue: number | string | null;
  probability: number;
  expectedCloseDate?: string | null;
  createdAt: string;
  lead?: {
    id: string;
    leadNumber: string;
    firstName: string;
    lastName: string | null;
    companyName: string | null;
    priority: string | null;
    status?: string | null;
  } | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string | null;
    companyName: string | null;
  } | null;
  assignedTo?: { id: string; firstName: string; lastName: string | null } | null;
  quotations?: { id: string; quotationNumber: string; status: string; totalAmount: number | string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function agingDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function agingStyle(days: number): { color: string; bg: string } {
  if (days <= 5)  return { color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (days <= 14) return { color: 'text-amber-400',   bg: 'bg-amber-500/10'   };
  return            { color: 'text-red-400',     bg: 'bg-red-500/10'     };
}

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  high:   { label: 'High', color: 'text-red-400',   bg: 'bg-red-500/12',   icon: <Flame className="w-2.5 h-2.5" /> },
  medium: { label: 'Med',  color: 'text-amber-400', bg: 'bg-amber-500/12', icon: <AlertTriangle className="w-2.5 h-2.5" /> },
  low:    { label: 'Low',  color: 'text-slate-400', bg: 'bg-slate-500/12', icon: <Minus className="w-2.5 h-2.5" /> },
};

// Lead status label map (small muted pill)
const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quoted: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
  negotiating: 'Negotiating',
};

// ─── Opportunity card ─────────────────────────────────────────────────────────
function OppCard({
  opp,
  stage,
  onMove,
  onDragStart,
  onDragEnd,
  isDragging,
  onSelect,
  isSelected,
}: {
  opp: Opportunity;
  stage: typeof STAGES[0];
  onMove: (id: string, stage: string, lostReason?: string) => void;
  onDragStart: (opp: Opportunity) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onSelect: (opp: Opportunity) => void;
  isSelected: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const nextStages = NEXT_STAGES[opp.stage] ?? [];

  const days = agingDays(opp.createdAt);
  const stuck = days > stage.sla;
  const aging = agingStyle(days);
  const priority = opp.lead?.priority ?? 'medium';
  const pCfg = PRIORITY_CFG[priority] ?? PRIORITY_CFG.medium;
  const leadStatus = opp.lead?.status;

  const handleMove = (s: string) => {
    if (s === 'closed_lost') {
      setPendingStage(s);
    } else {
      onMove(opp.id, s);
      setShowMenu(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      draggable
      onDragStart={(e) => {
        (e as unknown as React.DragEvent).dataTransfer.setData('oppId', opp.id);
        onDragStart(opp);
      }}
      onDragEnd={() => onDragEnd()}
      onClick={() => onSelect(opp)}
      className={`relative group cursor-pointer select-none transition-opacity duration-150 ${
        isDragging ? 'opacity-40 scale-95' : 'opacity-100'
      }`}
    >
      <div
        className={`relative p-3 rounded-xl overflow-hidden transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-sky-500/70 shadow-md shadow-sky-500/10'
            : stuck
            ? 'bg-red-100 dark:bg-red-950/50 ring-1 ring-red-500/55 shadow-sm shadow-red-900/40'
            : `bg-card dark:bg-[#10102a]/95 ring-1 ${stage.ring} shadow-sm`
        }`}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
          style={{ backgroundColor: isSelected ? '#0ea5e9' : stuck ? '#ef4444' : stage.accent }}
        />

        {/* Row 1: opp number + stuck badge + move btn */}
        <div className="flex items-center justify-between gap-1 pl-3 mb-1">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <span className="text-[9px] font-mono tracking-wide text-muted-foreground shrink-0">
              {opp.opportunityNumber}
            </span>
            {stuck && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/25 text-red-400 text-[8px] font-bold uppercase tracking-widest animate-pulse shrink-0">
                <AlertCircle className="w-2 h-2" />
                stuck
              </span>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-6 z-30 w-40 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="px-3 pt-2 pb-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Move to
                  </p>
                  {nextStages.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleMove(s)}
                      className={`w-full px-3 py-1.5 text-xs text-left transition-colors flex items-center gap-2 ${
                        s === 'closed_lost'
                          ? 'text-red-400 hover:bg-red-500/10'
                          : s === 'closed_won'
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-foreground/80 hover:bg-accent'
                      }`}
                    >
                      {s === 'closed_won' && <Trophy className="w-3 h-3" />}
                      {s === 'closed_lost' && <XCircle className="w-3 h-3" />}
                      {s !== 'closed_won' && s !== 'closed_lost' && <ChevronRight className="w-3 h-3" />}
                      {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Row 2: title */}
        <p className="text-[11px] font-semibold text-foreground leading-snug pl-3 line-clamp-2 mb-1">
          {opp.title}
        </p>

        {/* Lead status pill */}
        {leadStatus && (
          <div className="pl-3 mb-1.5">
            <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {LEAD_STATUS_LABELS[leadStatus] ?? leadStatus}
            </span>
          </div>
        )}

        {/* Row 3: deal value */}
        <p className={`text-sm font-bold pl-3 mb-2 ${stuck ? 'text-red-600 dark:text-red-200' : 'text-foreground'}`}>
          {formatCurrency(opp.dealValue)}
        </p>

        {/* Row 4: aging + priority chips */}
        <div className="pl-3 flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${aging.bg} ${aging.color}`}>
            <Clock className="w-2.5 h-2.5" />
            {days === 0 ? 'Today' : `${days}d`}
          </span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${pCfg.bg} ${pCfg.color}`}>
            {pCfg.icon}
            {pCfg.label}
          </span>
        </div>

        {/* Lost reason overlay */}
        <AnimatePresence>
          {pendingStage === 'closed_lost' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 p-3 bg-card/95 dark:bg-[#1a1020]/95 border border-red-500/40 rounded-xl backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Mark as Lost
              </p>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                rows={2}
                placeholder="Reason for losing this deal..."
                className="w-full px-2 py-1.5 bg-muted/60 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/40 resize-none mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingStage(null)}
                  className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-accent transition-colors border border-border"
                >
                  Cancel
                </button>
                <button
                  disabled={!lostReason.trim()}
                  onClick={() => {
                    onMove(opp.id, 'closed_lost', lostReason);
                    setPendingStage(null);
                    setShowMenu(false);
                  }}
                  className="flex-1 text-xs text-white bg-red-600 hover:bg-red-500 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                >
                  Confirm Lost
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────
interface KanbanBoardProps {
  /** Currently selected lead/opportunity ID for cross-view sync */
  selectedLeadId?: string | null;
  onSelectOpp?: (leadId: string | null, oppId: string | null) => void;
  /** Compact mode for Split view */
  compact?: boolean;
}

export function KanbanBoard({ selectedLeadId, onSelectOpp, compact = false }: KanbanBoardProps) {
  const queryClient = useQueryClient();

  const [draggedOpp, setDraggedOpp] = useState<Opportunity | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dropConfirm, setDropConfirm] = useState<{
    opp: Opportunity;
    toStage: string;
    lostReason: string;
  } | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => opportunitiesApi.pipeline().then((r) => r.data),
  });

  const pipeline = data?.data ?? data ?? {};

  const stageMutation = useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: string; stage: string; lostReason?: string }) =>
      opportunitiesApi.updateStage(id, { stage, lostReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Opportunity moved');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to move'),
  });

  // Metrics
  const activeStageKeys = STAGES.map((s) => s.key);
  const totalActiveValue = activeStageKeys.reduce(
    (sum, k) => sum + ((pipeline as any)[k]?.totalValue ?? 0),
    0,
  );
  const totalDeals = activeStageKeys.reduce(
    (sum, k) => sum + ((pipeline as any)[k]?.opportunities?.length ?? 0),
    0,
  );
  const allOpps = activeStageKeys.flatMap((k) => (pipeline as any)[k]?.opportunities ?? []) as Opportunity[];
  const stuckCount = allOpps.filter((o) => {
    const s = STAGES.find((st) => st.key === o.stage);
    return s && agingDays(o.createdAt) > s.sla;
  }).length;
  const wonCol = (pipeline as any)['closed_won'];
  const lostCol = (pipeline as any)['closed_lost'];
  const wonCount = wonCol?.opportunities?.length ?? 0;
  const lostCount = lostCol?.opportunities?.length ?? 0;
  const wonValue = wonCol?.totalValue ?? 0;
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : null;

  return (
    <div className="h-full flex flex-col gap-2.5 min-w-0">
      {/* KPI strip */}
      {!isLoading && !compact && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/8 ring-1 ring-sky-500/20">
            <DollarSign className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Pipeline</span>
            <span className="text-xs font-bold text-foreground">{formatCurrency(totalActiveValue)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/8 ring-1 ring-cyan-500/20">
            <TrendingUp className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Deals</span>
            <span className="text-xs font-bold text-foreground">{totalDeals}</span>
          </div>
          {stuckCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/8 ring-1 ring-red-500/20">
              <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-muted-foreground">Stuck</span>
              <span className="text-xs font-bold text-red-300">{stuckCount}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/8 ring-1 ring-emerald-500/20">
            <Trophy className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Win Rate</span>
            <span className="text-xs font-bold text-foreground">{winRate !== null ? `${winRate}%` : '—'}</span>
            <span className="text-[10px] text-muted-foreground">{wonCount}W / {lostCount}L</span>
          </div>
        </div>
      )}

      {/* Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden rounded-2xl ring-1 ring-border pipeline-board">
          <div className="flex h-full overflow-x-auto">
            {STAGES.map((stage, idx) => {
              const col = (pipeline as any)[stage.key];
              const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
              const opps: Opportunity[] = [...(col?.opportunities ?? []) as Opportunity[]].sort((a, b) => {
                const ageDiff = agingDays(b.createdAt) - agingDays(a.createdAt);
                if (ageDiff !== 0) return ageDiff;
                const pA = PRIORITY_ORDER[a.lead?.priority ?? 'medium'] ?? 1;
                const pB = PRIORITY_ORDER[b.lead?.priority ?? 'medium'] ?? 1;
                return pA - pB;
              });
              const totalValue: number = col?.totalValue ?? 0;
              const stuckInStage = opps.filter((o) => agingDays(o.createdAt) > stage.sla).length;

              return (
                <div
                  key={stage.key}
                  className={`flex flex-col h-full flex-1 min-w-[260px] ${
                    idx < STAGES.length - 1 ? 'border-r border-border/40' : ''
                  }`}
                >
                  <div className="h-[3px] shrink-0" style={{ backgroundColor: stage.accent }} />
                  <div className="px-3 pt-2.5 pb-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{stage.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${stage.badge}`}>
                          {opps.length}
                        </span>
                        {stuckInStage > 0 && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                            {stuckInStage} stuck
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: stage.accent }}>
                        {formatCurrency(totalValue)}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">SLA · {stage.sla}d</p>
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`flex-1 overflow-y-auto px-2.5 pb-4 space-y-2 scrollbar-thin scrollbar-thumb-white/8 scrollbar-track-transparent transition-colors duration-150 ${
                      dragOverStage === stage.key && draggedOpp?.stage !== stage.key
                        ? 'bg-white/[0.04] ring-inset ring-1 ring-white/20'
                        : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (draggedOpp && draggedOpp.stage !== stage.key) {
                        setDragOverStage(stage.key);
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      dragCounterRef.current[stage.key] = (dragCounterRef.current[stage.key] ?? 0) + 1;
                      if (draggedOpp && draggedOpp.stage !== stage.key) {
                        setDragOverStage(stage.key);
                      }
                    }}
                    onDragLeave={() => {
                      dragCounterRef.current[stage.key] = Math.max(0, (dragCounterRef.current[stage.key] ?? 1) - 1);
                      if (dragCounterRef.current[stage.key] === 0) {
                        setDragOverStage((prev) => (prev === stage.key ? null : prev));
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      dragCounterRef.current[stage.key] = 0;
                      setDragOverStage(null);
                      if (draggedOpp && draggedOpp.stage !== stage.key) {
                        setDropConfirm({ opp: draggedOpp, toStage: stage.key, lostReason: '' });
                      }
                      setDraggedOpp(null);
                    }}
                  >
                    <AnimatePresence>
                      {opps.map((opp) => (
                        <OppCard
                          key={opp.id}
                          opp={opp}
                          stage={stage}
                          isDragging={draggedOpp?.id === opp.id}
                          isSelected={!!selectedLeadId && opp.lead?.id === selectedLeadId}
                          onDragStart={(o) => { setDraggedOpp(o); dragCounterRef.current = {}; }}
                          onDragEnd={() => { setDraggedOpp(null); setDragOverStage(null); }}
                          onMove={(id, s, lr) => stageMutation.mutate({ id, stage: s, lostReason: lr })}
                          onSelect={(o) => onSelectOpp?.(o.lead?.id ?? null, o.id)}
                        />
                      ))}
                    </AnimatePresence>
                    {opps.length === 0 && !draggedOpp && (
                      <div className="h-24 flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <div
                          className="w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center"
                          style={{ borderColor: `${stage.accent}25` }}
                        >
                          <Plus className="w-3 h-3" style={{ color: `${stage.accent}40` }} />
                        </div>
                        <span className="text-[10px]">No deals here</span>
                      </div>
                    )}
                    {dragOverStage === stage.key && draggedOpp?.stage !== stage.key && opps.length === 0 && (
                      <div className="h-16 flex items-center justify-center rounded-xl border-2 border-dashed border-border text-[10px] text-muted-foreground">
                        Drop here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Closed summary column */}
            <div className="flex flex-col h-full shrink-0 border-l border-border/40" style={{ width: 180 }}>
              <div className="h-[3px] shrink-0 bg-border" />
              <div className="px-3 pt-2.5 pb-2 shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Closed</p>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
                <div className="p-3 rounded-xl bg-emerald-500/8 ring-1 ring-emerald-500/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Won</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{wonCount}</p>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">{formatCurrency(wonValue)}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/8 ring-1 ring-red-500/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-bold text-red-400">Lost</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{lostCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lostCount > 0
                      ? `${Math.round((lostCount / (wonCount + lostCount)) * 100)}% of closed`
                      : '—'}
                  </p>
                </div>
                {winRate !== null && (
                  <div className="p-3 rounded-xl bg-muted/50 ring-1 ring-border text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Win Rate</p>
                    <p className={`text-2xl font-black ${winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {winRate}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop confirmation modal */}
      <AnimatePresence>
        {dropConfirm && (() => {
          const toStageCfg = STAGES.find((s) => s.key === dropConfirm.toStage);
          const isLost = dropConfirm.toStage === 'closed_lost';
          const isWon = dropConfirm.toStage === 'closed_won';
          return (
            <motion.div
              key="drop-confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setDropConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm mx-4 rounded-2xl p-5 border shadow-2xl ${
                  isLost
                    ? 'bg-card dark:bg-[#1a1020] border-red-500/40'
                    : isWon
                    ? 'bg-card dark:bg-[#0e1f16] border-emerald-500/40'
                    : 'bg-card dark:bg-[#12122a] border-border'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isLost ? '#ef444420' : isWon ? '#10b98120' : `${toStageCfg?.accent}18` }}
                  >
                    {isLost && <XCircle className="w-5 h-5 text-red-400" />}
                    {isWon && <Trophy className="w-5 h-5 text-emerald-400" />}
                    {!isLost && !isWon && <MoveRight className="w-5 h-5" style={{ color: toStageCfg?.accent }} />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Move deal</p>
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {dropConfirm.opp.opportunityNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="text-xs text-muted-foreground capitalize">
                    {dropConfirm.opp.stage.replace('_', ' ')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span
                    className="text-xs font-bold capitalize"
                    style={{ color: isLost ? '#f87171' : isWon ? '#34d399' : toStageCfg?.accent }}
                  >
                    {dropConfirm.toStage.replace('_', ' ')}
                  </span>
                </div>

                {isLost && (
                  <textarea
                    value={dropConfirm.lostReason}
                    onChange={(e) =>
                      setDropConfirm((prev) => prev ? { ...prev, lostReason: e.target.value } : prev)
                    }
                    rows={3}
                    placeholder="Reason for losing this deal…"
                    className="w-full px-3 py-2 bg-muted/60 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/40 resize-none mb-4"
                    autoFocus
                  />
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setDropConfirm(null)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 rounded-xl hover:bg-accent transition-colors border border-border"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    disabled={isLost && !dropConfirm.lostReason.trim()}
                    onClick={() => {
                      stageMutation.mutate({
                        id: dropConfirm.opp.id,
                        stage: dropConfirm.toStage,
                        lostReason: dropConfirm.lostReason || undefined,
                      });
                      setDropConfirm(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition-colors disabled:opacity-40 ${
                      isLost
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : isWon
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isLost ? 'Confirm Lost' : isWon ? 'Mark Won' : 'Confirm Move'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
