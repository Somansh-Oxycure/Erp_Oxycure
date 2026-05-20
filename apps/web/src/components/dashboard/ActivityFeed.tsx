'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Ticket,
  PackageCheck,
  ShoppingCart,
  FileText,
  Users,
  Activity,
} from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { api } from '@/lib/api';

interface ActivityItem {
  id: string;
  module: string;
  description: string;
  createdAt: string;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`} />;
}

const MODULE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; badge: string; border: string }
> = {
  ticket: {
    icon: Ticket,
    color: 'text-sky-600 bg-sky-50',
    badge: 'bg-sky-100 text-sky-700',
    border: 'border-l-sky-400',
  },
  order: {
    icon: PackageCheck,
    color: 'text-emerald-600 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    border: 'border-l-emerald-400',
  },
  purchase_order: {
    icon: ShoppingCart,
    color: 'text-slate-600 bg-slate-100',
    badge: 'bg-slate-100 text-slate-600',
    border: 'border-l-slate-400',
  },
  proposal: {
    icon: FileText,
    color: 'text-amber-600 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-l-amber-400',
  },
  customer: {
    icon: Users,
    color: 'text-blue-600 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-l-blue-400',
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  color: 'text-slate-600 bg-slate-100',
  badge: 'bg-slate-100 text-slate-600',
  border: 'border-l-slate-300',
};

export function ActivityFeed() {
  const { data, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity', 'recent'],
    queryFn: () =>
      api.get('/dashboard/activity', { params: { limit: 10 } }).then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="rounded-2xl border bg-white shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Recent Activity</h3>
          <p className="text-xs text-slate-500">Cross-module events</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No recent activity</p>
      ) : (
        <ul className="space-y-0 divide-y divide-slate-50">
          {data.map((item) => {
            const cfg = MODULE_CONFIG[item.module] ?? DEFAULT_CONFIG;
            const Icon = cfg.icon;
            return (
              <li
                key={item.id}
                className={`flex items-start gap-3 py-3 border-l-2 pl-3 ${cfg.border}`}
              >
                <div className={`rounded-lg p-1.5 shrink-0 ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${cfg.badge}`}
                    >
                      {item.module.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatRelative(item.createdAt)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}
