'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Tag,
  User,
  Clock,
  MessageSquare,
  CalendarPlus,
  TrendingRight,
  Loader2,
  ChevronRight,
  ArrowRight,
  DollarSign,
  FileText,
} from 'lucide-react';
import { cn, formatCurrency, formatDateTime, formatFollowUpDate, getInitials, getAvatarColor, STATUS_CONFIG, PRIORITY_CONFIG, PRODUCT_TYPE_LABELS, SOURCE_LABELS, isOverdue } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api';

interface LeadDetailPanelProps {
  leadId: string | null;
  onClose: () => void;
}

export function LeadDetailPanel({ leadId, onClose }: LeadDetailPanelProps) {
  const { data: response, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => leadsApi.findOne(leadId!),
    enabled: !!leadId,
  });

  const lead = response?.data?.data;

  return (
    <AnimatePresence>
      {leadId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Lead Details</span>
                {lead && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-700 font-semibold">{lead.leadNumber}</span>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading || !lead ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* ── Contact header ── */}
                  <div className="flex items-start gap-4">
                    {(() => {
                      const fullName = lead.contactName ?? `${lead.firstName} ${lead.lastName ?? ''}`.trim();
                      return (
                        <div
                          className={cn(
                            'w-14 h-14 rounded-2xl text-white text-xl font-bold flex items-center justify-center shrink-0',
                            getAvatarColor(fullName),
                          )}
                        >
                          {getInitials(lead.firstName ?? fullName.split(' ')[0], lead.lastName ?? fullName.split(' ')[1])}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-slate-900 truncate">{lead.contactName ?? `${lead.firstName} ${lead.lastName ?? ''}`.trim()}</h2>
                      {lead.companyName && (
                        <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {lead.companyName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Status badge */}
                        {(() => {
                          const cfg = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG];
                          return cfg ? (
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.color)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                              {cfg.label}
                            </span>
                          ) : null;
                        })()}
                        {/* Priority */}
                        {(() => {
                          const cfg = PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG];
                          return cfg ? (
                            <span className={cn('text-xs font-semibold', cfg.color)}>
                              {cfg.label} Priority
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── Key details grid ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <DetailCard icon={DollarSign} label="Est. Value" value={formatCurrency(lead.estimatedValue)} color="text-emerald-600" />
                    <DetailCard icon={Tag} label="Product" value={PRODUCT_TYPE_LABELS[lead.productInterest] || lead.productInterest} color="text-sky-600" />
                    <DetailCard icon={FileText} label="Source" value={SOURCE_LABELS[lead.source] || lead.source} color="text-blue-600" />
                    <DetailCard
                      icon={Calendar}
                      label="Follow-up"
                      value={formatFollowUpDate(lead.nextFollowUpDate)}
                      color={lead.nextFollowUpDate && isOverdue(lead.nextFollowUpDate) ? 'text-red-600' : 'text-slate-600'}
                    />
                  </div>

                  {/* ── Contact info ── */}
                  <Section title="Contact Info">
                    <ContactRow icon={Phone} value={lead.phone} href={`tel:${lead.phone}`} />
                    {lead.email && <ContactRow icon={Mail} value={lead.email} href={`mailto:${lead.email}`} />}
                    {lead.address && <ContactRow icon={MapPin} value={lead.address} />}
                  </Section>

                  {/* ── Assignment ── */}
                  {lead.assignedTo && (
                    <Section title="Assigned To">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center', getAvatarColor(lead.assignedTo.firstName))}>
                          {getInitials(lead.assignedTo.firstName, lead.assignedTo.lastName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                          </p>
                          <p className="text-xs text-slate-400 capitalize">{lead.assignedTo.role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* ── Notes ── */}
                  {lead.notes && lead.notes.length > 0 && (
                    <Section title={`Notes (${lead.notes.length})`}>
                      <div className="space-y-2">
                        {lead.notes.slice(0, 3).map((note: { id: string; content: string; createdAt: string; createdBy?: { firstName: string } }) => (
                          <div key={note.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                            <p className="text-xs text-slate-400 mt-1.5">
                              {note.createdBy?.firstName} · {formatDateTime(note.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* ── Follow-ups ── */}
                  {lead.followUps && lead.followUps.length > 0 && (
                    <Section title={`Follow-ups (${lead.followUps.length})`}>
                      <div className="space-y-2">
                        {lead.followUps.slice(0, 3).map((fu: { id: string; scheduledAt: string; notes: string; status: string }) => (
                          <div
                            key={fu.id}
                            className={cn(
                              'p-3 rounded-xl border flex items-start gap-3',
                              fu.status === 'completed' ? 'bg-emerald-50 border-emerald-100' : isOverdue(fu.scheduledAt) ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100',
                            )}
                          >
                            <Clock className={cn('w-4 h-4 mt-0.5 shrink-0', fu.status === 'completed' ? 'text-emerald-500' : isOverdue(fu.scheduledAt) ? 'text-red-500' : 'text-slate-400')} />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{formatFollowUpDate(fu.scheduledAt)}</p>
                              {fu.notes && <p className="text-xs text-slate-500 mt-0.5">{fu.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Timestamps */}
                  <p className="text-xs text-slate-400 text-center">
                    Created {formatDateTime(lead.createdAt)}
                  </p>
                </div>
              )}
            </div>

            {/* ── Footer actions ── */}
            {lead && (
              <div className="border-t border-slate-100 px-6 py-4 flex gap-2 shrink-0 bg-slate-50/50">
                <a
                  href={`/leads/${lead.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors shadow-sm"
                >
                  Open Full View
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function DetailCard({
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
    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={cn('text-sm font-semibold', color || 'text-slate-800')}>{value || '—'}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  value,
  href,
}: {
  icon: React.ElementType;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <span className={cn('text-sm text-slate-700', href && 'group-hover:text-sky-600 transition-colors')}>{value}</span>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}
