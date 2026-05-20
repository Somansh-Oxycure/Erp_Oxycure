'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface AlertLog {
  id: string;
  product?: { id: string; productCode: string; name: string };
  rule?: { ruleName: string };
  alertMessage?: string;
}

interface StockAlert {
  id: string;
  productName: string;
  alertMessage: string;
}

function toStockAlert(log: AlertLog): StockAlert {
  return {
    id: log.id,
    productName: log.product?.name ?? 'Unknown product',
    alertMessage: log.alertMessage ?? '',
  };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`} />;
}

export function StockAlertsCard() {
  const { data: rawData, isLoading } = useQuery<AlertLog[]>({
    queryKey: ['stock', 'alerts'],
    queryFn: () =>
      api.get('/alerts/open').then((r) => {
        const arr: AlertLog[] = r.data?.data ?? r.data ?? [];
        return arr.slice(0, 5);
      }),
    staleTime: 60_000,
  });

  const data: StockAlert[] = (rawData ?? []).map(toStockAlert);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="rounded-2xl border bg-white shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Stock Alerts</h3>
          <p className="text-xs text-slate-500">Critical low-stock items</p>
        </div>
        <Link
          href="/stock/alerts"
          className="text-sky-600 text-xs font-medium hover:underline"
        >
          View all alerts →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No stock alerts 🎉</p>
      ) : (
        <ul className="space-y-2">
          {data.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 border border-amber-100"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {alert.productName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {alert.alertMessage}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
