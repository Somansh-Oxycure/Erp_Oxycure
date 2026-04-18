'use client';

import { useState, useCallback, useDeferredValue } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api';
import { LeadStatsCards, LeadStatusBar } from '@/components/leads/lead-stats-cards';
import { LeadFilters } from '@/components/leads/lead-filters';
import { LeadTable, type Lead } from '@/components/leads/lead-table';
import { RefreshCw } from 'lucide-react';

const LIMIT = 15;
const COMPACT_LIMIT = 20;

interface LeadsListViewProps {
  /** If true, hides KPI cards and status bar (used in Split view right panel) */
  compact?: boolean;
  /** Controlled selected lead id for cross-panel sync */
  selectedLeadId?: string | null;
  onLeadSelect?: (lead: Lead) => void;
  /** External search/filter values for cross-view sync */
  externalSearch?: string;
  externalProductType?: string;
}

export function LeadsListView({
  compact = false,
  selectedLeadId,
  onLeadSelect,
  externalSearch,
  externalProductType,
}: LeadsListViewProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [internalSearch, setInternalSearch] = useState('');
  const [internalProductType, setInternalProductType] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const qc = useQueryClient();

  // Use external values if provided (cross-view sync), otherwise internal state
  const search = externalSearch !== undefined ? externalSearch : internalSearch;
  const productType = externalProductType !== undefined ? externalProductType : internalProductType;

  const deferredSearch = useDeferredValue(search);
  const limit = compact ? COMPACT_LIMIT : LIMIT;

  const queryParams = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(deferredSearch && { search: deferredSearch }),
    ...(productType !== 'all' && { productInterest: productType }),
    sortBy,
    sortOrder,
  };

  const { data: leadsResp, isLoading, isFetching } = useQuery({
    queryKey: ['leads', queryParams],
    queryFn: () => leadsApi.findAll(queryParams),
    placeholderData: (prev) => prev,
  });

  const { data: statsResp } = useQuery({
    queryKey: ['lead-stats'],
    queryFn: () => leadsApi.stats(),
    refetchInterval: 60000,
  });

  const leads: Lead[] = leadsResp?.data?.data || [];
  const total: number = leadsResp?.data?.meta?.total || 0;
  const stats = statsResp?.data?.data;

  const handleStatusChange = useCallback((s: string) => {
    setStatusFilter(s);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((s: string) => {
    if (externalSearch === undefined) {
      setInternalSearch(s);
    }
    setPage(1);
  }, [externalSearch]);

  const handleProductTypeChange = useCallback((p: string) => {
    if (externalProductType === undefined) {
      setInternalProductType(p);
    }
    setPage(1);
  }, [externalProductType]);

  const handleSort = useCallback((field: string) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('desc');
      return field;
    });
  }, []);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['lead-stats'] });
  };

  return (
    <div className={compact ? 'flex flex-col h-full overflow-hidden' : 'space-y-4'}>
      {/* KPI cards — hidden in compact mode */}
      {!compact && (
        <>
          <LeadStatsCards />
          <LeadStatusBar stats={stats} />
        </>
      )}

      {/* Filters header row with refresh */}
      <div className={compact ? 'flex items-center justify-between gap-2 px-2 py-1.5 shrink-0' : 'flex items-center justify-between gap-2'}>
        <div className="flex-1 min-w-0">
          <LeadFilters
            statusFilter={statusFilter}
            onStatusChange={handleStatusChange}
            search={externalSearch !== undefined ? externalSearch : internalSearch}
            onSearchChange={handleSearchChange}
            productType={externalProductType !== undefined ? externalProductType : internalProductType}
            onProductTypeChange={handleProductTypeChange}
            byStatus={stats?.byStatus || {}}
            total={stats?.total || 0}
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          title="Refresh"
          className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className={compact ? 'flex-1 overflow-auto min-h-0' : ''}>
        <LeadTable
          leads={leads}
          isLoading={isLoading}
          total={total}
          page={page}
          onPageChange={setPage}
          onLeadClick={(lead) => onLeadSelect?.(lead)}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          limit={limit}
          compact={compact}
          selectedLeadId={selectedLeadId}
        />
      </div>
    </div>
  );
}
