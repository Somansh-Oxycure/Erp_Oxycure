'use client';

import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Users2, Search } from 'lucide-react';
import { useState } from 'react';

export default function CustomersPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.findAll({ search: search || undefined }),
  });

  const customers = data?.data?.data || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Converted leads and active accounts</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-6 py-4">
                <div className="w-10 h-10 bg-muted/60 rounded-xl animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted/60 rounded w-40 animate-pulse" />
                  <div className="h-3 bg-muted/40 rounded w-24 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center">
            <Users2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No customers yet</p>
            <p className="text-slate-400 text-sm">Convert leads to see customers here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/40 border-b border-border/60">
              <tr>
                {['Customer', 'Type', 'Phone', 'Email', 'Since', 'Orders'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {customers.map((c: { id: string; customerNumber: string; companyName?: string; contactPerson: string; customerType: string; phone: string; email?: string; createdAt: string; _count?: { orders: number } }) => (
                <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-foreground">{c.companyName || c.contactPerson}</p>
                    <p className="text-xs text-slate-400">{c.customerNumber}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-medium capitalize text-foreground/70">{c.customerType}</td>
                  <td className="px-5 py-4 text-sm text-foreground/70">{c.phone}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{c.email || '�'}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-foreground/80">{c._count?.orders ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
