'use client';

import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { cn, STATUS_CONFIG, PRODUCT_TYPE_LABELS } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUSES = ['all', 'new', 'contacted', 'qualified', 'quoted', 'won', 'lost'] as const;

interface LeadFiltersProps {
  statusFilter: string;
  onStatusChange: (s: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  productType: string;
  onProductTypeChange: (p: string) => void;
  byStatus: Record<string, number>;
  total: number;
}

export function LeadFilters({
  statusFilter,
  onStatusChange,
  search,
  onSearchChange,
  productType,
  onProductTypeChange,
  byStatus,
  total,
}: LeadFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getCount = (s: string) => (s === 'all' ? total : (byStatus[s] ?? 0));

  return (
    <div className="space-y-3">
      {/* ── Status tabs ── */}
      <div className="flex items-center gap-1 bg-card rounded-2xl border border-border p-1.5 shadow-sm overflow-x-auto no-scrollbar">
        {STATUSES.map((s) => {
          const isActive = statusFilter === s;
          const count = getCount(s);

          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={cn(
                'relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              {s !== 'all' && (
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isActive ? 'bg-white/60' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.dot,
                  )}
                />
              )}
              <span className="capitalize">{s === 'all' ? 'All Leads' : s}</span>
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-md font-semibold tabular-nums',
                  isActive ? 'bg-white/15 text-background dark:text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by name, company, phone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 shadow-sm',
            showAdvanced
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-card text-muted-foreground border-border hover:border-border/80',
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {productType && productType !== 'all' && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          )}
          <ChevronDown
            className={cn(
              'w-3 h-3 transition-transform duration-200',
              showAdvanced ? 'rotate-180' : '',
            )}
          />
        </button>
      </div>

      {/* ── Advanced filters panel ── */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Product Type
                  </label>
                  <select
                    value={productType}
                    onChange={(e) => onProductTypeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="all">All Products</option>
                    {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
