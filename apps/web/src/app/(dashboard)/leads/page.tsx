'use client';

import { useState, useCallback, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api';
import { LeadStatsCards, LeadStatusBar } from '@/components/leads/lead-stats-cards';
import { LeadFilters } from '@/components/leads/lead-filters';
import { LeadTable, type Lead } from '@/components/leads/lead-table';
import { LeadDetailPanel } from '@/components/leads/lead-detail-panel';
import { CreateLeadDialog } from '@/components/leads/create-lead-dialog';
import { Plus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

const LIMIT = 15;

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const qc = useQueryClient();

  const queryParams = {
    page,
    limit: LIMIT,
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
    setSearch(s);
    setPage(1);
  }, []);

  const handleProductTypeChange = useCallback((p: string) => {
    setProductType(p);
    setPage(1);
  }, []);

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

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLeadId(lead.id);
  }, []);

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['lead-stats'] });
  };

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground leading-tight"
          >
            Leads
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-muted-foreground mt-0.5"
          >
            Manage and track your sales pipeline
          </motion.p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-sky-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </motion.button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <LeadStatsCards />

      {/* ── Distribution bar ── */}
      <LeadStatusBar stats={stats} />

      {/* ── Filters ── */}
      <LeadFilters
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        search={search}
        onSearchChange={handleSearchChange}
        productType={productType}
        onProductTypeChange={handleProductTypeChange}
        byStatus={stats?.byStatus || {}}
        total={stats?.total || 0}
      />

      {/* ── Table ── */}
      <LeadTable
        leads={leads}
        isLoading={isLoading}
        total={total}
        page={page}
        onPageChange={setPage}
        onLeadClick={handleLeadClick}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        limit={LIMIT}
      />

      {/* ── Detail slide-over ── */}
      <LeadDetailPanel
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      {/* ── Create dialog ── */}
      <CreateLeadDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
