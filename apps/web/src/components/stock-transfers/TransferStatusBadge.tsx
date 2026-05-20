'use client';

import { TransferStatus } from '@/types/api';

const BADGES: Record<TransferStatus, { label: string; className: string; headerClassName: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    headerClassName: 'bg-amber-400 text-white shadow-sm',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    headerClassName: 'bg-emerald-500 text-white shadow-sm',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',
    headerClassName: 'bg-slate-700 text-white shadow-sm',
  },
};

export default function TransferStatusBadge({
  status,
  variant = 'default',
}: {
  status: TransferStatus;
  variant?: 'default' | 'header';
}) {
  const badge = BADGES[status] ?? BADGES.DRAFT;
  const cls = variant === 'header' ? badge.headerClassName : badge.className;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>
      {badge.label}
    </span>
  );
}
