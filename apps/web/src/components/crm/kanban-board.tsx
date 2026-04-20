'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Download,
  Trophy,
  XCircle,
  MoveRight,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { opportunitiesApi, leadsApi } from '@/lib/api';
import { formatCurrency, getAvatarColor, SOURCE_LABELS, PRODUCT_TYPE_LABELS } from '@/lib/utils';
import type { Lead } from '@/components/leads/lead-table';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  quotations?: { id: string; quotationNumber: string; status: string; totalAmount: number | string }[];
}

// â”€â”€â”€ Board column config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BOARD_COLUMNS = [
  { key: 'leads',         label: 'LEADS',        color: '#3b82f6' },
  { key: 'first_contact', label: 'FIRST CONTACT', color: '#8b5cf6' },
  { key: 'meeting',       label: 'MEETING',       color: '#22d3ee' },
  { key: 'proposal',      label: 'PROPOSAL',      color: '#a78bfa' },
  { key: 'negotiate',     label: 'NEGOTIATE',     color: '#fbbf24' },
  { key: 'closed',        label: 'CLOSED',        color: '#10b981' },
] as const;

type ColumnKey = typeof BOARD_COLUMNS[number]['key'];

const OPP_STAGE_TO_COL: Record<string, ColumnKey> = {
  discovery:   'meeting',
  proposal:    'proposal',
  negotiation: 'negotiate',
  closed_won:  'closed',
  closed_lost: 'closed',
};

const COL_TO_OPP_STAGE: Record<string, string> = {
  meeting:  'discovery',
  proposal: 'proposal',
  negotiate: 'negotiation',
  closed:   'closed_won',
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatCardDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function cardName(lead?: Lead | null, opp?: Opportunity | null): string {
  if (lead) {
    return lead.companyName || `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`;
  }
  if (opp) {
    return opp.lead?.companyName
      || opp.customer?.companyName
      || opp.title
      || (opp.lead?.firstName ?? 'â€”');
  }
  return 'â€”';
}

function cardInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// â”€â”€â”€ Lead Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LeadCard({
  lead,
  isSelected,
  onSelect,
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: (leadId: string) => void;
}) {
  const name        = cardName(lead, null);
  const initials    = cardInitials(name);
  const avatarBg    = getAvatarColor(name);
  const sourceLabel = SOURCE_LABELS[lead.source] ?? lead.source ?? 'â€”';
  const ptLabel     = PRODUCT_TYPE_LABELS[lead.productType ?? ''] ?? lead.productType ?? 'General';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      onClick={() => onSelect(lead.id)}
      className={`cursor-pointer select-none rounded-xl p-3 transition-all duration-150 ${
        isSelected
          ? 'ring-2 ring-sky-500/70 bg-card shadow-md'
          : 'bg-card ring-1 ring-border shadow-sm hover:shadow-md hover:ring-border/80'
      }`}
    >
      {/* Row 1: Avatar + Name + Value */}
      <div className="flex items-start gap-2.5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{name}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{formatCurrency(lead.estimatedValue)}</p>
        </div>
      </div>

      {/* Row 2: 3 pill tags */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">{sourceLabel}</span>
        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">Lead</span>
        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">{ptLabel}</span>
      </div>

      {/* Row 3: source left, date right */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">{sourceLabel}</span>
        <span className="text-[10px] text-muted-foreground">{formatCardDate(lead.createdAt)}</span>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Opportunity Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OppCard({
  opp,
  isSelected,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  opp: Opportunity;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (leadId: string | null) => void;
  onDragStart: (opp: Opportunity) => void;
  onDragEnd: () => void;
}) {
  const name        = cardName(null, opp);
  const initials    = cardInitials(name);
  const avatarBg    = getAvatarColor(name);
  const sourceLabel = SOURCE_LABELS[opp.lead?.source ?? ''] ?? opp.lead?.source ?? 'â€”';
  const ptLabel     = PRODUCT_TYPE_LABELS[opp.lead?.productType ?? ''] ?? opp.lead?.productType ?? 'General';
  const isWon  = opp.stage === 'closed_won';
  const isLost = opp.stage === 'closed_lost';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      draggable={!isWon && !isLost}
      onDragStart={(e) => {
        (e as unknown as React.DragEvent).dataTransfer.setData('oppId', opp.id);
        onDragStart(opp);
      }}
      onDragEnd={() => onDragEnd()}
      onClick={() => onSelect(opp.lead?.id ?? null)}
      className={`cursor-pointer select-none rounded-xl p-3 transition-all duration-150 ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${
        isSelected
          ? 'ring-2 ring-sky-500/70 bg-card shadow-md'
          : isWon
          ? 'bg-card ring-1 ring-emerald-500/30 shadow-sm hover:shadow-md'
          : isLost
          ? 'bg-card ring-1 ring-red-500/25 shadow-sm hover:shadow-md'
          : 'bg-card ring-1 ring-border shadow-sm hover:shadow-md hover:ring-border/80'
      }`}
    >
      {/* Row 1: Avatar + Name + Value */}
      <div className="flex items-start gap-2.5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBg}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground leading-snug truncate">{name}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{formatCurrency(opp.dealValue)}</p>
        </div>
        {(isWon || isLost) && (
          <div className="shrink-0 mt-0.5">
            {isWon
              ? <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              : <XCircle className="w-3.5 h-3.5 text-red-400" />
            }
          </div>
        )}
      </div>

      {/* Row 2: 3 pill tags */}
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">{sourceLabel}</span>
        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">Deal</span>
        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">{ptLabel}</span>
      </div>

      {/* Row 3: source left, date right */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">{sourceLabel}</span>
        <span className="text-[10px] text-muted-foreground">{formatCardDate(opp.createdAt)}</span>
      </div>
    </motion.div>
  );
}

// â”€â”€â”€ Column Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ColumnHeader({
  label, count, totalValue, color,
}: {
  label: string; count: number; totalValue: number; color: string;
}) {
  return (
    <div className="shrink-0 px-4 pt-3 pb-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold tracking-wider text-foreground/80 uppercase truncate">
            {label}
          </span>
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {count}
          </span>
        </div>
        <button
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Export column"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs font-semibold text-foreground/70 mt-1">{formatCurrency(totalValue)}</p>
    </div>
  );
}

// â”€â”€â”€ Board Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface KanbanBoardProps {
  selectedLeadId?: string | null;
  onSelectLead?: (leadId: string | null) => void;
  searchQuery?: string;
  dateRange?: { from: string | null; to: string | null };
}

// â”€â”€â”€ Kanban Board â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function KanbanBoard({
  selectedLeadId,
  onSelectLead,
  searchQuery = '',
  dateRange,
}: KanbanBoardProps) {
  const queryClient = useQueryClient();

  const [draggedOpp,  setDraggedOpp]  = useState<Opportunity | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dropConfirm, setDropConfirm] = useState<{
    opp: Opportunity;
    toStage: string;
    lostReason: string;
  } | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  // Fetch pipeline (opportunities)
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => opportunitiesApi.pipeline().then((r) => r.data),
  });
  const pipeline = pipelineData?.data ?? pipelineData ?? {};

  // Fetch leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads', dateRange],
    queryFn: () =>
      leadsApi.findAll({
        limit: 300,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...(dateRange?.from ? { dateFrom: dateRange.from } : {}),
        ...(dateRange?.to   ? { dateTo:   dateRange.to   } : {}),
      }).then((r) => r.data),
  });
  const allLeads: Lead[] = leadsData?.data ?? [];

  const isLoading = pipelineLoading || leadsLoading;

  const stageMutation = useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: string; stage: string; lostReason?: string }) =>
      opportunitiesApi.updateStage(id, { stage, lostReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Deal moved');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to move'),
  });

  // Search filter
  const q = searchQuery.toLowerCase().trim();

  const filterLead = (lead: Lead) => {
    if (!q) return true;
    return (
      `${lead.firstName} ${lead.lastName ?? ''}`.toLowerCase().includes(q) ||
      (lead.companyName ?? '').toLowerCase().includes(q) ||
      (lead.source ?? '').toLowerCase().includes(q)
    );
  };

  const filterOpp = (opp: Opportunity) => {
    if (!q) return true;
    return (
      opp.title.toLowerCase().includes(q) ||
      (opp.lead?.companyName ?? '').toLowerCase().includes(q) ||
      (opp.lead?.firstName ?? '').toLowerCase().includes(q) ||
      (opp.customer?.companyName ?? '').toLowerCase().includes(q)
    );
  };

  // Partition data
  const leadsNew       = allLeads.filter((l) => (l.status === 'new' || l.status === 'contacted') && filterLead(l));
  const leadsQualified = allLeads.filter((l) => l.status === 'qualified' && filterLead(l));

  const getOpps = (stage: string): Opportunity[] =>
    ((pipeline as any)[stage]?.opportunities ?? [] as Opportunity[]).filter(filterOpp);

  const colOpps: Record<ColumnKey, Opportunity[]> = {
    leads:         [],
    first_contact: [],
    meeting:       getOpps('discovery'),
    proposal:      getOpps('proposal'),
    negotiate:     getOpps('negotiation'),
    closed:        [...getOpps('closed_won'), ...getOpps('closed_lost')],
  };

  const colCount = (key: ColumnKey) => {
    if (key === 'leads')         return leadsNew.length;
    if (key === 'first_contact') return leadsQualified.length;
    return colOpps[key].length;
  };

  const colValue = (key: ColumnKey) => {
    if (key === 'leads')         return leadsNew.reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0);
    if (key === 'first_contact') return leadsQualified.reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0);
    return colOpps[key].reduce((s, o) => s + Number(o.dealValue ?? 0), 0);
  };

  // Drag handlers (opportunity columns only)
  const isOppColKey = (key: string) => ['meeting', 'proposal', 'negotiate', 'closed'].includes(key);

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedOpp && OPP_STAGE_TO_COL[draggedOpp.stage] !== colKey) setDragOverCol(colKey);
  };

  const handleDragEnter = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    dragCounterRef.current[colKey] = (dragCounterRef.current[colKey] ?? 0) + 1;
    if (draggedOpp && OPP_STAGE_TO_COL[draggedOpp.stage] !== colKey) setDragOverCol(colKey);
  };

  const handleDragLeave = (colKey: string) => {
    dragCounterRef.current[colKey] = Math.max(0, (dragCounterRef.current[colKey] ?? 1) - 1);
    if (dragCounterRef.current[colKey] === 0) setDragOverCol((p) => p === colKey ? null : p);
  };

  const handleDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    dragCounterRef.current[colKey] = 0;
    setDragOverCol(null);
    if (!draggedOpp || OPP_STAGE_TO_COL[draggedOpp.stage] === colKey) { setDraggedOpp(null); return; }
    const targetStage = colKey === 'closed' ? 'closed_won' : COL_TO_OPP_STAGE[colKey];
    if (!targetStage) { setDraggedOpp(null); return; }
    setDropConfirm({ opp: draggedOpp, toStage: targetStage, lostReason: '' });
    setDraggedOpp(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full" style={{ minWidth: `${BOARD_COLUMNS.length * 280}px` }}>
          {BOARD_COLUMNS.map((col) => {
            const key     = col.key as ColumnKey;
            const isOppCol = isOppColKey(col.key);
            const isDragTarget = dragOverCol === col.key && !!draggedOpp && isOppCol;

            return (
              <div
                key={col.key}
                className={`flex flex-col h-full border-r border-border/40 last:border-r-0 transition-colors duration-150 ${
                  isDragTarget ? 'bg-white/[0.03]' : ''
                }`}
                style={{ width: 280, minWidth: 280 }}
                onDragOver={(e)  => isOppCol && handleDragOver(e, col.key)}
                onDragEnter={(e) => isOppCol && handleDragEnter(e, col.key)}
                onDragLeave={()  => isOppCol && handleDragLeave(col.key)}
                onDrop={(e)      => isOppCol && handleDrop(e, col.key)}
              >
                {/* Top colour bar */}
                <div className="h-0.5 shrink-0" style={{ backgroundColor: col.color }} />

                <ColumnHeader
                  label={col.label}
                  count={colCount(key)}
                  totalValue={colValue(key)}
                  color={col.color}
                />

                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2.5">
                  <AnimatePresence>
                    {key === 'leads' && leadsNew.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        isSelected={selectedLeadId === lead.id}
                        onSelect={(id) => onSelectLead?.(id)}
                      />
                    ))}
                    {key === 'first_contact' && leadsQualified.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        isSelected={selectedLeadId === lead.id}
                        onSelect={(id) => onSelectLead?.(id)}
                      />
                    ))}
                    {isOppCol && colOpps[key].map((opp) => (
                      <OppCard
                        key={opp.id}
                        opp={opp}
                        isSelected={!!selectedLeadId && opp.lead?.id === selectedLeadId}
                        isDragging={draggedOpp?.id === opp.id}
                        onSelect={(leadId) => onSelectLead?.(leadId)}
                        onDragStart={(o) => { setDraggedOpp(o); dragCounterRef.current = {}; }}
                        onDragEnd={() => { setDraggedOpp(null); setDragOverCol(null); }}
                      />
                    ))}
                  </AnimatePresence>

                  {colCount(key) === 0 && !draggedOpp && (
                    <div className="flex items-center justify-center h-20 text-[11px] text-muted-foreground">
                      No records
                    </div>
                  )}
                  {isDragTarget && colCount(key) === 0 && (
                    <div className="h-16 flex items-center justify-center rounded-xl border-2 border-dashed border-border text-[11px] text-muted-foreground">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drop confirmation modal */}
      <AnimatePresence>
        {dropConfirm && (() => {
          const isLost = dropConfirm.toStage === 'closed_lost';
          const isWon  = dropConfirm.toStage === 'closed_won';
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
                className={`w-full max-w-sm mx-4 rounded-2xl p-5 border shadow-2xl bg-card ${
                  isLost ? 'border-red-500/40' : isWon ? 'border-emerald-500/40' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isLost ? '#ef444420' : isWon ? '#10b98120' : '#3b82f620' }}
                  >
                    {isLost && <XCircle className="w-5 h-5 text-red-400" />}
                    {isWon  && <Trophy  className="w-5 h-5 text-emerald-400" />}
                    {!isLost && !isWon && <MoveRight className="w-5 h-5 text-sky-400" />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Move deal</p>
                    <p className="text-sm font-bold text-foreground">{dropConfirm.opp.opportunityNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="text-xs text-muted-foreground capitalize">
                    {dropConfirm.opp.stage.replace('_', ' ')}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span
                    className="text-xs font-bold capitalize"
                    style={{ color: isLost ? '#f87171' : isWon ? '#34d399' : '#60a5fa' }}
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
                    placeholder="Reason for losing this dealâ€¦"
                    className="w-full px-3 py-2 bg-muted/60 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/40 resize-none mb-4"
                    autoFocus
                  />
                )}

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setDropConfirm(null)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 rounded-xl hover:bg-accent transition-colors border border-border"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
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
