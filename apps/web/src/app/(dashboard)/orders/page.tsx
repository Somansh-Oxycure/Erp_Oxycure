'use client';

import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, STATUS_CONFIG } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'In Production', color: 'bg-violet-100 text-violet-700' },
  ready: { label: 'Ready', color: 'bg-cyan-100 text-cyan-700' },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.findAll({}),
  });

  const orders = data?.data?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track all active and completed orders</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No orders yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Order #', 'Customer', 'Status', 'Total', 'Date'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o: { id: string; orderNumber: string; customer?: { companyName?: string; contactPerson: string }; status: string; totalAmount?: number; createdAt: string }) => {
                const sc = ORDER_STATUS_CONFIG[o.status];
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{o.orderNumber}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {o.customer?.companyName || o.customer?.contactPerson || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {sc && (
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', sc.color)}>
                          {sc.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(o.totalAmount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(o.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
