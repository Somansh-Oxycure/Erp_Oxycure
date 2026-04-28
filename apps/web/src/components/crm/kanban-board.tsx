'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Trophy,
  XCircle,
  Check,
  X,
  Clock,
  User,
  Tag,
  Zap,
  MoveRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { opportunitiesApi, leadsApi } from '@/lib/api';
import { formatCurrency, getAvatarColor, SOURCE_LABELS, PRODUCT_TYPE_LABELS } from '@/lib/utils';
import type { Lead } from '@/components/leads/lead-table';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  opportunityNumber: string;
  title: string;
  stage: string;
  dealValue: number | string | null;
  probability: number;
  expectedCloseDate?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    leadNumber: string;
    firstName: string;
    lastName: string | null;
    companyName: string | null;
    priority: string | null;
    source?: string | null;
    productType?: string | null;
  } | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string | null;
    companyName: string | null;
  } | null;
  assignedTo?: { id: string; firstName: string; lastName: string | null } | null;
}

type DragState =
  | { type: 'lead'; id: string }
  | { type: 'opp'; id: string; fromCol: ColKey }
  | null;

interface ConfirmModal {
  itemType: 'lead' | 'opp';
  itemId: string;
  targetStage: string;
  lostReason: string;
}

// ─── Pipeline column config ───────────────────────────────────────────────────

const COLUMNS = [
  { key: 'lead',     label: 'LEAD',     color: '#3b82f6', description: 'Incoming leads & enquiries'     },
  { key: 'design',   label: 'DESIGN',   color: '#8b5cf6', description: 'Site inspection & design phase'  },
  { key: 'proposal', label: 'PROPOSAL', color: '#f59e0b', description: 'Quotation & proposal review'     },
  { key: 'closed',   label: 'CLOSED',   color: '#10b981', description: 'Won & lost deals'                },
] as const;

type ColKey = typeof COLUMNS[number]['key'];

// Maps an opportunity stage to its board column
const STAGE_TO_COL: Record<string, ColKey> = {
  design:      'design',
  proposal:    'proposal',
  closed_won:  'closed',
  closed_lost: 'closed',
};

// Maps a column to the default stage when dropping into it
const COL_TO_STAGE: Record<string, string> = {
  design:   'design',
  proposal: 'proposal',
  closed:   'closed_won',
};

// ─── Aging helpers ────────────────────────────────────────────────────────────

type AgingBand = 'fresh' | 'watch' | 'overdue' | 'critical';

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function agingBand(days: number): AgingBand {
  if (days <= 7)  return 'fresh';
  if (days <= 14) return 'watch';
  if (days <= 29) return 'overdue';
  return 'critical';
}

function agingLabel(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  return `${days}d`;
}

const AGING_STYLE: Record<AgingBand, { badge: string; border: string; text: string; label: string }> = {
  fresh:    { badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', border: 'border-l-emerald-500', text: 'text-emerald-400', label: 'Fresh'    },
  watch:    { badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',       border: 'border-l-amber-500',   text: 'text-amber-400',   label: 'Watch'    },
  overdue:  { badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',   border: 'border-l-orange-500',  text: 'text-orange-400',  label: 'Overdue'  },
  critical: { badge: 'bg-red-500/15 text-red-400 border border-red-500/30',             border: 'border-l-red-500',     text: 'text-red-400',     label: 'Critical' },
};

// ─── Card helpers ─────────────────────────────────────────────────────────────

function cardInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function leadDisplayName(lead: Lead): string {
  return lead.companyName || `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`;
}

function oppDisplayName(opp: Opportunity): string {
  return (
    opp.lead?.companyName ||
    opp.customer?.companyName ||
    opp.title ||
    opp.lead?.firstName ||
    '—'
  );
}

function assigneeName(a?: { firstName: string; lastName: string | null } | null): string {
  if (!a) return 'Unassigned';
  return `${a.firstName}${a.lastName ? ` ${a.lastName}` : ''}`;
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  selected,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  selected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const name     = leadDisplayName(lead);
  const days     = daysAgo(lead.createdAt);
  const band     = agingBand(days);
  const ag       = AGING_STYLE[band];
  const ptLabel  = PRODUCT_TYPE_LABELS[lead.productType ?? ''] ?? 'General';
  const srcLabel = SOURCE_LABELS[lead.source] ?? lead.source ?? '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.35 : 1, scale: isDragging ? 0.97 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={() => onDragStart()}
      onDragEnd={() => onDragEnd()}
      onClick={onSelect}
      className={`
        cursor-grab active:cursor-grabbing select-none rounded-xl p-3
        border-l-[3px] transition-all duration-150
        ${ag.border}
        ${selected
          ? 'ring-2 ring-sky-500/70 bg-card shadow-lg'
          : 'bg-card ring-1 ring-border shadow-sm hover:shadow-md hover:ring-border/60'
        }
      `}
    >
      {/* Row 1 — Avatar, name, aging */}
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${getAvatarColor(name)}`}>
          {cardInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{name}</p>
          <p className="text-[12px] font-bold text-foreground/60 mt-0.5">{formatCurrency(lead.estimatedValue)}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ag.badge}`}>
          <Clock className="w-2.5 h-2.5" />
          {agingLabel(days)}
        </span>
      </div>

      {/* Row 2 — Tags */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
          <Tag className="w-2.5 h-2.5" />{ptLabel}
        </span>
        {srcLabel && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
            <Zap className="w-2.5 h-2.5" />{srcLabel}
          </span>
        )}
      </div>

      {/* Row 3 — Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-1 min-w-0">
          <User className="w-3 h-3 shrink-0 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">
            {assigneeName(lead.assignedTo)}
          </span>
        </div>
        <span className={`text-[10px] font-semibold ${ag.text}`}>{ag.label}</span>
      </div>

      {/* ── Space for Lead pipeline-specific features ── */}
    </motion.div>
  );
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────

function OppCard({
  opp,
  selected,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  opp: Opportunity;
  selected: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const isWon    = opp.stage === 'closed_won';
  const isLost   = opp.stage === 'closed_lost';
  const name     = oppDisplayName(opp);
  const days     = daysAgo(opp.createdAt);
  const band     = agingBand(days);
  const ag       = AGING_STYLE[band];
  const ptLabel  = PRODUCT_TYPE_LABELS[opp.lead?.productType ?? ''] ?? 'General';
  const srcLabel = SOURCE_LABELS[opp.lead?.source ?? ''] ?? opp.lead?.source ?? '';

  const borderClass = isWon ? 'border-l-emerald-500' : isLost ? 'border-l-red-500' : ag.border;
  const ringClass   = isWon
    ? 'ring-1 ring-emerald-500/25'
    : isLost
    ? 'ring-1 ring-red-500/20'
    : 'ring-1 ring-border hover:ring-border/60';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.35 : 1, scale: isDragging ? 0.97 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={() => onDragStart()}
      onDragEnd={() => onDragEnd()}
      onClick={onSelect}
      className={`
        cursor-grab active:cursor-grabbing select-none rounded-xl p-3
        border-l-[3px] transition-all duration-150
        ${borderClass}
        ${selected ? 'ring-2 ring-sky-500/70 bg-card shadow-lg' : `bg-card ${ringClass} shadow-sm hover:shadow-md`}
      `}
    >
      {/* Row 1 — Avatar, name, badge */}
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${getAvatarColor(name)}`}>
          {cardInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{name}</p>
          <p className="text-[12px] font-bold text-foreground/60 mt-0.5">{formatCurrency(opp.dealValue)}</p>
        </div>
        {isWon
          ? <Trophy  className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          : isLost
          ? <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          : <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ag.badge}`}>
              <Clock className="w-2.5 h-2.5" />
              {agingLabel(days)}
            </span>
        }
      </div>

      {/* Row 2 — Tags */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
          <Tag className="w-2.5 h-2.5" />{ptLabel}
        </span>
        {srcLabel && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
            <Zap className="w-2.5 h-2.5" />{srcLabel}
          </span>
        )}
      </div>

      {/* Row 3 — Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-1 min-w-0">
          <User className="w-3 h-3 shrink-0 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">
            {assigneeName(opp.assignedTo)}
          </span>
        </div>
        {isWon
          ? <span className="text-[10px] font-semibold text-emerald-400">Won</span>
          : isLost
          ? <span className="text-[10px] font-semibold text-red-400">Lost</span>
          : <span className={`text-[10px] font-semibold ${ag.text}`}>{ag.label}</span>
        }
      </div>

      {/* ── Space for Design / Proposal / Closed pipeline-specific features ── */}
    </motion.div>
  );
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ColumnHeader({
  label,
  count,
  totalValue,
  color,
}: {
  label: string;
  count: number;
  totalValue: number;
  color: string;
}) {
  return (
    <div className="px-4 pt-3 pb-2.5 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold tracking-widest text-foreground/70 uppercase">
          {label}
        </span>
        <span
          className="w-5 h-5 rounded text-[10px] font-bold text-white inline-flex items-center justify-center shrink-0"
          style={{ backgroundColor: color }}
        >
          {count}
        </span>
      </div>
      <p className="text-xs font-semibold text-foreground/50 mt-1">{formatCurrency(totalValue)}</p>
    </div>
  );
}

// ─── Board Props ──────────────────────────────────────────────────────────────

export interface KanbanBoardProps {
  selectedLeadId?: string | null;
  onSelectLead?: (leadId: string | null) => void;
  searchQuery?: string;
  dateRange?: { from: string | null; to: string | null };
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────────

export function KanbanBoard({
  selectedLeadId,
  onSelectLead,
  searchQuery = '',
  dateRange,
}: KanbanBoardProps) {
  const qc = useQueryClient();

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [drag,        setDrag]       = useState<DragState>(null);
  const [dragOverCol, setDragOverCol] = useState<ColKey | null>(null);
  const counterRef = useRef<Partial<Record<ColKey, number>>>({});

  // ── Confirm-close modal ─────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<ConfirmModal | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: pipelineRaw, isLoading: pipelineLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn:  () => opportunitiesApi.pipeline().then((r) => r.data),
  });
  const pipeline = pipelineRaw?.data ?? pipelineRaw ?? {};

  const { data: leadsRaw, isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads', dateRange],
    queryFn:  () =>
      leadsApi.findAll({
        limit:     300,
        sortBy:    'createdAt',
        sortOrder: 'desc',
        ...(dateRange?.from ? { dateFrom: dateRange.from } : {}),
        ...(dateRange?.to   ? { dateTo:   dateRange.to   } : {}),
      }).then((r) => r.data),
  });
  const allLeads: Lead[] = leadsRaw?.data ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────────
  const promoteMutation = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
      opportunitiesApi.promoteFromLead({ leadId, stage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead promoted to pipeline');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to promote lead'),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: string; stage: string; lostReason?: string }) =>
      opportunitiesApi.updateStage(id, { stage, lostReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Deal moved');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to move deal'),
  });

  // ── Filtered & partitioned data ─────────────────────────────────────────────
  const q = searchQuery.toLowerCase().trim();

  const matchLead = (l: Lead) =>
    !q ||
    `${l.firstName} ${l.lastName ?? ''} ${l.companyName ?? ''}`.toLowerCase().includes(q);

  const matchOpp = (o: Opportunity) =>
    !q ||
    `${o.title} ${o.lead?.companyName ?? ''} ${o.lead?.firstName ?? ''} ${o.customer?.companyName ?? ''}`
      .toLowerCase()
      .includes(q);

  const byCreatedAsc = (a: { createdAt: string }, b: { createdAt: string }) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const leadsCol: Lead[] = allLeads
    .filter((l) => ['new', 'contacted', 'qualified'].includes(l.status ?? ''))
    .filter(matchLead)
    .sort(byCreatedAsc);

  const getOpps = (stage: string): Opportunity[] =>
    ((pipeline as any)[stage]?.opportunities ?? [] as Opportunity[])
      .filter(matchOpp)
      .sort(byCreatedAsc);

  const colOpps: Record<ColKey, Opportunity[]> = {
    lead:     [],
    design:   getOpps('design'),
    proposal: getOpps('proposal'),
    closed:   [...getOpps('closed_won'), ...getOpps('closed_lost')].sort(byCreatedAsc),
  };

  const colCount = (key: ColKey) =>
    key === 'lead' ? leadsCol.length : colOpps[key].length;

  const colValue = (key: ColKey) =>
    key === 'lead'
      ? leadsCol.reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0)
      : colOpps[key].reduce((s, o) => s + Number(o.dealValue ?? 0), 0);

  // ── Drop target validation ───────────────────────────────────────────────────
  const isDroppableTarget = (col: ColKey): boolean => {
    if (!drag) return false;
    if (col === 'lead') return false;
    if (drag.type === 'opp' && drag.fromCol === col) return false;
    return true;
  };

  // ── Execute drop ─────────────────────────────────────────────────────────────
  const executeDrop = (targetCol: ColKey) => {
    if (!drag || !isDroppableTarget(targetCol)) return;

    if (targetCol === 'closed') {
      setConfirm({
        itemType:    drag.type,
        itemId:      drag.id,
        targetStage: 'closed_won',
        lostReason:  '',
      });
    } else if (drag.type === 'lead') {
      promoteMutation.mutate({ leadId: drag.id, stage: COL_TO_STAGE[targetCol] });
    } else {
      stageMutation.mutate({ id: drag.id, stage: COL_TO_STAGE[targetCol] });
    }

    setDrag(null);
  };

  const confirmClose = () => {
    if (!confirm) return;
    if (confirm.itemType === 'lead') {
      promoteMutation.mutate({ leadId: confirm.itemId, stage: confirm.targetStage });
    } else {
      stageMutation.mutate({
        id:         confirm.itemId,
        stage:      confirm.targetStage,
        lostReason: confirm.lostReason || undefined,
      });
    }
    setConfirm(null);
  };

  // ── Drag event handlers (column level) ─────────────────────────────────────
  const onDragOver = (e: React.DragEvent, col: ColKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = isDroppableTarget(col) ? 'move' : 'none';
    if (isDroppableTarget(col)) setDragOverCol(col);
  };

  const onDragEnter = (e: React.DragEvent, col: ColKey) => {
    e.preventDefault();
    counterRef.current[col] = (counterRef.current[col] ?? 0) + 1;
    if (isDroppableTarget(col)) setDragOverCol(col);
  };

  const onDragLeave = (col: ColKey) => {
    counterRef.current[col] = Math.max(0, (counterRef.current[col] ?? 1) - 1);
    if (counterRef.current[col] === 0) {
      setDragOverCol((prev) => (prev === col ? null : prev));
    }
  };

  const onDrop = (e: React.DragEvent, col: ColKey) => {
    e.preventDefault();
    counterRef.current[col] = 0;
    setDragOverCol(null);
    executeDrop(col);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (pipelineLoading || leadsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full" style={{ minWidth: `${COLUMNS.length * 300}px` }}>

          {COLUMNS.map((col) => {
            const key      = col.key as ColKey;
            const isTarget = dragOverCol === key && isDroppableTarget(key);

            return (
              <div
                key={col.key}
                className={`
                  flex flex-col h-full border-r border-border/40 last:border-r-0
                  transition-colors duration-100
                  ${isTarget ? 'bg-white/[0.025]' : ''}
                `}
                style={{ width: 300, minWidth: 300 }}
                onDragOver={(e)  => onDragOver(e, key)}
                onDragEnter={(e) => onDragEnter(e, key)}
                onDragLeave={()  => onDragLeave(key)}
                onDrop={(e)      => onDrop(e, key)}
              >
                {/* Column accent bar */}
                <div className="h-0.5 shrink-0" style={{ backgroundColor: col.color }} />

                <ColumnHeader
                  label={col.label}
                  count={colCount(key)}
                  totalValue={colValue(key)}
                  color={col.color}
                />

                {/* Drop target indicator */}
                {isTarget && (
                  <div className="mx-3 mb-2 shrink-0">
                    <div
                      className="h-10 rounded-xl border-2 border-dashed flex items-center justify-center text-[11px] text-muted-foreground"
                      style={{ borderColor: `${col.color}50` }}
                    >
                      Drop here
                    </div>
                  </div>
                )}

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2.5">
                  <AnimatePresence>

                    {/* Lead column — Lead records */}
                    {key === 'lead' && leadsCol.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        selected={selectedLeadId === lead.id}
                        isDragging={drag?.type === 'lead' && drag.id === lead.id}
                        onSelect={() => onSelectLead?.(lead.id)}
                        onDragStart={() => { setDrag({ type: 'lead', id: lead.id }); counterRef.current = {}; }}
                        onDragEnd={() => { setDrag(null); setDragOverCol(null); }}
                      />
                    ))}

                    {/* Design / Proposal / Closed columns — Opportunity records */}
                    {key !== 'lead' && colOpps[key].map((opp) => (
                      <OppCard
                        key={opp.id}
                        opp={opp}
                        selected={!!selectedLeadId && opp.lead?.id === selectedLeadId}
                        isDragging={drag?.type === 'opp' && drag.id === opp.id}
                        onSelect={() => onSelectLead?.(opp.lead?.id ?? null)}
                        onDragStart={() => {
                          setDrag({ type: 'opp', id: opp.id, fromCol: STAGE_TO_COL[opp.stage] ?? key });
                          counterRef.current = {};
                        }}
                        onDragEnd={() => { setDrag(null); setDragOverCol(null); }}
                      />
                    ))}

                  </AnimatePresence>

                  {/* Empty state */}
                  {colCount(key) === 0 && !isTarget && (
                    <div className="flex h-24 items-center justify-center text-[11px] text-muted-foreground">
                      No records
                    </div>
                  )}
                </div>

                {/* ── Per-column feature space ──────────────────────────────── */}
                {/* TODO: Add {col.label}-specific pipeline features here       */}

              </div>
            );
          })}

        </div>
      </div>

      {/* ── Confirm close modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 rounded-2xl p-5 border border-border bg-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <MoveRight className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Move to Closed</p>
                  <p className="text-sm font-bold text-foreground">Select outcome</p>
                </div>
              </div>

              {/* Won / Lost toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setConfirm((p) => p ? { ...p, targetStage: 'closed_won', lostReason: '' } : p)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    confirm.targetStage === 'closed_won'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />Won
                </button>
                <button
                  onClick={() => setConfirm((p) => p ? { ...p, targetStage: 'closed_lost' } : p)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    confirm.targetStage === 'closed_lost'
                      ? 'bg-red-600 text-white border-red-600 shadow-md'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />Lost
                </button>
              </div>

              {/* Lost reason textarea */}
              {confirm.targetStage === 'closed_lost' && (
                <textarea
                  value={confirm.lostReason}
                  onChange={(e) => setConfirm((p) => p ? { ...p, lostReason: e.target.value } : p)}
                  rows={3}
                  autoFocus
                  placeholder="Reason for losing this deal…"
                  className="w-full px-3 py-2.5 bg-muted/60 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/40 resize-none mb-4"
                />
              )}

              {/* Actions */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-accent border border-border transition-colors"
                >
                  <X className="w-3.5 h-3.5" />Cancel
                </button>
                <button
                  disabled={confirm.targetStage === 'closed_lost' && !confirm.lostReason.trim()}
                  onClick={confirmClose}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${
                    confirm.targetStage === 'closed_lost'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
