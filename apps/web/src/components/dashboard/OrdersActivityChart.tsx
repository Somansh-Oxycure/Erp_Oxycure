'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { api } from '@/lib/api';

interface OrderActivity {
  date: string;
  placed: number;
  fulfilled: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className ?? ''}`} />;
}

export function OrdersActivityChart() {
  const { data, isLoading } = useQuery<OrderActivity[]>({
    queryKey: ['orders', 'activity'],
    queryFn: () =>
      api.get('/dashboard/orders-activity', { params: { days: 30 } }).then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
  });

  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'dd MMM'),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-2xl border bg-white shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Orders Activity</h3>
          <p className="text-xs text-slate-500">Last 30 days</p>
        </div>
        <Link
          href="/orders"
          className="text-sky-600 text-xs font-medium hover:underline"
        >
          View orders →
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="h-52 w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
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
            <Line
              type="monotone"
              dataKey="placed"
              name="Orders Placed"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="fulfilled"
              name="Orders Fulfilled"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
