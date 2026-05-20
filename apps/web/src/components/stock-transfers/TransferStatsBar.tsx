'use client';

import { StockTransferStats } from '@/types/api';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle2, FileText, XCircle } from 'lucide-react';

interface Props {
  stats: StockTransferStats;
}

export default function TransferStatsBar({ stats }: Props) {
  const cards = [
    { label: 'Total Transfers', value: stats.total, icon: FileText, color: 'text-muted-foreground' },
    { label: 'Drafts', value: stats.drafts, icon: FileText, color: 'text-amber-500' },
    { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-red-500' },
    { label: 'Total Outward', value: stats.totalOut, icon: ArrowUpCircle, color: 'text-orange-500' },
    { label: 'Total Inward', value: stats.totalIn, icon: ArrowDownCircle, color: 'text-sky-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <c.icon className={`w-7 h-7 shrink-0 ${c.color}`} />
          <div>
            <p className="text-xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground leading-tight">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
