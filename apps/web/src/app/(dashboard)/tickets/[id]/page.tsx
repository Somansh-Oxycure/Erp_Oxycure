'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  ChevronRight,
  Loader2,
  Wrench,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  FileUp,
  FileText,
  StickyNote,
  Clock,
} from 'lucide-react';
import { ticketsApi, usersApi, proposalsApi } from '@/lib/api';
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  getInitials,
  getAvatarColor,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  PRODUCT_TYPE_LABELS,
  SOURCE_LABELS,
} from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { TicketAgingTimeline } from '@/components/tickets/ticket-aging-timeline';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useRole } from '@/hooks/useRole';

const INPUT_CLS = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40';
const SELECT_CLS = 'w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer';

const TICKET_PIPELINE = [
  { status: 'new', label: 'New' },
  { status: 'contacted', label: 'Contacted' },
];

type EditSection = 'contact' | 'project' | 'consultant' | 'requirements' | 'deal' | 'source' | 'siteinspection' | 'assignedto' | null;

export default function TicketFullViewPage() {
  const params = useParams();
  const router = useRouter();
  const qc     = useQueryClient();
  const ticketId = params.id as string;
  const role     = useRole();

  const [noteContent,  setNoteContent]  = useState('');
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  // Inline edit state
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

  // Proposal modal state — new simplified version
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalDoc,    setProposalDoc]    = useState<File | null>(null);
  const [proposalNoteInput, setProposalNoteInput] = useState('');
  const [proposalNoteList, setProposalNoteList] = useState<{ content: string; addedAt: Date }[]>([]);

  const addProposalNoteLocally = () => {
    const content = proposalNoteInput.trim();
    if (!content) return;
    setProposalNoteList((prev) => [...prev, { content, addedAt: new Date() }]);
    setProposalNoteInput('');
  };

  const removeLocalNote = (i: number) =>
    setProposalNoteList((prev) => prev.filter((_, idx) => idx !== i));

  const { data: response, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.findOne(ticketId),
    enabled: !!ticketId,
  });

  const { data: usersResp } = useQuery({
    queryKey: ['salespersons'],
    queryFn: () => usersApi.salespersons(),
    staleTime: 60_000,
  });
  const salespersons: { id: string; firstName: string; lastName: string; role: string }[] =
    usersResp?.data?.data || usersResp?.data || [];

  const ticket = response?.data?.data;

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => ticketsApi.update(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket-stats'] });
      setEditingSection(null);
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

  const convertMutation = useMutation({
    mutationFn: async (data: { initialNote?: string; doc?: File | null; extraNotes: { content: string }[] }) => {
      // Step 1: Convert ticket → create proposal
      const res = await ticketsApi.convert(ticketId, { initialNote: data.initialNote });
      const proposalId: string = res?.data?.data?.id ?? res?.data?.id;
      if (!proposalId) throw new Error('Proposal creation failed');

      // Step 2: Upload document if provided
      if (data.doc) {
        await proposalsApi.uploadDocument(proposalId, data.doc);
      }

      // Step 3: Add additional notes
      for (const note of data.extraNotes) {
        await proposalsApi.addNote(proposalId, note.content);
      }

      return proposalId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal created successfully');
      setShowProposalModal(false);
      setProposalDoc(null);
      setProposalNoteInput('');
      setProposalNoteList([]);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create proposal');
    },
  });

  // â”€â”€ Edit helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startEdit = (section: EditSection, initial: Record<string, unknown>) => {
    setEditingSection(section);
    setEditForm(initial);
  };
  const cancelEdit = () => setEditingSection(null);
  const saveEdit   = () => {
    // Strip empty strings so optional fields with @IsDateString / @IsEmail etc. don't get empty-string payloads
    const payload = Object.fromEntries(
      Object.entries(editForm).filter(([, v]) => v !== ''),
    );
    updateMutation.mutate(payload);
  };
  const setField   = (key: string, value: unknown) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

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


  const isSaving = updateMutation.isPending;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* â”€â”€ Breadcrumb â”€â”€ */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-background text-sm text-muted-foreground">
        <button
          onClick={() => router.push('/tickets')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tickets
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{ticket.referenceId}</span>
      </div>

      {/* â”€â”€ Body â”€â”€ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

            {/* â•â• LEFT COLUMN â•â• */}
            <div className="space-y-6">

              {/* â”€â”€ Hero â”€â”€ */}
              <div className="p-5 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {ticket.referenceId}
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
                      {ticket.clientName} Â· {ticket.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateTime(ticket.createdAt)}
                  </div>
                </div>
              </div>

              {/* â”€â”€ Aging Timeline â”€â”€ */}
              <TicketAgingTimeline ticketId={ticketId} />

              {/* â”€â”€ Client & Contact â”€â”€ */}
              <EditableSection
                title="Client & Contact"
                isEditing={editingSection === 'contact'}
                isSaving={isSaving}
                onEdit={() => startEdit('contact', {
                  clientName:     ticket.clientName     || '',
                  name:           ticket.name           || '',
                  phone:          ticket.phone          || '',
                  alternatePhone: ticket.alternatePhone || '',
                  email:          ticket.email          || '',
                  clientLocation: ticket.clientLocation || '',
                  region:         ticket.region         || '',
                })}
                onSave={saveEdit}
                onCancel={cancelEdit}
              >
                {editingSection === 'contact' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Client Name *">
                      <input className={INPUT_CLS} value={String(editForm.clientName ?? '')} onChange={(e) => setField('clientName', e.target.value)} />
                    </Field>
                    <Field label="Contact Person *">
                      <input className={INPUT_CLS} value={String(editForm.name ?? '')} onChange={(e) => setField('name', e.target.value)} />
                    </Field>
                    <Field label="Phone *">
                      <input className={INPUT_CLS} value={String(editForm.phone ?? '')} onChange={(e) => setField('phone', e.target.value)} />
                    </Field>
                    <Field label="Alternate Phone">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.alternatePhone ?? '')} onChange={(e) => setField('alternatePhone', e.target.value)} />
                    </Field>
                    <Field label="Email">
                      <input type="email" className={INPUT_CLS} placeholder="Optional" value={String(editForm.email ?? '')} onChange={(e) => setField('email', e.target.value)} />
                    </Field>
                    <Field label="Client Location">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.clientLocation ?? '')} onChange={(e) => setField('clientLocation', e.target.value)} />
                    </Field>
                    <Field label="Region">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.region ?? '')} onChange={(e) => setField('region', e.target.value)} />
                    </Field>
                  </div>
                ) : (
                  <InfoGrid rows={[
                    ['Client Name',    ticket.clientName],
                    ['Contact Person', ticket.name],
                    ['Phone',          ticket.phone ? <a href={`tel:${ticket.phone}`} className="text-sky-500 hover:underline">{ticket.phone}</a> : null],
                    ['Alt Phone',      ticket.alternatePhone || null],
                    ['Email',          ticket.email ? <a href={`mailto:${ticket.email}`} className="text-sky-500 hover:underline">{ticket.email}</a> : null],
                    ['Location',       ticket.clientLocation || null],
                    ['Region',         ticket.region || null],
                  ]} />
                )}
              </EditableSection>

              {/* â”€â”€ Project Details â”€â”€ */}
              <EditableSection
                title="Project Details"
                isEditing={editingSection === 'project'}
                isSaving={isSaving}
                onEdit={() => startEdit('project', {
                  projectName:     ticket.projectName     || '',
                  projectLocation: ticket.projectLocation || '',
                  productType:     ticket.productType     || '',
                  approveMake:     ticket.approveMake     || '',
                  estimatedValue:  ticket.estimatedValue  ?? '',
                })}
                onSave={saveEdit}
                onCancel={cancelEdit}
              >
                {editingSection === 'project' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Project Name">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.projectName ?? '')} onChange={(e) => setField('projectName', e.target.value)} />
                    </Field>
                    <Field label="Project Location">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.projectLocation ?? '')} onChange={(e) => setField('projectLocation', e.target.value)} />
                    </Field>
                    <Field label="Product Type">
                      <select className={SELECT_CLS} value={String(editForm.productType ?? '')} onChange={(e) => setField('productType', e.target.value)}>
                        <option value="">â€” Select â€”</option>
                        {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Approve Make">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.approveMake ?? '')} onChange={(e) => setField('approveMake', e.target.value)} />
                    </Field>
                    <Field label="Estimated Value (â‚¹)">
                      <input type="number" min={0} className={INPUT_CLS} placeholder="0" value={editForm.estimatedValue === '' ? '' : Number(editForm.estimatedValue)} onChange={(e) => setField('estimatedValue', e.target.value === '' ? '' : Number(e.target.value))} />
                    </Field>
                  </div>
                ) : (
                  <InfoGrid rows={[
                    ['Project Name',   ticket.projectName   || null],
                    ['Location',       ticket.projectLocation || null],
                    ['Product Type',   ticket.productType ? PRODUCT_TYPE_LABELS[ticket.productType] || ticket.productType : null],
                    ['Approve Make',   ticket.approveMake   || null],
                    ['Est. Value',     ticket.estimatedValue ? formatCurrency(ticket.estimatedValue) : null],
                  ]} />
                )}
              </EditableSection>

              {/* â”€â”€ Consultant & Architect â”€â”€ */}
              <EditableSection
                title="Consultant & Architect"
                isEditing={editingSection === 'consultant'}
                isSaving={isSaving}
                onEdit={() => startEdit('consultant', {
                  consultantName:     ticket.consultantName     || '',
                  consultantLocation: ticket.consultantLocation || '',
                  architectName:      ticket.architectName      || '',
                  architectLocation:  ticket.architectLocation  || '',
                })}
                onSave={saveEdit}
                onCancel={cancelEdit}
              >
                {editingSection === 'consultant' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Consultant Name">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.consultantName ?? '')} onChange={(e) => setField('consultantName', e.target.value)} />
                    </Field>
                    <Field label="Consultant Location">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.consultantLocation ?? '')} onChange={(e) => setField('consultantLocation', e.target.value)} />
                    </Field>
                    <Field label="Architect Name">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.architectName ?? '')} onChange={(e) => setField('architectName', e.target.value)} />
                    </Field>
                    <Field label="Architect Location">
                      <input className={INPUT_CLS} placeholder="Optional" value={String(editForm.architectLocation ?? '')} onChange={(e) => setField('architectLocation', e.target.value)} />
                    </Field>
                  </div>
                ) : (
                  <InfoGrid rows={[
                    ['Consultant',          ticket.consultantName || null],
                    ['Consultant Location', ticket.consultantLocation || null],
                    ['Architect',           ticket.architectName || null],
                    ['Architect Location',  ticket.architectLocation || null],
                  ]} />
                )}
              </EditableSection>

              {/* â”€â”€ Requirements â”€â”€ */}
              <EditableSection
                title="Requirements"
                isEditing={editingSection === 'requirements'}
                isSaving={isSaving}
                onEdit={() => startEdit('requirements', { requirementNotes: ticket.requirementNotes || '' })}
                onSave={saveEdit}
                onCancel={cancelEdit}
              >
                {editingSection === 'requirements' ? (
                  <textarea
                    rows={5}
                    className={cn(INPUT_CLS, 'resize-none')}
                    placeholder="Describe the requirements..."
                    value={String(editForm.requirementNotes ?? '')}
                    onChange={(e) => setField('requirementNotes', e.target.value)}
                  />
                ) : ticket.requirementNotes ? (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-4">
                    {ticket.requirementNotes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No requirements added yet.</p>
                )}
              </EditableSection>

              {/* ── Notes ── */}
              <div className="p-5 rounded-2xl bg-card border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                  Notes ({ticket.notes?.length || 0})
                </p>
                <div className="space-y-3">
                  {ticket.notes?.map((note: { id: string; content: string; type: string; createdAt: string; createdBy?: { firstName: string; lastName: string } }) => (
                    <div key={note.id} className="p-3.5 rounded-xl bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {note.type?.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {note.createdBy ? `${note.createdBy.firstName} ${note.createdBy.lastName}` : 'Unknown'}
                          {' · '}
                          {formatRelative(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && noteContent.trim()) addNoteMutation.mutate(noteContent); }}
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
              </div>
            </div>

            {/* ══ RIGHT SIDEBAR ══ */}
            <div className="space-y-4">

              {/* â”€â”€ Deal Info â”€â”€ */}
              <EditableSection
                title="Deal Info"
                isEditing={editingSection === 'deal'}
                isSaving={isSaving}
                onEdit={() => startEdit('deal', {
                  estimatedValue:  ticket.estimatedValue ?? '',
                  priority:        ticket.priority       || 'medium',
                })}
                onSave={saveEdit}
                onCancel={cancelEdit}
                compact
              >
                {editingSection === 'deal' ? (
                  <div className="space-y-3">
                    <Field label="Estimated Value (â‚¹)">
                      <input type="number" min={0} className={INPUT_CLS} placeholder="0"
                        value={editForm.estimatedValue === '' ? '' : Number(editForm.estimatedValue)}
                        onChange={(e) => setField('estimatedValue', e.target.value === '' ? '' : Number(e.target.value))} />
                    </Field>
                    <Field label="Priority">
                      <select className={SELECT_CLS} value={String(editForm.priority ?? 'medium')} onChange={(e) => setField('priority', e.target.value)}>
                        {Object.entries(PRIORITY_CONFIG).map(([v, cfg]) => (
                          <option key={v} value={v}>{cfg.label}</option>
                        ))}
                      </select>
                    </Field>

                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <InfoRow label="Est. Value">
                      <span className="font-bold text-emerald-500">{formatCurrency(ticket.estimatedValue)}</span>
                    </InfoRow>
                    <InfoRow label="Priority">
                      {priorityCfg
                        ? <span className={cn('font-semibold', priorityCfg.color)}>{priorityCfg.label}</span>
                        : <Empty />}
                    </InfoRow>

                  </div>
                )}
              </EditableSection>

              {/* â”€â”€ Pipeline Status â”€â”€ */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Pipeline Status</p>
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
                  {nextStage && (
                    <button
                      onClick={handleMoveNext}
                      disabled={updateMutation.isPending}
                      className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Move to {nextStage.label}
                    </button>
                  )}
                </div>
              </div>

              {/* â”€â”€ Source â”€â”€ */}
              <EditableSection
                title="Source"
                isEditing={editingSection === 'source'}
                isSaving={isSaving}
                onEdit={() => startEdit('source', {
                  source:       ticket.source       || 'other',
                  sourceDetail: ticket.sourceDetail || '',
                })}
                onSave={saveEdit}
                onCancel={cancelEdit}
                compact
              >
                {editingSection === 'source' ? (
                  <div className="space-y-3">
                    <Field label="Source">
                      <select className={SELECT_CLS} value={String(editForm.source ?? 'other')} onChange={(e) => setField('source', e.target.value)}>
                        {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Source Detail">
                      <input className={INPUT_CLS} placeholder="e.g. Referred by Rahul" value={String(editForm.sourceDetail ?? '')} onChange={(e) => setField('sourceDetail', e.target.value)} />
                    </Field>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-foreground font-medium">
                      {SOURCE_LABELS[ticket.source] || ticket.source}
                    </p>
                    {ticket.sourceDetail
                      ? <p className="text-muted-foreground text-xs mt-0.5">{ticket.sourceDetail}</p>
                      : <p className="text-muted-foreground text-xs mt-0.5 italic">No source detail</p>}
                  </div>
                )}
              </EditableSection>

              {/* â”€â”€ Site Inspection â”€â”€ */}
              <EditableSection
                title="Site Inspection"
                isEditing={editingSection === 'siteinspection'}
                isSaving={isSaving}
                onEdit={() => startEdit('siteinspection', { siteInspectionNeeded: ticket.siteInspectionNeeded ?? false })}
                onSave={saveEdit}
                onCancel={cancelEdit}
                compact
              >
                {editingSection === 'siteinspection' ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editForm.siteInspectionNeeded)}
                      onChange={(e) => setField('siteInspectionNeeded', e.target.checked)}
                      className="w-4 h-4 accent-sky-500 cursor-pointer"
                    />
                    <span className="text-sm text-foreground">Site inspection required</span>
                  </label>
                ) : (
                  <div className={cn(
                    'flex items-center gap-2 text-sm font-medium',
                    ticket.siteInspectionNeeded ? 'text-amber-600' : 'text-muted-foreground',
                  )}>
                    <Wrench className="w-4 h-4" />
                    {ticket.siteInspectionNeeded ? 'Needed' : 'Not Required'}
                  </div>
                )}
              </EditableSection>

              {/* â”€â”€ Assigned To â”€â”€ */}
              <EditableSection
                title="Assigned To"
                isEditing={editingSection === 'assignedto'}
                isSaving={isSaving}
                onEdit={() => startEdit('assignedto', { assignedToId: ticket.assignedTo?.id || '' })}
                onSave={saveEdit}
                onCancel={cancelEdit}
                compact
              >
                {editingSection === 'assignedto' ? (
                  <select
                    className={SELECT_CLS}
                    value={String(editForm.assignedToId ?? '')}
                    onChange={(e) => setField('assignedToId', e.target.value || null)}
                  >
                    <option value="">â€” Unassigned â€”</option>
                    {salespersons.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role})
                      </option>
                    ))}
                  </select>
                ) : ticket.assignedTo ? (
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
                  <p className="text-sm text-muted-foreground italic">Unassigned</p>
                )}
              </EditableSection>

              {/* ── Linked Documents ── */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Linked Documents</p>
                <div className="space-y-1.5 text-sm">
                  <LinkedDoc label="Proposals"    count={ticket.proposals?.length || 0} />
                  <LinkedDoc label="Quotations"   count={ticket.quotations?.length || 0} />
                  <LinkedDoc label="Orders"       count={ticket.orders?.length || 0} />
                  <LinkedDoc label="Design Specs" count={ticket.designSpecs?.length || 0} />
                </div>
              </div>

              {/* ── Proposals List ── */}
              {ticket.proposals && ticket.proposals.length > 0 && (
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Proposals ({ticket.proposals.length})
                  </p>
                  <div className="space-y-2">
                    {ticket.proposals.map((p: { id: string; status: string; totalAmount: number | null; createdAt: string }, idx: number) => (
                      <button
                        key={p.id}
                        onClick={() => router.push(`/proposals/${p.id}`)}
                        className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/50 hover:bg-muted border border-border hover:border-sky-500/30 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate group-hover:text-sky-500 transition-colors">
                              Proposal #{ticket.proposals.length - idx}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{formatDate(p.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <StatusBadge status={p.status} />
                          {p.totalAmount != null && (
                            <span className="text-xs font-semibold text-emerald-600">{formatCurrency(p.totalAmount)}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Convert button ── */}
              {role !== 'installer' && ticket.status !== 'won' && ticket.status !== 'lost' && (!ticket.proposals || ticket.proposals.filter((p: { status: string }) => !['rejected', 'expired'].includes(p.status)).length === 0) && (
                <button
                  onClick={() => setShowConvertConfirm(true)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Convert to Proposal
                </button>
              )}

              {ticket.proposals && ticket.proposals.filter((p: { status: string }) => !['rejected', 'expired'].includes(p.status)).length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600 font-medium text-center">
                  ✓ Proposal created — REF: {ticket.referenceId}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm: Convert to Proposal ── */}
      <ConfirmDialog
        open={showConvertConfirm}
        title="Convert to Proposal?"
        description="This will create a new Proposal linked to this ticket. You can upload the proposal document and add notes in the next step."
        confirmLabel="Continue"
        variant="default"
        onConfirm={() => {
          setShowConvertConfirm(false);
          setShowProposalModal(true);
        }}
        onCancel={() => setShowConvertConfirm(false)}
      />

      {/* â”€â”€ Proposal Modal â”€â”€ */}
      {showProposalModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowProposalModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground">Create Proposal</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{ticket.referenceId}</p>
              </div>
              <button onClick={() => setShowProposalModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* Upload Document */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileUp className="w-4 h-4 text-sky-500" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Proposal Document</p>
                </div>
                {proposalDoc ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
                    <FileText className="w-5 h-5 text-sky-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{proposalDoc.name}</p>
                      <p className="text-xs text-muted-foreground">{(proposalDoc.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setProposalDoc(null)} className="text-muted-foreground hover:text-red-500 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-sky-500/50 hover:bg-sky-500/5 cursor-pointer transition-colors">
                    <FileUp className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground text-center">
                      Click to upload PDF, Word, or Excel
                      <br />
                      <span className="text-xs">Max 20 MB</span>
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={(e) => setProposalDoc(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Notes</p>
                </div>
                {proposalNoteList.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {proposalNoteList.map((n, i) => (
                      <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {n.addedAt.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <button onClick={() => removeLocalNote(i)} className="text-muted-foreground hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <textarea
                    value={proposalNoteInput}
                    onChange={(e) => setProposalNoteInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addProposalNoteLocally(); } }}
                    placeholder="Add a note... (Enter to add, Shift+Enter for new line)"
                    rows={2}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                  <button
                    onClick={addProposalNoteLocally}
                    disabled={!proposalNoteInput.trim()}
                    className="px-3 self-start bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-lg disabled:opacity-40 transition-colors py-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
              <button
                onClick={() => { setShowProposalModal(false); setProposalDoc(null); setProposalNoteInput(''); setProposalNoteList([]); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => convertMutation.mutate({
                  doc: proposalDoc,
                  extraNotes: proposalNoteList.map((n) => ({ content: n.content })),
                })}
                disabled={convertMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {convertMutation.isPending ? 'Creating...' : 'Create Proposal'}
              </button>
            </div>
          </div>
        </>
      )}

      
    </div>
  );
}

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EditableSection({
  title,
  children,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-2xl bg-card border border-border', compact ? 'p-4' : 'p-5')}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground text-xs rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-sky-500 text-xs rounded-lg hover:bg-muted transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground/50 italic text-xs">Not set</span>;
}

function InfoGrid({ rows }: { rows: [string, React.ReactNode | null | undefined][] }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <>
          <span key={`${label}-l`} className="text-muted-foreground">{label}</span>
          <span key={`${label}-v`} className="text-foreground font-medium">
            {value != null && value !== '' ? value : <span className="text-muted-foreground/50 italic text-xs">Not set</span>}
          </span>
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
