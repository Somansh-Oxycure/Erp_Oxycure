'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Tag,
  Clock,
  DollarSign,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  TrendingUp,
  StickyNote,
  Wrench,
} from 'lucide-react';
import { leadsApi } from '@/lib/api';
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

export default function LeadFullViewPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const { data: response, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => leadsApi.findOne(leadId),
    enabled: !!leadId,
  });

  const lead = response?.data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">Lead not found</p>
        <button
          onClick={() => router.push('/crm')}
          className="text-sm text-sky-500 hover:text-sky-400 underline"
        >
          Back to CRM
        </button>
      </div>
    );
  }

  const fullName = lead.contactName ?? `${lead.firstName} ${lead.lastName ?? ''}`.trim();
  const statusCfg = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG];
  const priorityCfg = PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG];
  const address = [lead.addressLine1, lead.addressLine2, lead.city, lead.state, lead.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Breadcrumb / Back bar ─────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-3 border-b border-border bg-background text-sm text-muted-foreground">
        <button
          onClick={() => router.push('/crm')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          CRM
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{lead.leadNumber}</span>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

          {/* ── Hero section ── */}
          <div className="flex items-start gap-5">
            <div
              className={cn(
                'w-16 h-16 rounded-2xl text-white text-2xl font-bold flex items-center justify-center shrink-0',
                getAvatarColor(fullName),
              )}
            >
              {getInitials(lead.firstName ?? fullName.split(' ')[0], lead.lastName ?? fullName.split(' ')[1])}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">{fullName}</h1>
              {lead.companyName && (
                <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.companyName}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
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
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                  {lead.leadNumber}
                </span>
              </div>
            </div>
          </div>

          {/* ── Key metrics grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={DollarSign} label="Est. Value" value={formatCurrency(lead.estimatedValue)} color="text-emerald-500" />
            <MetricCard icon={Tag} label="Product" value={PRODUCT_TYPE_LABELS[lead.productInterest] || lead.productInterest || '—'} color="text-sky-500" />
            <MetricCard icon={FileText} label="Source" value={SOURCE_LABELS[lead.source] || lead.source || '—'} color="text-violet-500" />
            <MetricCard
              icon={Calendar}
              label="Follow-up"
              value={formatFollowUpDate(lead.nextFollowUpDate)}
              color={lead.nextFollowUpDate && isOverdue(lead.nextFollowUpDate) ? 'text-red-500' : 'text-amber-500'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Contact info ── */}
            <Section title="Contact Info" icon={Phone}>
              <div className="space-y-0.5">
                <ContactRow icon={Phone} value={lead.phone} href={`tel:${lead.phone}`} />
                {lead.alternatePhone && <ContactRow icon={Phone} value={lead.alternatePhone} href={`tel:${lead.alternatePhone}`} label="Alt" />}
                {lead.email && <ContactRow icon={Mail} value={lead.email} href={`mailto:${lead.email}`} />}
                {address && <ContactRow icon={MapPin} value={address} />}
              </div>
            </Section>

            {/* ── Assignment ── */}
            <Section title="Assigned To" icon={User}>
              {lead.assignedTo ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <div className={cn('w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center shrink-0', getAvatarColor(lead.assignedTo.firstName))}>
                    {getInitials(lead.assignedTo.firstName, lead.assignedTo.lastName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {lead.assignedTo.role?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3">Unassigned</p>
              )}

              {/* Site inspection */}
              {lead.siteInspectionNeeded && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                  <Wrench className="w-4 h-4 shrink-0" />
                  Site inspection required
                </div>
              )}
            </Section>
          </div>

          {/* ── Requirement Notes ── */}
          {lead.requirementNotes && (
            <Section title="Requirement Notes" icon={StickyNote}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-4">
                {lead.requirementNotes}
              </p>
            </Section>
          )}

          {/* ── Notes ── */}
          {lead.notes && lead.notes.length > 0 && (
            <Section title={`Notes (${lead.notes.length})`} icon={StickyNote}>
              <div className="space-y-2">
                {lead.notes.map((note: { id: string; content: string; createdAt: string; createdBy?: { firstName: string } }) => (
                  <div key={note.id} className="p-3.5 rounded-xl bg-muted/50 border border-border">
                    <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {note.createdBy?.firstName && `${note.createdBy.firstName} · `}
                      {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Follow-ups ── */}
          {lead.followUps && lead.followUps.length > 0 && (
            <Section title={`Follow-ups (${lead.followUps.length})`} icon={Clock}>
              <div className="space-y-2">
                {lead.followUps.map((fu: { id: string; scheduledAt: string; notes: string; status: string }) => {
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
                      <div>
                        <p className={cn('text-sm font-semibold', done ? 'text-emerald-600' : overdue ? 'text-red-500' : 'text-foreground')}>
                          {formatFollowUpDate(fu.scheduledAt)}
                        </p>
                        {fu.notes && <p className="text-xs text-muted-foreground mt-0.5">{fu.notes}</p>}
                        <span className={cn(
                          'mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded capitalize',
                          done ? 'bg-emerald-500/10 text-emerald-600' : overdue ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground',
                        )}>
                          {fu.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── Opportunities ── */}
          {lead.opportunities && lead.opportunities.length > 0 && (
            <Section title={`Opportunities (${lead.opportunities.length})`} icon={TrendingUp}>
              <div className="space-y-2">
                {lead.opportunities.map((opp: { id: string; opportunityNumber: string; title: string; stage: string; dealValue: number | null }) => (
                  <div key={opp.id} className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{opp.title}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{opp.opportunityNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-500">{formatCurrency(opp.dealValue)}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{opp.stage?.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Timestamps ── */}
          <p className="text-xs text-muted-foreground text-center pb-4">
            Created {formatDateTime(lead.createdAt)}
            {lead.updatedAt && lead.updatedAt !== lead.createdAt && ` · Updated ${formatDateTime(lead.updatedAt)}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={cn('text-sm font-semibold', color || 'text-foreground')}>{value || '—'}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  href,
  label,
}: {
  icon: React.ElementType;
  value: string;
  href?: string;
  label?: string;
}) {
  const content = (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-muted/60 transition-colors group">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      {label && <span className="text-xs text-muted-foreground">{label}:</span>}
      <span className={cn('text-sm text-foreground', href && 'group-hover:text-sky-500 transition-colors')}>{value}</span>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}
