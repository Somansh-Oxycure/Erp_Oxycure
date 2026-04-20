'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, ChevronDown, Calendar } from 'lucide-react';
import { useCRMStore } from '@/stores/crm-store';
import { KanbanBoard } from '@/components/crm/kanban-board';
import { LeadDetailPanel } from '@/components/leads/lead-detail-panel';
import { CreateLeadDialog } from '@/components/leads/create-lead-dialog';

// ─── Date range presets ────────────────────────────────────────────────────────
type DatePreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_3_months' | 'all_time';

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'This Month',    value: 'this_month'    },
  { label: 'Last Month',    value: 'last_month'    },
  { label: 'This Quarter',  value: 'this_quarter'  },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'All Time',      value: 'all_time'      },
];

function getDateRange(preset: DatePreset): { from: string | null; to: string | null } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'all_time') return { from: null, to: null };

  const today = toISO(now);

  if (preset === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toISO(from), to: today };
  }
  if (preset === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISO(from), to: toISO(to) };
  }
  if (preset === 'this_quarter') {
    const q     = Math.floor(now.getMonth() / 3);
    const from  = new Date(now.getFullYear(), q * 3, 1);
    return { from: toISO(from), to: today };
  }
  if (preset === 'last_3_months') {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return { from: toISO(from), to: today };
  }
  return { from: null, to: null };
}

export default function CRMPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const {
    selectedId,
    filters,
    setSelectedId,
    setSearch,
    setDateRange,
  } = useCRMStore();

  const [showCreate,    setShowCreate]    = useState(false);
  const [datePreset,    setDatePreset]    = useState<DatePreset>('this_month');
  const [showDateDrop,  setShowDateDrop]  = useState(false);

  // ── Sync URL → store on mount ─────────────────────────────────────────────
  useEffect(() => {
    const id = searchParams.get('id') ?? searchParams.get('deal');
    if (id) setSelectedId(id);
    // Initialise date range to "This Month"
    setDateRange(getDateRange('this_month'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Push ?id= to URL ──────────────────────────────────────────────────────
  const pushId = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams();
      if (id) p.set('id', id);
      router.replace(id ? `/crm?${p.toString()}` : '/crm', { scroll: false });
    },
    [router],
  );

  const handleSelectLead = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      pushId(id);
    },
    [setSelectedId, pushId],
  );

  // ── Date preset change ────────────────────────────────────────────────────
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setDateRange(getDateRange(preset));
    setShowDateDrop(false);
  };

  const selectedPresetLabel = DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? 'This Month';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-background shrink-0">
        {/* Center: search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Company Name, Service, Tag etc..."
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date range dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowDateDrop((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            {selectedPresetLabel}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {showDateDrop && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDateDrop(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 w-44 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePresetChange(p.value)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      datePreset === p.value
                        ? 'bg-sky-500/10 text-sky-500 font-medium'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Find Opportunity CTA */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-[0.98] shrink-0"
        >
          Find Opportunity
        </button>
      </div>

      {/* ── Kanban Board (full height) ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <KanbanBoard
          selectedLeadId={selectedId}
          onSelectLead={handleSelectLead}
          searchQuery={filters.search}
          dateRange={filters.dateRange}
        />
      </div>

      {/* ── Shared Detail Panel ──────────────────────────────────────────────── */}
      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => handleSelectLead(null)}
      />

      {/* ── Create Lead Dialog ───────────────────────────────────────────────── */}
      <CreateLeadDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

