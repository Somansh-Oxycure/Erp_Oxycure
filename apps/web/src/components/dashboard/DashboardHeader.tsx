'use client';

import { format } from 'date-fns';
import { useAuthStore } from '@/stores/auth-store';

export function DashboardHeader() {
  const { user } = useAuthStore();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const today = format(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting},{' '}
          <span className="text-sky-600">{user?.firstName ?? 'there'}</span> 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Here&apos;s what&apos;s happening across your business today.
        </p>
      </div>
      <p className="text-sm text-slate-400 font-medium shrink-0">{today}</p>
    </div>
  );
}
