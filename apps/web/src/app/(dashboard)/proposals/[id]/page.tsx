'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api';
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/lib/utils';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const PROPOSAL_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  draft:    { label: 'Draft',    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  sent:     { label: 'Sent',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500' },
  expired:  { label: 'Expired',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
};

const VALID_TRANSITIONS: Record<string, { status: string; label: string; icon: React.ElementType; btnClass: string }[]> = {
  draft: [
    { status: 'sent',    label: 'Mark as Sent',   icon: Send,         btnClass: 'bg-blue-600 hover:bg-blue-500 text-white' },
    { status: 'expired', label: 'Mark as Expired', icon: Clock,        btnClass: 'bg-amber-600 hover:bg-amber-500 text-white' },
  ],
  sent: [
    { status: 'accepted', label: 'Mark Accepted', icon: CheckCircle2, btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
    { status: 'rejected', label: 'Mark Rejected', icon: XCircle,      btnClass: 'bg-red-600 hover:bg-red-500 text-white' },
    { status: 'expired',  label: 'Mark Expired',  icon: Clock,        btnClass: 'bg-amber-600 hover:bg-amber-500 text-white' },
  ],
};

export default function ProposalDetailPage() {
  const { id } = useParams() as { id: string };
  const router  = useRouter();
  const qc      = useQueryClient();
  const [statusNotes, setStatusNotes] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalsApi.findOne(id),
    enabled: !!id,
  });

  const proposal = data?.data?.data ?? data?.data;

  const statusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      proposalsApi.updateStatus(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposal', id] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal status updated');
      setPendingStatus(null);
      setStatusNotes('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update status');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">Proposal not found</p>
        <button onClick={() => router.push('/proposals')} className="text-sm text-sky-500 hover:text-sky-400 underline">
          Back to Proposals
        </button>
      </div>
    );
  }

  const statusCfg = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;
  const transitions = VALID_TRANSITIONS[proposal.status] || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Breadcrumb ── */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-background text-sm text-muted-foreground">
        <button
          onClick={() => router.push('/proposals')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Proposals
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{proposal.proposalNumber}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

            {/* ══ LEFT ══ */}
            <div className="space-y-6">

              {/* ── Hero ── */}
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {proposal.proposalNumber}
                      </span>
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', statusCfg.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                        {statusCfg.label}
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground">
                      {proposal.ticket?.projectName || proposal.ticket?.clientName || 'Proposal'}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {proposal.ticket?.clientName} · {proposal.ticket?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-500">{formatCurrency(proposal.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total Amount</p>
                  </div>
                </div>
              </div>

              {/* ── Line Items ── */}
              <div className="p-5 rounded-2xl bg-card border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Line Items</p>
                {proposal.items && proposal.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Product</th>
                          <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Qty</th>
                          <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Unit Price</th>
                          <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Disc %</th>
                          <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Tax %</th>
                          <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {proposal.items.map((item: {
                          id: string;
                          productName: string;
                          description?: string;
                          quantity: number;
                          unitPrice: number;
                          discountPercent: number;
                          taxPercent: number;
                          totalPrice: number;
                        }) => (
                          <tr key={item.id}>
                            <td className="py-3 pr-4">
                              <p className="font-medium text-foreground">{item.productName}</p>
                              {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                            </td>
                            <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                            <td className="py-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 text-right text-muted-foreground">{item.discountPercent}%</td>
                            <td className="py-3 text-right text-muted-foreground">{item.taxPercent}%</td>
                            <td className="py-3 text-right font-semibold text-foreground">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No line items — amount based on ticket estimated value.</p>
                )}

                {/* Totals summary */}
                {proposal.items && proposal.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(proposal.subtotal)}</span>
                    </div>
                    {Number(proposal.discountAmount) > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>Discount</span>
                        <span>−{formatCurrency(proposal.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span>{formatCurrency(proposal.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
                      <span>Total</span>
                      <span className="text-emerald-500">{formatCurrency(proposal.totalAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Notes & Terms ── */}
              {(proposal.notes || proposal.termsAndConditions) && (
                <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                  {proposal.notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-4">{proposal.notes}</p>
                    </div>
                  )}
                  {proposal.termsAndConditions && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Terms &amp; Conditions</p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-4">{proposal.termsAndConditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ══ RIGHT SIDEBAR ══ */}
            <div className="space-y-4">

              {/* ── Linked Ticket ── */}
              {proposal.ticket && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Linked Ticket</p>
                  <button
                    onClick={() => router.push(`/tickets/${proposal.ticket.id}`)}
                    className="w-full text-left p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border transition-colors"
                  >
                    <p className="font-mono text-xs text-sky-500 font-semibold mb-1">{proposal.ticket.ticketNumber}</p>
                    <p className="text-sm font-medium text-foreground">{proposal.ticket.clientName}</p>
                    {proposal.ticket.projectName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{proposal.ticket.projectName}</p>
                    )}
                  </button>
                </div>
              )}

              {/* ── Proposal Info ── */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium text-foreground text-xs">{formatDateTime(proposal.createdAt)}</span>
                  </div>
                  {proposal.validUntil && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid Until</span>
                      <span className={cn(
                        'font-medium text-xs',
                        new Date(proposal.validUntil) < new Date() ? 'text-red-500' : 'text-foreground',
                      )}>
                        {formatDate(proposal.validUntil)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created By</span>
                    <span className="font-medium text-foreground text-xs">
                      {proposal.createdBy?.firstName} {proposal.createdBy?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-medium text-foreground text-xs">{proposal.items?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* ── Status Actions ── */}
              {transitions.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Actions</p>
                  <div className="space-y-2">
                    {transitions.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.status}
                          onClick={() => setPendingStatus(t.status)}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors',
                            t.btnClass,
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Confirm Modal ── */}
      {pendingStatus && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setPendingStatus(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-base font-bold text-foreground mb-1">
              {VALID_TRANSITIONS[proposal.status]?.find((t) => t.status === pendingStatus)?.label}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Change proposal status to <strong>{PROPOSAL_STATUS[pendingStatus]?.label}</strong>?
            </p>
            <textarea
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setPendingStatus(null); setStatusNotes(''); }}
                className="flex-1 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => statusMutation.mutate({ status: pendingStatus, notes: statusNotes || undefined })}
                disabled={statusMutation.isPending}
                className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {statusMutation.isPending ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
