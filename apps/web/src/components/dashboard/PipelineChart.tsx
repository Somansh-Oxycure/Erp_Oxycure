'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`} />;
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  site_inspection: 'Site Inspection',
  design_review: 'Design Review',
  quoted: 'Quoted',
  negotiation: 'Negotiation',
  won: 'Won',
};

export function PipelineChart() {
  const { data, isLoading } = useQuery<PipelineStage[]>({
    queryKey: ['tickets', 'pipeline-summary'],
    queryFn: () =>
      api.get('/dashboard/pipeline').then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-2xl border bg-white shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Sales Pipeline</h3>
          <p className="text-xs text-slate-500">Tickets by stage</p>
        </div>
        <Link
          href="/tickets"
          className="text-sky-600 text-xs font-medium hover:underline"
        >
          View pipeline →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={(data ?? []).map((d) => ({
              ...d,
              name: STAGE_LABELS[d.stage] ?? d.stage,
            }))}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrency(v)}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip
              formatter={(value: number, _name: string, props) => [
                `${formatCurrency(value)} · ${props.payload?.count ?? 0} ticket${props.payload?.count === 1 ? '' : 's'}`,
                'Value',
              ]}
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {(data ?? []).map((_, i) => (
                <Cell key={i} fill="#38bdf8" fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
