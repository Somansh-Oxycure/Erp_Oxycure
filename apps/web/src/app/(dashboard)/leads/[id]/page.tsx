'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Search, Clock, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import Link from 'next/link';
import { designSpecsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatCurrency } from '@/lib/utils';

const STATUS_TABS = [
  { key: '', label: 'All', color: 'text-gray-400' },
  { key: 'requested', label: 'Requested', color: 'text-amber-400' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-400' },
  { key: 'completed', label: 'Completed', color: 'text-purple-400' },
  { key: 'approved', label: 'Approved', color: 'text-emerald-400' },
  { key: 'revision_needed', label: 'Revision', color: 'text-red-400' },
];

const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
  completed: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
  revision_needed: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
};

export default function DesignSpecsPage() {
  const { user } = useAuthStore();
  const [activeStatus, setActiveStatus] = useState('');
  const [search, setSearch] = useState('');

  const params: Record<string, unknown> = {};
  if (activeStatus) params.status = activeStatus;
  if (search) params.search = search;

  const { data, isLoading } = useQuery({
    queryKey: ['design-specs', params],
    queryFn: () => designSpecsApi.findAll(params).then((r) => r.data),
  });

  const specs = data?.data?.data ?? [];

  const isDesignEngineer = user?.role === 'design_engineer';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
            <ClipboardList className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Design Specifications</h1>
            <p className="text-sm text-gray-400">
              {isDesignEngineer ? 'Your assigned specs' : 'All design requests'}
            </p>
          </div>
        </div>
        {isManager && (
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Design Spec
          </button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl ring-1 ring-white/10 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeStatus === tab.key
                ? 'bg-white/10 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by spec number or lead..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50"
        />
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : specs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <ClipboardList className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">No design specs found</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {specs.map((spec: any, idx: number) => (
              <motion.div
                key={spec.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Link
                  href={`/design-specs/${spec.id}`}
                  className="group block p-5 rounded-2xl bg-white/5 hover:bg-white/8 ring-1 ring-white/10 hover:ring-sky-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono text-sky-400">{spec.specNumber}</span>
                      <p className="mt-1 text-sm font-medium text-white line-clamp-1">
                        {spec.title || spec.requirements?.substring(0, 60)}
                      </p>
                    </div>
                    <span
                      className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[spec.status]}`}
                    >
                      {spec.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-400">
                    {spec.lead && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">Lead:</span>
                        <span className="text-gray-300">
                          {spec.lead.firstName} {spec.lead.lastName}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="font-mono">{spec.lead.leadNumber}</span>
                      </div>
                    )}
                    {spec.designedBy && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">Engineer:</span>
                        <span className="text-gray-300">
                          {spec.designedBy.firstName} {spec.designedBy.lastName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(spec.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    {spec.quotation ? (
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        Quotation created
                      </div>
                    ) : (
                      <div />
                    )}
                    <div className="flex items-center gap-1 text-xs text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-3 h-3" />
                      View
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
