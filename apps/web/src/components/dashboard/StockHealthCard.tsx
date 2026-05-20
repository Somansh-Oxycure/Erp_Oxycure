'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface StockHealthSummary {
  totalSkus: number;
  inStock: number;
  belowReorder: number;
}

function transformStockStats(raw: { total: number; ok: number; out: number }): StockHealthSummary {
  return {
    totalSkus: raw.total,
    inStock: raw.ok,
    belowReorder: raw.out,
  };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`} />;
}

function healthColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function StockHealthCard() {
  const { data: rawData, isLoading } = useQuery<{ total: number; ok: number; out: number }>({
    queryKey: ['stock', 'health-summary'],
    queryFn: () =>
      api.get('/stock/stats').then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const data = rawData ? transformStockStats(rawData) : undefined;

  const pct =
    data && data.totalSkus > 0
      ? Math.round((data.inStock / data.totalSkus) * 100)
      : 0;

  const rows = [
    { label: 'Total SKUs', value: data?.totalSkus },
    { label: 'In Stock', value: data?.inStock },
    { label: 'Below Reorder Level', value: data?.belowReorder },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }}
      className="rounded-2xl border bg-white shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Stock Health</h3>
          <p className="text-xs text-slate-500">Inventory overview</p>
        </div>
        <Link
          href="/stock"
          className="text-sky-600 text-xs font-medium hover:underline"
        >
          View stock →
        </Link>
      </div>

      <div className="space-y-3 mb-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{row.label}</span>
            {isLoading ? (
              <Skeleton className="h-4 w-10" />
            ) : (
              <span className="text-sm font-semibold text-slate-900 tabular-nums">
                {row.value ?? '—'}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Stock availability</span>
          <span className="text-xs font-medium text-slate-700">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', healthColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
