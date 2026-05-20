'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface QuotationSummary {
  totalSent: number;
  totalViewed: number;
  totalConverted: number;
  conversionRate: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`} />;
}

export function QuotationFunnelCard() {
  const { data, isLoading } = useQuery<QuotationSummary>({
    queryKey: ['quotations', 'summary'],
    queryFn: () =>
      api.get('/dashboard/quotation-funnel').then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const steps = [
    { label: 'Sent', value: data?.totalSent, color: 'bg-sky-100 text-sky-700' },
    { label: 'Viewed', value: data?.totalViewed, color: 'bg-amber-100 text-amber-700' },
    { label: 'Converted', value: data?.totalConverted, color: 'bg-emerald-100 text-emerald-700' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-2xl border bg-white shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Quotation Funnel</h3>
          <p className="text-xs text-slate-500">Conversion overview</p>
        </div>
        <Link
          href="/quotations"
          className="text-sky-600 text-xs font-medium hover:underline"
        >
          View quotations →
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-5">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3 flex-1">
            <div className="flex-1 text-center">
              {isLoading ? (
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
              ) : (
                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                  {step.value ?? '—'}
                </p>
              )}
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${step.color}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Conversion Rate</p>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span className="text-xl font-bold text-emerald-600 tabular-nums">
              {data?.conversionRate !== undefined
                ? `${data.conversionRate.toFixed(1)}%`
                : '—'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
