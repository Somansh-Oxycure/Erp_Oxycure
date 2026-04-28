'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  StickyNote,
  Wrench,
  Tag,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import { ticketsApi, usersApi, proposalsApi } from '@/lib/api';
import {
  cn,
  formatCurrency,
  formatDateTime,
  formatFollowUpDate,
  getInitials,
  getAvatarColor,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  PRODUCT_TYPE_LABELS,
  SOURCE_LABELS,
  isOverdue,
} from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { TicketAgingTimeline } from '@/components/tickets/ticket-aging-timeline';

const TICKET_PIPELINE = [
  { status: 'new', label: 'New' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'site_inspection', label: 'Site Inspection' },
  { status: 'design_review', label: 'Design Review' },
  { status: 'quoted', label: 'Quoted' },
  { status: 'won', label: 'Won' },
];

export default function TicketFullViewPage() {
  const params = useParams();
  const router = useRouter();
  const qc     = useQueryClient();
  const ticketId = params.id as string;

  const [activeTab,    setActiveTab]    = useState<'notes' | 'followups'>('notes');
  const [noteContent,  setNoteContent]  = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');

  // Proposal modal state
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalNotes, setProposalNotes]         = useState('');
  const [proposalValidUntil, setProposalValidUntil] = useState('');
  const [proposalTerms, setProposalTerms]         = useState('');
  const [proposalItems, setProposalItems]         = useState<
    { productName: string; description: string; quantity: number; unitPrice: number; discountPercent: number; taxPercent: number }[]
  >([]);

  const addProposalItem = () =>
    setProposalItems((prev) => [...prev, { productName: '', description: '', quantity: 1, unitPrice: 0, discountPercent: 0, taxPercent: 18 }]);

  const removeProposalItem = (i: number) =>
    setProposalItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateProposalItem = (i: number, key: string, value: string | number) =>
    setProposalItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: value } : item));

  const { data: response, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.findOne(ticketId),
    enabled: !!ticketId,
  });

  const ticket = response?.data?.data;

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => ticketsApi.update(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket updated');
    },
    onError: () => toast.error('Failed to update ticket'),
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => ticketsApi.addNote(ticketId, { content, type: 'general' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setNoteContent('');
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const addFollowUpMutation = useMutation({
    mutationFn: (scheduledAt: string) => ticketsApi.createFollowUp(ticketId, { scheduledAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setFollowUpDate('');
      toast.success('Follow-up scheduled');
    },
    onError: () => toast.error('Failed to schedule follow-up'),
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: ({ fid, data }: { fid: string; data: unknown }) =>
      ticketsApi.updateFollowUp(ticketId, fid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      toast.success('Follow-up updated');
    },
  });

  const convertMutation = useMutation({
    mutationFn: (data: unknown) => ticketsApi.convert(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal created successfully');
      setShowProposalModal(false);
      setProposalItems([]);
      setProposalNotes('');
      setProposalValidUntil('');
      setProposalTerms('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create proposal');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">Ticket not found</p>
        <button onClick={() => router.push('/tickets')} className="text-sm text-sky-500 hover:text-sky-400 underline">
          Back to Tickets
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG];
  const priorityCfg = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG];
  const currentStageIdx = TICKET_PIPELINE.findIndex((p) => p.status === ticket.status);
  const nextStage = currentStageIdx < TICKET_PIPELINE.length - 1 ? TICKET_PIPELINE[currentStageIdx + 1] : null;

  const handleMoveNext = () => {
    if (!nextStage) return;
    updateMutation.mutate({ status: nextStage.status });
  };

  const handleMarkLost = () => {
    if (!lostReason.trim()) { toast.error('Please enter a lost reason'); return; }
    updateMutation.mutate({ status: 'lost', lostReason });
    setShowLostModal(false);
    setLostReason('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-background text-sm text-muted-foreground">
        <button
          onClick={() => router.push('/tickets')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tickets
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{ticket.ticketNumber}</span>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

            {/* ══ LEFT COLUMN ══ */}
            <div className="space-y-6">

              {/* ── Hero ── */}
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {ticket.ticketNumber}
                      </span>
                      {statusCfg && (
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', statusCfg.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                          {statusCfg.label}
                        </span>
                      )}
                      {priorityCfg && (
                        <span className={cn('text-xs font-semibold', priorityCfg.color)}>
                          {priorityCfg.label} Priority
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl font-bold text-foreground">
                      {ticket.projectName || ticket.clientName}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {ticket.clientName} · {ticket.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateTime(ticket.createdAt)}
                  </div>
                </div>
              </div>

              {/* ── Aging Timeline ── */}
              <TicketAgingTimeline ticketId={ticketId} />

              {/* ── Client & Contact ── */}
              <SectionCard title="Client & Contact">
                <InfoGrid rows={[
                  ['Client Name',    ticket.clientName],
                  ['Contact Person', ticket.name],
                  ['Phone',          ticket.phone ? <a href={`tel:${ticket.phone}`} className="text-sky-500 hover:underline">{ticket.phone}</a> : null],
                  ['Alt Phone',      ticket.alternatePhone || null],
                  ['Email',          ticket.email ? <a href={`mailto:${ticket.email}`} className="text-sky-500 hover:underline">{ticket.email}</a> : null],
                  ['Location',       ticket.clientLocation || null],
                  ['Region',         ticket.region || null],
                ]} />
              </SectionCard>

              {/* ── Project Details ── */}
              <SectionCard title="Project Details">
                <InfoGrid rows={[
                  ['Project Name',   ticket.projectName || null],
                  ['Location',       ticket.projectLocation || null],
                  ['Product Type',   ticket.productType ? PRODUCT_TYPE_LABELS[ticket.productType] || ticket.productType : null],
                  ['Approve Make',   ticket.approveMake || null],
                  ['Est. Value',     ticket.estimatedValue ? formatCurrency(ticket.estimatedValue) : null],
                ]} />
              </SectionCard>

              {/* ── Consultant & Architect ── */}
              {(ticket.consultantName || ticket.architectName) && (
                <SectionCard title="Consultant & Architect">
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-sm">
                    <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide" />
                    <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Name</span>
                    <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Location</span>
                    {ticket.consultantName && <>
                      <span className="text-muted-foreground text-xs">Consultant</span>
                      <span className="text-foreground font-medium">{ticket.consultantName}</span>
                      <span className="text-foreground">{ticket.consultantLocation || '—'}</span>
                    </>}
                    {ticket.architectName && <>
                      <span className="text-muted-foreground text-xs">Architect</span>
                      <span className="text-foreground font-medium">{ticket.architectName}</span>
                      <span className="text-foreground">{ticket.architectLocation || '—'}</span>
                    </>}
                  </div>
                </SectionCard>
              )}

              {/* ── Requirements ── */}
              {ticket.requirementNotes && (
                <SectionCard title="Requirements">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-4">
                    {ticket.requirementNotes}
                  </p>
                </SectionCard>
              )}

              {/* ── Notes & Follow-ups Tabs ── */}
              <SectionCard title="">
                {/* Tab bar */}
                <div className="flex gap-1 border-b border-border mb-4 -mt-1">
                  {(['notes', 'followups'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px',
                        activeTab === tab
                          ? 'border-sky-500 text-sky-600'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tab === 'notes' ? `Notes (${ticket.notes?.length || 0})` : `Follow-ups (${ticket.followUps?.length || 0})`}
                    </button>
                  ))}
                </div>

                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    {ticket.notes?.map((note: { id: string; content: string; type: string; createdAt: string; createdBy?: { firstName: string } }) => (
                      <div key={note.id} className="p-3.5 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {note.type?.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {note.createdBy?.firstName} · {formatDateTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                    {/* Add note */}
                    <div className="flex gap-2 mt-2">
                      <input
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      />
                      <button
                        onClick={() => { if (noteContent.trim()) addNoteMutation.mutate(noteContent); }}
                        disabled={!noteContent.trim() || addNoteMutation.isPending}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'followups' && (
                  <div className="space-y-3">
                    {ticket.followUps?.map((fu: { id: string; scheduledAt: string; outcome: string | null; status: string }) => {
                      const done    = fu.status === 'completed';
                      const overdue = !done && isOverdue(fu.scheduledAt);
                      return (
                        <div
                          key={fu.id}
                          className={cn(
                            'p-3.5 rounded-xl border flex items-start gap-3',
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
                              {formatFollowUpDate(fu.scheduledAt)}
                            </p>
                            {fu.outcome && <p className="text-xs text-muted-foreground mt-0.5">{fu.outcome}</p>}
                          </div>
                          {!done && (
                            <button
                              onClick={() => updateFollowUpMutation.mutate({ fid: fu.id, data: { status: 'completed' } })}
                              className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold shrink-0"
                            >
                              Mark done
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {/* Add follow-up */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      />
                      <button
                        onClick={() => { if (followUpDate) addFollowUpMutation.mutate(new Date(followUpDate).toISOString()); }}
                        disabled={!followUpDate || addFollowUpMutation.isPending}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* ══ RIGHT SIDEBAR ══ */}
            <div className="space-y-4">

              {/* ── Deal Summary ── */}
              <SideCard title="Deal Summary">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Value</span>
                    <span className="font-bold text-emerald-500">{formatCurrency(ticket.estimatedValue)}</span>
                  </div>
                  {ticket.nextFollowUpDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Follow-up</span>
                      <span className={cn('font-medium', isOverdue(ticket.nextFollowUpDate) ? 'text-red-500' : 'text-foreground')}>
                        {formatFollowUpDate(ticket.nextFollowUpDate)}
                      </span>
                    </div>
                  )}
                </div>
              </SideCard>

              {/* ── Pipeline Status ── */}
              <SideCard title="Pipeline Status">
                <div className="space-y-1.5">
                  {TICKET_PIPELINE.map((stage, i) => {
                    const isCurrent = stage.status === ticket.status;
                    const isPast    = i < currentStageIdx;
                    return (
                      <div key={stage.status} className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm',
                        isCurrent ? 'bg-sky-500/10 border border-sky-500/30' : 'opacity-60',
                      )}>
                        <span className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          isPast ? 'bg-emerald-500' : isCurrent ? 'bg-sky-500' : 'bg-border',
                        )} />
                        <span className={cn('font-medium', isCurrent ? 'text-sky-600' : isPast ? 'text-emerald-600' : 'text-muted-foreground')}>
                          {stage.label}
                        </span>
                        {isCurrent && <span className="ml-auto text-xs text-sky-500 font-semibold">Current</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {nextStage && ticket.status !== 'won' && ticket.status !== 'lost' && (
                    <button
                      onClick={handleMoveNext}
                      disabled={updateMutation.isPending}
                      className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Move to {nextStage.label}
                    </button>
                  )}
                  {ticket.status !== 'won' && ticket.status !== 'lost' && (
                    <button
                      onClick={() => setShowLostModal(true)}
                      className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-sm font-semibold rounded-lg transition-colors border border-red-500/20"
                    >
                      Mark as Lost
                    </button>
                  )}
                </div>
              </SideCard>

              {/* ── Source ── */}
              <SideCard title="Source">
                <p className="text-sm text-foreground font-medium">
                  {SOURCE_LABELS[ticket.source] || ticket.source}
                  {ticket.sourceDetail && <span className="text-muted-foreground"> — {ticket.sourceDetail}</span>}
                </p>
              </SideCard>

              {/* ── Site Inspection ── */}
              <SideCard title="Site Inspection">
                <div className={cn(
                  'flex items-center gap-2 text-sm font-medium',
                  ticket.siteInspectionNeeded ? 'text-amber-600' : 'text-muted-foreground',
                )}>
                  <Wrench className="w-4 h-4" />
                  {ticket.siteInspectionNeeded ? 'Needed' : 'Not Required'}
                </div>
              </SideCard>

              {/* ── Assigned To ── */}
              <SideCard title="Assigned To">
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center shrink-0', getAvatarColor(ticket.assignedTo.firstName))}>
                      {getInitials(ticket.assignedTo.firstName, ticket.assignedTo.lastName)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {ticket.assignedTo.role?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
              </SideCard>

              {/* ── Linked Documents ── */}
              <SideCard title="Linked Documents">
                <div className="space-y-1.5 text-sm">
                  <LinkedDoc label="Proposals"    count={ticket.proposals?.length || 0} />
                  <LinkedDoc label="Quotations"   count={ticket.quotations?.length || 0} />
                  <LinkedDoc label="Orders"       count={ticket.orders?.length || 0} />
                  <LinkedDoc label="Design Specs" count={ticket.designSpecs?.length || 0} />
                </div>
              </SideCard>

              {/* ── Convert button ── */}
              {ticket.status !== 'won' && ticket.status !== 'lost' && (!ticket.proposals || ticket.proposals.filter((p: { status: string }) => !['rejected', 'expired'].includes(p.status)).length === 0) && (
                <button
                  onClick={() => setShowProposalModal(true)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Convert to Proposal
                </button>
              )}

              {ticket.proposals && ticket.proposals.filter((p: { status: string }) => !['rejected', 'expired'].includes(p.status)).length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 font-medium text-center">
                  ✓ Proposal created — {ticket.proposals.find((p: { status: string; proposalNumber: string }) => !['rejected', 'expired'].includes(p.status))?.proposalNumber}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Proposal Modal ── */}
      {showProposalModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowProposalModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-base font-bold text-foreground">Create Proposal</h3>
              <button onClick={() => setShowProposalModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={proposalValidUntil}
                    onChange={(e) => setProposalValidUntil(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Notes</label>
                  <input
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                    placeholder="Internal notes..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Terms &amp; Conditions</label>
                <textarea
                  value={proposalTerms}
                  onChange={(e) => setProposalTerms(e.target.value)}
                  rows={2}
                  placeholder="Payment terms, warranty, etc."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items</label>
                  <button
                    onClick={addProposalItem}
                    className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                {proposalItems.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed border-border rounded-lg">
                    No items added — proposal will use estimated value
                  </p>
                )}
                {proposalItems.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2 mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={item.productName}
                        onChange={(e) => updateProposalItem(i, 'productName', e.target.value)}
                        placeholder="Product name *"
                        className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                      />
                      <button onClick={() => removeProposalItem(i)} className="text-red-500 hover:text-red-400 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      value={item.description}
                      onChange={(e) => updateProposalItem(i, 'description', e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Qty</label>
                        <input type="number" min={1} value={item.quantity}
                          onChange={(e) => updateProposalItem(i, 'quantity', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Unit Price</label>
                        <input type="number" min={0} value={item.unitPrice}
                          onChange={(e) => updateProposalItem(i, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Disc %</label>
                        <input type="number" min={0} max={100} value={item.discountPercent}
                          onChange={(e) => updateProposalItem(i, 'discountPercent', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Tax %</label>
                        <input type="number" min={0} value={item.taxPercent}
                          onChange={(e) => updateProposalItem(i, 'taxPercent', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
              <button
                onClick={() => setShowProposalModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  convertMutation.mutate({
                    notes: proposalNotes || undefined,
                    validUntil: proposalValidUntil || undefined,
                    termsAndConditions: proposalTerms || undefined,
                    items: proposalItems.length > 0 ? proposalItems : undefined,
                  });
                }}
                disabled={convertMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {convertMutation.isPending ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Lost Reason Modal ── */}
      {showLostModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowLostModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-base font-bold text-foreground mb-3">Mark as Lost</h3>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Reason for loss..."
              rows={3}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowLostModal(false)} className="flex-1 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent">
                Cancel
              </button>
              <button onClick={handleMarkLost} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold">
                Confirm Lost
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border">
      {title && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">{title}</p>
      )}
      {children}
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  );
}

function InfoGrid({ rows }: { rows: [string, React.ReactNode | null | undefined][] }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
      {rows.filter(([, v]) => v != null && v !== '').map(([label, value]) => (
        <>
          <span key={`${label}-l`} className="text-muted-foreground">{label}</span>
          <span key={`${label}-v`} className="text-foreground font-medium">{value}</span>
        </>
      ))}
    </div>
  );
}

function LinkedDoc({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', count > 0 ? 'text-sky-500' : 'text-muted-foreground')}>{count}</span>
    </div>
  );
}
