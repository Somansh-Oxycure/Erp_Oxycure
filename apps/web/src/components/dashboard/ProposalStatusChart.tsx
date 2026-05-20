'use client';

import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface ProposalSummary {
  statuses: { status: string; count: number; value: number }[];
  totalValue: number;
}

function transformStats(raw: { byStatus: Record<string, number>; pipelineValue: number }): ProposalSummary {
  const statuses = Object.entries(raw.byStatus).map(([status, count]) => ({
    status,
    count,
    value: 0,
  }));
  return { statuses, totalValue: Number(raw.pipelineValue ?? 0) };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`} />;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  sent: '#38bdf8',
  accepted: '#10b981',
  rejected: '#f43f5e',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export function ProposalStatusChart() {
  const { data: rawData, isLoading } = useQuery<{ byStatus: Record<string, number>; pipelineValue: number }>({
    queryKey: ['proposals', 'summary'],
    queryFn: () =>
      api.get('/proposals/stats').then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const data = rawData ? transformStats(rawData) : undefined;

  const chartData = (data?.statuses ?? []).map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    totalValue: s.value,
    color: STATUS_COLORS[s.status] ?? '#cbd5e1',
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="rounded-2xl border bg-white shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Proposals by Status</h3>
          {data?.totalValue !== undefined && (
            <p className="text-xs text-slate-500">
              Total: {formatCurrency(data.totalValue)}
            </p>
          )}
        </div>
        <Link
          href="/proposals"
          className="text-sky-600 text-xs font-medium hover:underline"
        >
          View proposals →
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center">
          <Skeleton className="h-44 w-44 rounded-full" />
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">No proposals yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props) => [
                `${value} proposal${value === 1 ? '' : 's'} · ${formatCurrency(props.payload?.totalValue)}`,
                name,
              ]}
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
