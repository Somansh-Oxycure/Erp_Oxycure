'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
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
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  StickyNote,
  FileText,
  Download,
  FileDown,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRole } from '@/hooks/useRole';
import { useProposalBoQ } from '@/hooks/boq/useProposalBoQ';
import { useFinalizeBoQ } from '@/hooks/boq/useFinalizeBoQ';
import { BoQBuilderPanel } from '@/components/boq/BoQBuilderPanel';
import { BoQViewPanel } from '@/components/boq/BoQViewPanel';
import { ProposalAgingTimeline } from '@/components/proposals/proposal-aging-timeline';

/** Format a number as Indian Rupee with full locale format */
function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '\u2014';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '\u2014';
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
}

const VALID_TRANSITIONS: Record<string, { status: string; label: string; icon: React.ElementType; btnClass: string }[]> = {
  // draft can only move to sent (backend enforces this)
  draft: [
    { status: 'sent', label: 'Mark as Sent', icon: Send, btnClass: 'bg-blue-600 hover:bg-blue-500 text-white' },
  ],
  sent: [
    { status: 'accepted', label: 'Mark Accepted', icon: CheckCircle2, btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
    { status: 'rejected', label: 'Mark Rejected', icon: XCircle,      btnClass: 'bg-red-600 hover:bg-red-500 text-white' },
    { status: 'expired',  label: 'Mark Expired',  icon: Clock,        btnClass: 'bg-amber-600 hover:bg-amber-500 text-white' },
  ],
};

/** Statuses that require a ConfirmDialog before applying */
const TERMINAL_STATUSES = new Set(['accepted', 'rejected']);

// ─── BoQ Section ──────────────────────────────────────────────────────────────

function BoQSection({
  proposalId,
  proposalStatus,
  boq,
  boqLoading,
  boqMode,
  setBoqMode,
  role,
  qc,
}: {
  proposalId: string;
  proposalStatus: string;
  boq: import('@/types/api').BoQ | null;
  boqLoading: boolean;
  boqMode: 'builder' | 'view' | null;
  setBoqMode: (m: 'builder' | 'view' | null) => void;
  role: string | null;
  qc: QueryClient;
}) {
  const canGenerateBoQ = role !== 'installer';
  const proposalEditable = !['rejected', 'expired'].includes(proposalStatus);
  const canFinalize = role === 'admin' || role === 'manager';

  const finalizeMutation = useFinalizeBoQ(boq?.id ?? '', proposalId);

  if (boqLoading) {
    return (
      <div className="mt-6 p-5 rounded-2xl bg-card border border-border">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="mt-3 h-3 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* ── BoQ summary card ── */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Bill of Quantities
            </p>
            {!boq ? (
              <p className="text-sm text-muted-foreground italic">No BoQ generated yet.</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {boq.boqNumber}
                </span>
                <StatusBadge status={boq.status} />
                <span className="text-sm text-emerald-500 font-bold">
                  {Number(boq.totalAmount).toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!boq && canGenerateBoQ && proposalEditable && (
              <button
                onClick={() => setBoqMode('builder')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                Generate BoQ
              </button>
            )}
            {boq && boq.status === 'draft' && canGenerateBoQ && (
              <>
                <button
                  onClick={() => setBoqMode('builder')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/10 hover:bg-sky-600/20 text-sky-600 text-xs font-semibold transition-colors border border-sky-600/30"
                >
                  Edit BoQ
                </button>
                {canFinalize && (
                  <button
                    onClick={() => finalizeMutation.mutate()}
                    disabled={finalizeMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                  >
                    Finalize
                  </button>
                )}
              </>
            )}
            {boq && (boq.status === 'draft' || boq.status === 'final') && (
              <button
                onClick={() => setBoqMode('view')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-foreground text-xs font-semibold transition-colors border border-border"
              >
                View BoQ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Slide-down panels ── */}
      {boqMode === 'builder' && (
        <BoQBuilderPanel
          proposalId={proposalId}
          existingBoQ={boq}
          onClose={() => setBoqMode(null)}
          onSaved={() => {
            setBoqMode(null);
            qc.invalidateQueries({ queryKey: ['boqs', { proposalId }] });
          }}
        />
      )}
      {boqMode === 'view' && boq && (
        <BoQViewPanel boq={boq} onBack={() => setBoqMode(null)} />
      )}
    </div>
  );
}

export default function ProposalDetailPage() {
  const { id } = useParams() as { id: string };
  const router  = useRouter();
  const qc      = useQueryClient();
  const role    = useRole();
  const [statusNotes, setStatusNotes]   = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpOutcome, setFollowUpOutcome] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [boqMode, setBoqMode] = useState<'builder' | 'view' | null>(null);

  const { data: boq, isLoading: boqLoading } = useProposalBoQ(id);

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
      toast.success(`Proposal status updated`);
      setPendingStatus(null);
      setConfirmOpen(false);
      setStatusNotes('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update status');
    },
  });

  const addFollowUpMutation = useMutation({
    mutationFn: (scheduledAt: string) => proposalsApi.createFollowUp(id, { scheduledAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposal', id] });
      qc.invalidateQueries({ queryKey: ['proposal-stats'] });
      setFollowUpDate('');
      toast.success('Follow-up scheduled');
    },
    onError: () => toast.error('Failed to schedule follow-up'),
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => proposalsApi.addNote(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposal', id] });
      setNoteInput('');
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: ({ fid, data }: { fid: string; data: { status?: string; outcome?: string } }) =>
      proposalsApi.updateFollowUp(id, fid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposal', id] });
      qc.invalidateQueries({ queryKey: ['proposal-stats'] });
      toast.success('Follow-up updated');
    },
    onError: () => toast.error('Failed to update follow-up'),
  });

  const reviseMutation = useMutation({
    mutationFn: () => proposalsApi.revise(id),
    onSuccess: (res) => {
      const newId: string = res?.data?.id ?? res?.data?.data?.id;
      toast.success('Revision created — opening new draft');
      qc.invalidateQueries({ queryKey: ['proposals'] });
      if (newId) router.push(`/proposals/${newId}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create revision');
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

  const transitions = VALID_TRANSITIONS[proposal.status] || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Breadcrumb ── */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-6 py-3 border-b border-border bg-background text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/proposals')}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Proposals
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{proposal.ticket?.referenceId || proposal.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <button
          onClick={() => router.push(`/proposals/${id}/generate`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
        >
          <FileDown className="w-3.5 h-3.5" />
          Generate Proposal
        </button>
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
                        {proposal.ticket?.referenceId || proposal.id.slice(0, 8).toUpperCase()}
                      </span>
                      <StatusBadge status={proposal.status} />
                      {proposal.revisionNumber > 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">
                          <GitBranch className="w-3 h-3" />
                          Rev {proposal.revisionNumber}
                        </span>
                      )}
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

              {/* ── Proposal Aging ── */}
              <ProposalAgingTimeline proposalId={id} />

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
                  <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm font-mono">
                    <div className="flex justify-between text-muted-foreground">
                      <span className="font-sans">Subtotal</span>
                      <span>{formatINR(proposal.subtotal)}</span>
                    </div>
                    {Number(proposal.discountAmount) > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span className="font-sans">Discount</span>
                        <span>− {formatINR(proposal.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span className="font-sans">Tax</span>
                      <span>+ {formatINR(proposal.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground text-base pt-2 border-t border-border">
                      <span className="font-sans">Total</span>
                      <span className="text-emerald-500">{formatINR(proposal.totalAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Document ── */}
              {proposal.documentUrl && (
                <div className="p-5 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-sky-500" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proposal Document</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
                    <FileText className="w-5 h-5 text-sky-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {proposal.documentOriginalName || 'Proposal Document'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const ext = proposal.documentOriginalName?.split('.').pop() ?? 'pdf';
                        const refId = proposal.ticket?.referenceId ?? id;
                        const res = await proposalsApi.viewDocument(id);
                        const blob = new Blob([res.data], { type: res.data.type });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${refId}.${ext}`;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 text-xs font-medium transition-colors shrink-0"
                      title="View document"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ext = proposal.documentOriginalName?.split('.').pop() ?? 'pdf';
                        const refId = proposal.ticket?.referenceId ?? id;
                        const res = await proposalsApi.downloadDocument(id);
                        const url = URL.createObjectURL(res.data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${refId}.${ext}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-medium transition-colors shrink-0"
                      title="Download document"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              )}

              {/* ── Notes ── */}
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                </div>

                {(!proposal.notes || proposal.notes.length === 0) && (
                  <p className="text-sm text-muted-foreground italic mb-4">No notes yet.</p>
                )}

                {proposal.notes && proposal.notes.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {proposal.notes.map((note: { id: string; content: string; createdAt: string; createdBy?: { firstName: string; lastName: string } }) => (
                      <div key={note.id} className="p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(note.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          {note.createdBy && (
                            <span className="text-[11px] text-muted-foreground">
                              &middot; {note.createdBy.firstName} {note.createdBy.lastName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add note input */}
                <div className="flex gap-2">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (noteInput.trim()) addNoteMutation.mutate(noteInput.trim());
                      }
                    }}
                    placeholder="Add a note... (Enter to save)"
                    rows={2}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <button
                    onClick={() => { if (noteInput.trim()) addNoteMutation.mutate(noteInput.trim()); }}
                    disabled={!noteInput.trim() || addNoteMutation.isPending}
                    className="px-3 self-start bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-lg disabled:opacity-40 transition-colors py-2"
                  >
                    {addNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
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
                    <p className="font-mono text-xs text-sky-500 font-semibold mb-1">{proposal.ticket.referenceId}</p>
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
                  {proposal.revisionNumber > 1 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revision</span>
                      <span className="font-semibold text-violet-600 text-xs">#{proposal.revisionNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Revision History ── */}
              {proposal.revisionChain && proposal.revisionChain.length > 1 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <GitBranch className="w-3.5 h-3.5 text-violet-500" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Revision History ({proposal.revisionChain.length})
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {proposal.revisionChain.map((rev, idx) => {
                      const isCurrent = rev.id === id;
                      const isOriginal = !rev.parentProposalId;
                      return (
                        <button
                          key={rev.id}
                          onClick={() => { if (!isCurrent) router.push(`/proposals/${rev.id}`); }}
                          className={cn(
                            'w-full text-left p-2.5 rounded-xl border transition-colors',
                            isCurrent
                              ? 'bg-violet-500/10 border-violet-500/30 cursor-default'
                              : 'bg-muted/40 hover:bg-muted/70 border-border cursor-pointer',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {/* Visual connector */}
                              {idx > 0 && (
                                <span className="text-muted-foreground/40 text-[10px] leading-none">↳</span>
                              )}
                              <span className={cn(
                                'text-xs font-semibold',
                                isCurrent ? 'text-violet-600' : 'text-violet-500',
                              )}>
                                {isOriginal ? 'Original' : `Rev ${rev.revisionNumber}`}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-600 font-semibold">
                                  current
                                </span>
                              )}
                            </div>
                            <StatusBadge status={rev.status} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 pl-0.5">
                            {new Date(rev.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Status Actions ── */}
              {(transitions.length > 0 || ['rejected', 'expired', 'sent'].includes(proposal.status)) && role !== 'salesperson' && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Actions</p>
                  <div className="space-y-2">
                    {transitions.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.status}
                          onClick={() => {
                            setPendingStatus(t.status);
                            if (TERMINAL_STATUSES.has(t.status)) {
                              setConfirmOpen(true);
                            } else {
                              statusMutation.mutate({ status: t.status, notes: statusNotes || undefined });
                            }
                          }}
                          disabled={statusMutation.isPending}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50',
                            t.btnClass,
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {t.label}
                        </button>
                      );
                    })}

                    {/* Revise Proposal — available for rejected, expired, or sent */}
                    {['rejected', 'expired', 'sent'].includes(proposal.status) && (
                      <button
                        onClick={() => reviseMutation.mutate()}
                        disabled={reviseMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 bg-violet-600 hover:bg-violet-500 text-white"
                      >
                        {reviseMutation.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RefreshCw className="w-4 h-4" />
                        }
                        Revise Proposal
                      </button>
                    )}
                  </div>

                  {/* Notes field for non-terminal transitions */}
                  {transitions.some((t) => !TERMINAL_STATUSES.has(t.status)) && (
                    <textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Optional notes..."
                      rows={2}
                      className="mt-3 w-full px-3 py-2 bg-background border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  )}
                </div>
              )}
            </div>

            {/* ══ RIGHT SIDEBAR ══ */}
            <div className="space-y-4">

              {/* ── Follow-ups ── */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Follow-ups ({proposal.followUps?.length || 0})
                </p>
                <div className="space-y-2">
                  {proposal.followUps?.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No follow-ups scheduled yet.</p>
                  )}
                  {proposal.followUps?.map((fu: { id: string; scheduledAt: string; outcome: string | null; status: string; createdBy?: { firstName: string; lastName: string } }) => {
                    const done = fu.status === 'completed';
                    const overdue = !done && new Date(fu.scheduledAt) < new Date();
                    return (
                      <div
                        key={fu.id}
                        className={cn(
                          'p-3 rounded-xl border flex items-start gap-2.5',
                          done    ? 'bg-emerald-500/5 border-emerald-500/20'
                          : overdue ? 'bg-red-500/5 border-red-500/20'
                          :           'bg-muted/40 border-border',
                        )}
                      >
                        {done
                          ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                          : <Clock className={cn('w-4 h-4 mt-0.5 shrink-0', overdue ? 'text-red-500' : 'text-muted-foreground')} />
                        }
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold', done ? 'text-emerald-600' : overdue ? 'text-red-500' : 'text-foreground')}>
                            {new Date(fu.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                          {fu.outcome && <p className="text-xs text-muted-foreground mt-0.5">{fu.outcome}</p>}
                        </div>
                        {!done && (
                          <button
                            onClick={() => updateFollowUpMutation.mutate({ fid: fu.id, data: { status: 'completed' } })}
                            className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold shrink-0"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Schedule new follow-up */}
                <div className="mt-3 space-y-2">
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <input
                    placeholder="Outcome / notes (optional)"
                    value={followUpOutcome}
                    onChange={(e) => setFollowUpOutcome(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <button
                    onClick={() => {
                      if (followUpDate) addFollowUpMutation.mutate(new Date(followUpDate).toISOString());
                    }}
                    disabled={!followUpDate || addFollowUpMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Schedule Follow-up
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ══ BoQ Section — full width, below the main grid ══ */}
          <BoQSection
            proposalId={id}
            proposalStatus={proposal.status}
            boq={boq ?? null}
            boqLoading={boqLoading}
            boqMode={boqMode}
            setBoqMode={setBoqMode}
            role={role}
            qc={qc}
          />
        </div>
      </div>

      {/* ── Confirm Dialog for terminal status changes ── */}
      <ConfirmDialog
        open={confirmOpen && !!pendingStatus}
        title={pendingStatus === 'accepted' ? 'Accept Proposal?' : 'Reject Proposal?'}
        description={
          pendingStatus === 'accepted'
            ? 'This will mark the proposal as Accepted and set the linked ticket to Won. This action cannot be undone.'
            : 'This will mark the proposal as Rejected. This action cannot be undone.'
        }
        confirmLabel={pendingStatus === 'accepted' ? 'Accept' : 'Reject'}
        variant="danger"
        isPending={statusMutation.isPending}
        onConfirm={() =>
          statusMutation.mutate({ status: pendingStatus!, notes: statusNotes || undefined })
        }
        onCancel={() => {
          setConfirmOpen(false);
          setPendingStatus(null);
          setStatusNotes('');
        }}
      />
    </div>
  );
}
