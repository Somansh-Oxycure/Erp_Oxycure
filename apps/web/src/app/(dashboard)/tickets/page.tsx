'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Plus, ChevronDown, Calendar } from 'lucide-react';
import { useCRMStore } from '@/stores/crm-store';
import { TicketDetailPanel } from '@/components/tickets/ticket-detail-panel';
import { CreateTicketSheet } from '@/components/tickets/create-ticket-sheet';
import { TicketTable } from '@/components/tickets/ticket-table';
import { TicketStatsCards } from '@/components/tickets/ticket-stats-cards';
import { ticketsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
    return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  if (preset === 'last_month') {
    return {
      from: toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: toISO(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return { from: toISO(new Date(now.getFullYear(), q * 3, 1)), to: today };
  }
  if (preset === 'last_3_months') {
    return { from: toISO(new Date(now.getFullYear(), now.getMonth() - 3, 1)), to: today };
  }
  return { from: null, to: null };
}

const TICKET_STATUSES = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'site_inspection', label: 'Site Inspection' },
  { value: 'design_review', label: 'Design Review' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

function TicketsPageInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const {
    selectedId,
    filters,
    setSelectedId,
    setSearch,
    setDateRange,
  } = useCRMStore();

  const [showCreate,   setShowCreate]   = useState(false);
  const [datePreset,   setDatePreset]   = useState<DatePreset>('this_month');
  const [showDateDrop, setShowDateDrop] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy]       = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const LIMIT = 20;

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setSelectedId(id);
    setDateRange(getDateRange('this_month'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushId = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams();
      if (id) p.set('id', id);
      router.replace(id ? `/tickets?${p.toString()}` : '/tickets', { scroll: false });
    },
    [router],
  );

  const handleSelectTicket = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      pushId(id);
    },
    [setSelectedId, pushId],
  );

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    setDateRange(getDateRange(preset));
    setShowDateDrop(false);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const queryParams: Record<string, unknown> = {
    page,
    limit: LIMIT,
    sortBy,
    sortOrder,
    ...(filters.search && { search: filters.search }),
    ...(statusFilter && { status: statusFilter }),
    ...(filters.dateRange.from && { dateFrom: filters.dateRange.from }),
    ...(filters.dateRange.to && { dateTo: filters.dateRange.to }),
  };

  const { data: ticketsResp, isLoading } = useQuery({
    queryKey: ['tickets', queryParams],
    queryFn: () => ticketsApi.findAll(queryParams),
  });

  const tickets = ticketsResp?.data?.data || [];
  const meta    = ticketsResp?.data?.meta || { total: 0 };

  const selectedPresetLabel = DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? 'This Month';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-background shrink-0">
        <h1 className="text-sm font-bold text-foreground shrink-0">Tickets</h1>
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by client, project, phone, ticket #..."
            value={filters.search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-9 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
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
                      datePreset === p.value ? 'bg-sky-500/10 text-sky-500 font-medium' : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* ── Status filter tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-5 py-2 border-b border-border bg-background shrink-0 overflow-x-auto">
        {TICKET_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatusFilter(s.value); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
              statusFilter === s.value
                ? 'bg-sky-500/15 text-sky-600 border border-sky-500/30'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 shrink-0">
        <TicketStatsCards />
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 pb-5">
        <TicketTable
          tickets={tickets}
          isLoading={isLoading}
          total={meta.total}
          page={page}
          limit={LIMIT}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onPageChange={setPage}
          onTicketClick={(t) => handleSelectTicket(t.id)}
          onSort={handleSort}
          selectedTicketId={selectedId}
        />
      </div>

      {/* ── Detail Panel ────────────────────────────────────────────────────── */}
      <TicketDetailPanel
        ticketId={selectedId}
        onClose={() => handleSelectTicket(null)}
      />

      {/* ── Create Sheet ─────────────────────────────────────────────────────── */}
      <CreateTicketSheet open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense>
      <TicketsPageInner />
    </Suspense>
  );
}
