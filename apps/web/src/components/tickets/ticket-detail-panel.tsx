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
  DollarSign,
  FileText,
  ChevronRight,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  cn,
  formatCurrency,
  formatDateTime,
  getInitials,
  getAvatarColor,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  PRODUCT_TYPE_LABELS,
  SOURCE_LABELS,
} from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ticketsApi } from '@/lib/api';

interface TicketDetailPanelProps {
  ticketId: string | null;
  onClose: () => void;
}

export function TicketDetailPanel({ ticketId, onClose }: TicketDetailPanelProps) {
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.findOne(ticketId!),
    enabled: !!ticketId,
  });

  const ticket = response?.data?.data;

  return (
    <AnimatePresence>
      {ticketId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Ticket Details</span>
                {ticket && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-foreground font-semibold">{ticket.referenceId}</span>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                </div>
              ) : isError || !ticket ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 px-6">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground text-center">
                    {isError ? 'Failed to load ticket details.' : 'Ticket not found.'}
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* ── Avatar + header ── */}
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-14 h-14 rounded-2xl text-white text-xl font-bold flex items-center justify-center shrink-0',
                        getAvatarColor(ticket.clientName),
                      )}
                    >
                      {getInitials(ticket.clientName?.split(' ')[0], ticket.clientName?.split(' ')[1])}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-foreground truncate">
                        {ticket.projectName || ticket.clientName}
                      </h2>
                      <p className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {ticket.clientName} · {ticket.name}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {(() => {
                          const cfg = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG];
                          return cfg ? (
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.color)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                              {cfg.label}
                            </span>
                          ) : null;
                        })()}
                        {(() => {
                          const cfg = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG];
                          return cfg ? (
                            <span className={cn('text-xs font-semibold', cfg.color)}>
                              {cfg.label} Priority
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── Key metrics ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <DetailCard icon={DollarSign} label="Est. Value" value={formatCurrency(ticket.estimatedValue)} color="text-emerald-600" />
                    <DetailCard icon={Tag} label="Product" value={PRODUCT_TYPE_LABELS[ticket.productType] || ticket.productType} color="text-sky-600" />
                    <DetailCard icon={FileText} label="Source" value={SOURCE_LABELS[ticket.source] || ticket.source} color="text-blue-600" />
                    <DetailCard icon={Calendar} label="Created" value={formatDateTime(ticket.createdAt)} color="text-muted-foreground" />
                  </div>

                  {/* ── Contact ── */}
                  <Section title="Contact Info">
                    {ticket.phone && <ContactRow icon={Phone} value={ticket.phone} href={`tel:${ticket.phone}`} />}
                    {ticket.email && <ContactRow icon={Mail} value={ticket.email} href={`mailto:${ticket.email}`} />}
                    {ticket.clientLocation && <ContactRow icon={MapPin} value={ticket.clientLocation} />}
                  </Section>

                  {/* ── Project ── */}
                  {ticket.projectName && (
                    <Section title="Project">
                      <p className="text-sm text-foreground font-medium">{ticket.projectName}</p>
                      {ticket.projectLocation && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {ticket.projectLocation}
                        </p>
                      )}
                    </Section>
                  )}

                  {/* ── Assigned To ── */}
                  {ticket.assignedTo && (
                    <Section title="Assigned To">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center', getAvatarColor(ticket.assignedTo.firstName))}>
                          {getInitials(ticket.assignedTo.firstName, ticket.assignedTo.lastName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{ticket.assignedTo.role?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* ── Notes ── */}
                  {ticket.notes && ticket.notes.length > 0 && (
                    <Section title={`Notes (${ticket.notes.length})`}>
                      <div className="space-y-2">
                        {ticket.notes.slice(0, 3).map((note: { id: string; content: string; createdAt: string; createdBy?: { firstName: string } }) => (
                          <div key={note.id} className="p-3 rounded-xl bg-muted/60 border border-border">
                            <p className="text-sm text-foreground leading-relaxed">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {note.createdBy?.firstName} · {formatDateTime(note.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    Created {formatDateTime(ticket.createdAt)}
                  </p>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            {ticket && (
              <div className="border-t border-border px-6 py-4 flex gap-2 shrink-0">
                <a
                  href={`/tickets/${ticket.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500 transition-colors shadow-sm"
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
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function DetailCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  return (
    <div className="p-3.5 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={cn('text-sm font-semibold', color || 'text-foreground')}>{value || '—'}</p>
    </div>
  );
}

function ContactRow({ icon: Icon, value, href }: { icon: React.ElementType; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-accent transition-colors group">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className={cn('text-sm text-foreground', href && 'group-hover:text-sky-500 transition-colors')}>{value}</span>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}
