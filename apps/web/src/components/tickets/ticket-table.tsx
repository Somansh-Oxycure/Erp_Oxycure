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
  Phone,
  Timer,
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
import { useRouter } from 'next/navigation';

export interface Ticket {
  id: string;
  ticketNumber: string;
  clientName: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  priority: string;
  productType: string;
  estimatedValue: number | string | null;
  nextFollowUpDate: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  source: string;
  region: string | null;
  projectName: string | null;
  createdAt: string;
  statusHistory?: { enteredAt: string }[];
}

interface TicketTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
  onTicketClick: (t: Ticket) => void;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
  selectedTicketId?: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
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
  const dotColor =
    priority === 'urgent' ? 'bg-red-500'
    : priority === 'high' ? 'bg-amber-500'
    : priority === 'medium' ? 'bg-blue-500'
    : 'bg-slate-400';
  return (
    <span className={cn('text-xs font-semibold flex items-center gap-1', cfg.color)}>
      <span className={cn('inline-block w-2 h-2 rounded-full ring-2', cfg.ring, dotColor)} />
      {cfg.label}
    </span>
  );
}

function AssigneeAvatar({ user }: { user: Ticket['assignedTo'] }) {
  if (!user) return <span className="text-muted-foreground text-xs">Unassigned</span>;
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
  if (!date) return <span className="text-muted-foreground text-xs">—</span>;
  const overdue = isOverdue(date);
  return (
    <span className={cn('text-xs font-medium', overdue ? 'text-red-600' : 'text-muted-foreground')}>
      {formatFollowUpDate(date)}
      {overdue && <span className="ml-1 text-red-400">↑</span>}
    </span>
  );
}

function formatAgeDuration(ms: number): string {
  const mins  = ms / (1000 * 60);
  const hours = ms / (1000 * 60 * 60);
  const days  = ms / (1000 * 60 * 60 * 24);
  if (days  >= 1) return `${Math.floor(days)}d`;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  return `${Math.floor(mins)}m`;
}

function AgingCell({ ticket }: { ticket: Ticket }) {
  const now   = Date.now();
  const totalMs = now - new Date(ticket.createdAt).getTime();
  const currentStatusEnteredAt = ticket.statusHistory?.[0]?.enteredAt;
  const statusMs = currentStatusEnteredAt
    ? now - new Date(currentStatusEnteredAt).getTime()
    : totalMs;

  const statusDays = statusMs / (1000 * 60 * 60 * 24);

  const { bg, text, ring } =
    statusDays > 7
      ? { bg: 'bg-red-500/10',    text: 'text-red-600',    ring: 'ring-red-500/20'    }
      : statusDays > 3
      ? { bg: 'bg-amber-500/10',  text: 'text-amber-600',  ring: 'ring-amber-500/20'  }
      : { bg: 'bg-emerald-500/10',text: 'text-emerald-600',ring: 'ring-emerald-500/20'};

  return (
    <div className="flex flex-col items-start gap-1">
      {/* Status age pill */}
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ring-1',
        bg, text, ring,
      )}>
        <Timer className="w-3 h-3 shrink-0" />
        {formatAgeDuration(statusMs)}
      </span>
      {/* Total age */}
      <span className="text-[10px] text-muted-foreground leading-none pl-0.5">
        {formatAgeDuration(totalMs)} total
      </span>
    </div>
  );
}

export function TicketTable({
  tickets,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onTicketClick,
  sortBy,
  sortOrder,
  onSort,
  selectedTicketId,
}: TicketTableProps) {
  const router      = useRouter();
  const totalPages  = Math.ceil(total / limit);

  const columns: ColumnDef<Ticket>[] = [
    {
      id: 'ticket',
      header: 'Ticket',
      cell: ({ row }) => {
        const t = row.original;
        const initials = getInitials(t.clientName?.split(' ')[0], t.clientName?.split(' ')[1]);
        const color    = getAvatarColor(t.clientName);
        return (
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className={cn('w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center shrink-0', color)}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{t.projectName || t.clientName}</p>
              <p className="text-xs text-muted-foreground truncate">{t.clientName}</p>
              <p className="text-xs text-muted-foreground">{t.ticketNumber}</p>
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
      accessorKey: 'productType',
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
        const { phone, name } = row.original;
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">{name}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 text-muted-foreground/70" />
              {phone}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'estimatedValue',
      header: 'Value',
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-emerald-600">
          {formatCurrency(getValue<number>())}
        </span>
      ),
    },
    {
      id: 'followUp',
      header: 'Follow-up',
      cell: ({ row }) => <FollowUpCell date={row.original.nextFollowUpDate} />,
    },
    {
      id: 'aging',
      header: 'Age',
      cell: ({ row }) => <AgingCell ticket={row.original} />,
    },
    {
      id: 'assignedTo',
      header: 'Assigned',
      cell: ({ row }) => <AssigneeAvatar user={row.original.assignedTo} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/tickets/${row.original.id}`);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-600 hover:bg-sky-500/10 transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: tickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
  });

  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors group"
    >
      {label}
      <ArrowUpDown className={cn('w-3 h-3 transition-colors', sortBy === field ? 'text-sky-500' : 'group-hover:text-muted-foreground')} />
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" />
              <p className="text-xs text-muted-foreground">Loading tickets…</p>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-muted-foreground text-sm font-medium">No tickets found</p>
            <p className="text-muted-foreground/60 text-xs">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 sticky top-0 z-10">
              <tr>
                {table.getFlatHeaders().map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left first:pl-5 last:pr-5"
                  >
                    {header.column.id === 'status' ? (
                      <SortableHeader field="status" label="Status" />
                    ) : header.column.id === 'estimatedValue' ? (
                      <SortableHeader field="estimatedValue" label="Value" />
                    ) : header.column.id === 'createdAt' ? (
                      <SortableHeader field="createdAt" label="Date" />
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => {
                const isSelected = row.original.id === selectedTicketId;
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => onTicketClick(row.original)}
                    className={cn(
                      'border-b border-border cursor-pointer transition-colors last:border-0',
                      isSelected
                        ? 'bg-sky-500/10 hover:bg-sky-500/15'
                        : 'hover:bg-accent',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 first:pl-5 last:pr-5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20 shrink-0">
          <p className="text-xs text-muted-foreground">
            {total} ticket{total !== 1 ? 's' : ''} · Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
              const p = page <= 3 ? idx + 1 : page - 2 + idx;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-semibold transition-colors',
                    p === page ? 'bg-sky-500/15 text-sky-500' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
