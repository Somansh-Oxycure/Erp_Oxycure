'use client';

import { useQuery } from '@tanstack/react-query';
import { quotationsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const QT_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', color: 'bg-amber-100 text-amber-700' },
};

export default function QuotationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationsApi.findAll({}),
  });

  const quotations = data?.data?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage proposals and pricing</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No quotations yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Quotation #', 'Customer', 'Status', 'Total', 'Valid Till', 'Created'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {quotations.map((q: { id: string; quotationNumber: string; customer?: { companyName?: string; contactPerson: string }; status: string; totalAmount?: number; validUntil?: string; createdAt: string }) => {
                const sc = QT_STATUS[q.status];
                return (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{q.quotationNumber}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {q.customer?.companyName || q.customer?.contactPerson || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {sc && (
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', sc.color)}>
                          {sc.label}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(q.totalAmount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(q.validUntil)}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{formatDate(q.createdAt)}</td>
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
