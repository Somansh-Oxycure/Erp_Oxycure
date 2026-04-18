'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Phone,
  Mail,
  UserCheck,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import {
  cn,
  formatCurrency,
  formatFollowUpDate,
  getInitials,
  getAvatarColor,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  PRODUCT_TYPE_LABELS,
  isOverdue,
} from '@/lib/utils';

export interface Lead {
  id: string;
  leadNumber: string;
  firstName: string;
  lastName: string | null;
  contactName?: string;
  companyName: string | null;
  email: string | null;
  phone: string;
  status: string;
  priority: string;
  productInterest: string;
  productType: string | null;
  estimatedValue: number | string | null;
  nextFollowUpDate: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  source: string;
  createdAt: string;
}

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  total: number;
  page: number;
  onPageChange: (p: number) => void;
  onLeadClick: (lead: Lead) => void;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
  limit: number;
  /** Compact row height for Split view (36px instead of 48px) */
  compact?: boolean;
  /** Highlight row whose lead.id matches this value (cross-view sync) */
  selectedLeadId?: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    label: status,
    color: 'bg-slate-100 text-slate-600 border border-slate-200',
    dot: 'bg-slate-400',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
  if (!cfg) return null;
  return (
    <span className={cn('text-xs font-semibold flex items-center gap-1', cfg.color)}>
      <span className={cn('inline-block w-2 h-2 rounded-full ring-2', cfg.ring, priority === 'urgent' ? 'bg-red-500' : priority === 'high' ? 'bg-amber-500' : priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400')} />
      {cfg.label}
    </span>
  );
}

function AssigneeAvatar({ user }: { user: Lead['assignedTo'] }) {
  if (!user) return <span className="text-slate-400 text-xs">Unassigned</span>;
  const initials = getInitials(user.firstName, user.lastName);
  const color = getAvatarColor(user.firstName);
  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0', color)}>
        {initials}
      </div>
      <span className="text-sm text-foreground truncate max-w-[80px]">{user.firstName}</span>
    </div>
  );
}

function FollowUpCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-slate-400 text-xs">—</span>;
  const overdue = isOverdue(date);
  return (
    <span className={cn('text-xs font-medium', overdue ? 'text-red-600' : 'text-slate-600')}>
      {formatFollowUpDate(date)}
      {overdue && <span className="ml-1 text-red-400">↑</span>}
    </span>
  );
}

export function LeadTable({
  leads,
  isLoading,
  total,
  page,
  onPageChange,
  onLeadClick,
  sortBy,
  sortOrder,
  onSort,
  limit,
  compact = false,
  selectedLeadId,
}: LeadTableProps) {
  const totalPages = Math.ceil(total / limit);

  const columns: ColumnDef<Lead>[] = [
    {
      id: 'contact',
      header: 'Lead',
      cell: ({ row }) => {
        const lead = row.original;
        const fullName = lead.contactName ?? `${lead.firstName} ${lead.lastName ?? ''}`.trim();
        const initials = getInitials(lead.firstName, lead.lastName ?? undefined);
        const color = getAvatarColor(fullName);
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className={cn('w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center shrink-0', color)}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
              {lead.companyName && (
                <p className="text-xs text-slate-400 truncate">{lead.companyName}</p>
              )}
              <p className="text-xs text-slate-400">{lead.leadNumber}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => <PriorityDot priority={getValue<string>()} />,
    },
    {
      accessorKey: 'productInterest',
      header: 'Product',
      cell: ({ getValue }) => (
      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg">
          {PRODUCT_TYPE_LABELS[getValue<string>()] || getValue<string>()}
        </span>
      ),
    },
    {
      id: 'contact_info',
      header: 'Contact',
      cell: ({ row }) => {
        const { phone, email } = row.original;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 text-slate-400" />
              {phone}
            </div>
            {email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-[140px]">
                <Mail className="w-3 h-3" />
                {email}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'assignedTo',
      header: 'Assigned',
      cell: ({ row }) => <AssigneeAvatar user={row.original.assignedTo} />,
    },
    {
      accessorKey: 'estimatedValue',
      header: () => (
        <button
          className="flex items-center gap-1 text-left hover:text-slate-900 transition-colors"
          onClick={() => onSort('estimatedValue')}
        >
          Est. Value
          <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: ({ getValue }) => (
      <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(getValue<number>())}
        </span>
      ),
    },
    {
      accessorKey: 'nextFollowUpDate',
      header: 'Follow-up',
      cell: ({ getValue }) => <FollowUpCell date={getValue<string | null>()} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLeadClick(row.original);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-all opacity-0 group-hover:opacity-100"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 bg-muted rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-muted rounded-full w-32 animate-pulse" />
                <div className="h-2.5 bg-muted/70 rounded-full w-20 animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
              <div className="h-6 w-12 bg-muted/70 rounded-lg animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-muted/70 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-foreground font-semibold mb-1">No leads found</p>
        <p className="text-muted-foreground text-sm">Try adjusting your filters or add a new lead</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {table.getFlatHeaders().map((header) => (
                <th
                  key={header.id}
                  className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 first:pl-6 last:pr-6 whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                onClick={() => onLeadClick(row.original)}
                className={cn(
                  'group transition-colors duration-150 cursor-pointer',
                  selectedLeadId === row.original.id
                    ? 'bg-sky-50 dark:bg-sky-900/20'
                    : 'hover:bg-sky-50/50',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'px-5 first:pl-6 last:pr-4 text-sm text-muted-foreground whitespace-nowrap',
                      compact ? 'py-2' : 'py-4',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
          </span>{' '}
          of <span className="font-semibold text-foreground">{total}</span> leads
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-border"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-semibold transition-all',
                    page === p
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:border-border border border-transparent',
                  )}
                >
                  {p}
                </button>
              ),
            )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-border"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
