'use client';

import { motion } from 'framer-motion';
import { LucideIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TrendBadge {
  value: number;
  direction: 'up' | 'down';
}

interface KpiCardProps {
  index: number;
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  href: string;
  trend?: TrendBadge;
  isLoading?: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-slate-100', className)} />
  );
}

export function KpiCard({
  index,
  label,
  value,
  icon: Icon,
  iconColor,
  href,
  trend,
  isLoading,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={href}>
        <div className="rounded-2xl border bg-white shadow-sm p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 group cursor-pointer h-full">
          <div className="flex items-start justify-between mb-3">
            <div className={cn('rounded-xl p-2', iconColor)}>
              <Icon className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
          </div>

          {isLoading ? (
            <>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-28 mb-1" />
              <Skeleton className="h-3 w-16" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center text-xs font-medium mt-1.5 px-1.5 py-0.5 rounded-full',
                    trend.direction === 'up'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600',
                  )}
                >
                  {trend.direction === 'up' ? '+' : '-'}{Math.abs(trend.value)}% vs last week
                </span>
              )}
            </>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
