'use client';

import { useEffect, useState, useDeferredValue, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutGrid,
  List,
  Columns2,
  Plus,
  Search,
  X,
  DollarSign,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { opportunitiesApi } from '@/lib/api';
import { useCRMStore, type CRMView } from '@/stores/crm-store';
import { KanbanBoard } from '@/components/crm/kanban-board';
import { LeadsListView } from '@/components/crm/leads-list-view';
import { SplitView } from '@/components/crm/split-view';
import { LeadDetailPanel } from '@/components/leads/lead-detail-panel';
import { CreateLeadDialog } from '@/components/leads/create-lead-dialog';
import type { Lead } from '@/components/leads/lead-table';

const VIEWS: { key: CRMView; label: string; icon: React.ElementType }[] = [
  { key: 'kanban', label: 'Kanban',     icon: LayoutGrid },
  { key: 'list',   label: 'Leads List', icon: List       },
  { key: 'split',  label: 'Split',      icon: Columns2   },
];

export default function CRMPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    activeView,
    selectedId,
    filters,
    setActiveView,
    setSelectedId,
    setSearch,
    setProductType,
  } = useCRMStore();

  const [showCreate, setShowCreate] = useState(false);

  const deferredSearch = useDeferredValue(filters.search);

  // ── Sync URL → store on mount ───────────────────────────────────────────────
  useEffect(() => {
    const view = searchParams.get('view') as CRMView | null;
    const id = searchParams.get('id') ?? searchParams.get('deal');
    if (view && ['kanban', 'list', 'split'].includes(view)) setActiveView(view);
    if (id) setSelectedId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── URL push helper ─────────────────────────────────────────────────────────
  const pushURL = useCallback(
    (view: CRMView, id: string | null) => {
      const p = new URLSearchParams();
      p.set('view', view);
      if (id) p.set('id', id);
      router.replace(`/crm?${p.toString()}`, { scroll: false });
    },
    [router],
  );

  const handleViewChange = (v: CRMView) => {
    setActiveView(v);
    pushURL(v, selectedId);
  };

  const handleSelectLead = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      pushURL(activeView, id);
    },
    [activeView, setSelectedId, pushURL],
  );

  const handleLeadClick = useCallback(
    (lead: Lead) => handleSelectLead(lead.id),
    [handleSelectLead],
  );

  const handleKanbanSelect = useCallback(
    (leadId: string | null) => handleSelectLead(leadId),
    [handleSelectLead],
  );

  // ── Pipeline value badge ────────────────────────────────────────────────────
  const { data: pipelineData } = useQuery({
    queryKey: ['pipeline'],
    queryFn: () => opportunitiesApi.pipeline().then((r) => r.data),
    staleTime: 30000,
  });
  const pipeline = pipelineData?.data ?? pipelineData ?? {};
  const totalPipelineValue = ['prospect', 'discovery', 'proposal', 'negotiation'].reduce(
    (sum, k) => sum + ((pipeline as any)[k]?.totalValue ?? 0),
    0,
  );

  const isKanban = activeView === 'kanban';
  const isList   = activeView === 'list';
  const isSplit  = activeView === 'split';

  return (
    <div className={cn('flex flex-col min-h-full', isSplit ? 'h-full overflow-hidden' : '')}>
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0 flex-wrap">
        {/* Left: title + pipeline badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Pipeline &amp; Leads</h1>
          </div>
          {totalPipelineValue > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 ring-1 ring-sky-500/25 shrink-0">
              <DollarSign className="w-3 h-3 text-sky-400" />
              <span className="text-xs font-bold text-sky-400">{formatCurrency(totalPipelineValue)}</span>
            </div>
          )}
        </div>

        {/* Center: global search */}
        <div className="flex-1 max-w-sm min-w-[180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search leads &amp; deals..."
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Add Lead button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-sky-200 active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* ── View Toggle (tab strip) ── */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-background/60 shrink-0">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = activeView === v.key;
          return (
            <button
              key={v.key}
              onClick={() => handleViewChange(v.key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* ── Main content area ── */}
      <div className={cn(
        'flex-1 min-h-0',
        isKanban || isList ? 'p-6' : 'overflow-hidden',
        isSplit ? 'flex flex-col' : '',
      )}>
        {/* Kanban view */}
        {isKanban && (
          <div className="h-full">
            <KanbanBoard
              selectedLeadId={selectedId}
              onSelectOpp={(leadId) => handleKanbanSelect(leadId)}
            />
          </div>
        )}

        {/* Leads List view */}
        {isList && (
          <LeadsListView
            selectedLeadId={selectedId}
            onLeadSelect={handleLeadClick}
            externalSearch={deferredSearch}
            externalProductType={filters.productType}
          />
        )}

        {/* Split view */}
        {isSplit && (
          <div className="flex-1 min-h-0 px-6 pb-6 pt-2">
            <SplitView
              selectedLeadId={selectedId}
              onLeadSelect={handleLeadClick}
              onKanbanSelect={(leadId) => handleKanbanSelect(leadId)}
              externalSearch={deferredSearch}
              externalProductType={filters.productType}
            />
          </div>
        )}
      </div>

      {/* ── Shared Detail Panel ── */}
      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => handleSelectLead(null)}
      />

      {/* ── Create Lead Dialog ── */}
      <CreateLeadDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
