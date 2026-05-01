'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, TicketPlus, AlertTriangle } from 'lucide-react';
import { cn, PRODUCT_TYPE_LABELS, SOURCE_LABELS } from '@/lib/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ticketsApi, usersApi } from '@/lib/api';
import { toast } from 'sonner';

const schema = z.object({
  // Client & Contact
  clientName:     z.string().min(2, 'Client name required'),
  name:           z.string().min(2, 'Contact person name required'),
  phone:          z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  alternatePhone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number').optional().or(z.literal('')),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  clientLocation: z.string().optional(),
  region:         z.string().optional(),

  // Project Details
  projectName:     z.string().optional(),
  projectLocation: z.string().optional(),
  productType:     z.string().min(1, 'Product type required'),
  approveMake:     z.string().optional(),
  estimatedValue:  z.coerce.number().min(0).optional(),

  // Consultant & Architect
  consultantName:     z.string().optional(),
  consultantLocation: z.string().optional(),
  architectName:      z.string().optional(),
  architectLocation:  z.string().optional(),

  // Pipeline & Assignment
  source:           z.string().min(1, 'Source required'),
  sourceDetail:     z.string().optional(),
  priority:         z.enum(['low', 'medium', 'high', 'urgent']),
  siteInspectionNeeded: z.boolean().optional(),
  requirementNotes: z.string().optional(),
  assignedToId:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = [
  { label: 'Client & Contact', fields: ['clientName', 'name', 'phone', 'alternatePhone', 'email', 'clientLocation', 'region'] },
  { label: 'Project Details', fields: ['projectName', 'projectLocation', 'productType', 'approveMake', 'estimatedValue'] },
  { label: 'Consultant & Architect', fields: ['consultantName', 'consultantLocation', 'architectName', 'architectLocation'] },
  { label: 'Pipeline & Assignment', fields: ['source', 'sourceDetail', 'priority', 'siteInspectionNeeded', 'requirementNotes', 'assignedToId'] },
];

interface CreateTicketSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTicketSheet({ open, onClose }: CreateTicketSheetProps) {
  const [step, setStep] = useState(0);
  const [dupTicket, setDupTicket] = useState<null | { referenceId: string; clientName: string; status: string }>(null);
  const qc = useQueryClient();

  const { data: spResp } = useQuery({
    queryKey: ['salespersons'],
    queryFn: () => usersApi.salespersons(),
    enabled: open,
  });
  const salespersons = spResp?.data?.data || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      priority: 'medium',
      source: 'direct_enquiry',
      productType: 'air_purifier',
      siteInspectionNeeded: false,
    },
  });

  const siteInspNeeded = watch('siteInspectionNeeded');

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        clientName:          data.clientName,
        name:                data.name,
        phone:               data.phone.replace('+91', ''),
        alternatePhone:      data.alternatePhone?.replace('+91', '') || undefined,
        email:               data.email || undefined,
        clientLocation:      data.clientLocation || undefined,
        region:              data.region || undefined,
        projectName:         data.projectName || undefined,
        projectLocation:     data.projectLocation || undefined,
        productType:         data.productType,
        approveMake:         data.approveMake || undefined,
        estimatedValue:      data.estimatedValue || undefined,
        consultantName:      data.consultantName || undefined,
        consultantLocation:  data.consultantLocation || undefined,
        architectName:       data.architectName || undefined,
        architectLocation:   data.architectLocation || undefined,
        source:              data.source,
        sourceDetail:        data.sourceDetail || undefined,
        priority:            data.priority,
        siteInspectionNeeded: data.siteInspectionNeeded ?? false,
        requirementNotes:    data.requirementNotes || undefined,
        assignedToId:        data.assignedToId || undefined,
      };
      return ticketsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['ticket-stats'] });
      toast.success('Ticket created!');
      reset();
      setStep(0);
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: string[] } } };
      const data = axiosErr?.response?.data;
      if (data?.errors?.length) {
        data.errors.forEach((msg) => toast.error(msg));
      } else {
        toast.error(data?.message || 'Failed to create ticket');
      }
    },
  });

  const handleClose = () => {
    reset();
    setStep(0);
    setDupTicket(null);
    onClose();
  };

  const checkDuplicate = async (phone: string) => {
    const stripped = phone.replace('+91', '');
    if (stripped.length >= 10) {
      try {
        const res = await ticketsApi.checkDuplicate(stripped);
        const result = res.data?.data ?? res.data;
        if (result?.isDuplicate && result.ticket) {
          setDupTicket(result.ticket);
        } else {
          setDupTicket(null);
        }
      } catch { /* ignore */ }
    }
  };

  const handleNext = async () => {
    const fields = STEPS[step].fields as (keyof FormData)[];
    const valid = await trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = (data: FormData) => mutate(data);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center">
                  <TicketPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">New Ticket</h2>
                  <p className="text-xs text-muted-foreground">{STEPS[step].label}</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Step progress ── */}
            <div className="flex gap-1 px-6 pt-4 shrink-0">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn('h-1.5 flex-1 rounded-full transition-all duration-300', i <= step ? 'bg-sky-600' : 'bg-border')}
                />
              ))}
            </div>

            {/* ── Duplicate warning ── */}
            {dupTicket && (
              <div className="mx-6 mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-semibold">Possible duplicate</p>
                  <p className="mt-0.5">{dupTicket.clientName} — {dupTicket.referenceId} ({dupTicket.status})</p>
                </div>
              </div>
            )}

            {/* ── Form body ── */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">

                {/* ─ Step 0: Client & Contact ─ */}
                {step === 0 && (
                  <>
                    <Field label="Client / Company Name *" error={errors.clientName?.message}>
                      <input {...register('clientName')} placeholder="e.g. Tata Steel Ltd." className={inputCls(!!errors.clientName)} />
                    </Field>
                    <Field label="Contact Person *" error={errors.name?.message}>
                      <input {...register('name')} placeholder="Full name" className={inputCls(!!errors.name)} />
                    </Field>
                    <Field label="Mobile Number *" error={errors.phone?.message}>
                      <input
                        {...register('phone')}
                        onBlur={(e) => checkDuplicate(e.target.value)}
                        placeholder="9XXXXXXXXX"
                        className={inputCls(!!errors.phone)}
                      />
                    </Field>
                    <Field label="Alternate Phone" error={errors.alternatePhone?.message}>
                      <input {...register('alternatePhone')} placeholder="Optional" className={inputCls(!!errors.alternatePhone)} />
                    </Field>
                    <Field label="Email" error={errors.email?.message}>
                      <input {...register('email')} type="email" placeholder="Optional" className={inputCls(!!errors.email)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Location / City" error={errors.clientLocation?.message}>
                        <input {...register('clientLocation')} placeholder="City" className={inputCls(!!errors.clientLocation)} />
                      </Field>
                      <Field label="Region" error={errors.region?.message}>
                        <select {...register('region')} className={inputCls(!!errors.region)}>
                          <option value="">Select</option>
                          {['North', 'South', 'East', 'West', 'Central'].map((r) => (
                            <option key={r} value={r.toLowerCase()}>{r}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </>
                )}

                {/* ─ Step 1: Project Details ─ */}
                {step === 1 && (
                  <>
                    <Field label="Project Name" error={errors.projectName?.message}>
                      <input {...register('projectName')} placeholder="e.g. Tower A – Residential Block" className={inputCls(!!errors.projectName)} />
                    </Field>
                    <Field label="Project Location" error={errors.projectLocation?.message}>
                      <input {...register('projectLocation')} placeholder="e.g. Sector 42, Gurgaon" className={inputCls(!!errors.projectLocation)} />
                    </Field>
                    <Field label="Product Type *" error={errors.productType?.message}>
                      <select {...register('productType')} className={inputCls(!!errors.productType)}>
                        {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Approve Make" error={errors.approveMake?.message}>
                      <input {...register('approveMake')} placeholder="e.g. Honeywell, Daikin" className={inputCls(!!errors.approveMake)} />
                    </Field>
                    <Field label="Estimated Value (₹)" error={errors.estimatedValue?.message}>
                      <input {...register('estimatedValue')} type="number" min={0} placeholder="0" className={inputCls(!!errors.estimatedValue)} />
                    </Field>
                  </>
                )}

                {/* ─ Step 2: Consultant & Architect ─ */}
                {step === 2 && (
                  <>
                    <p className="text-xs text-muted-foreground -mb-1">Leave blank if not applicable.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Consultant Name">
                        <input {...register('consultantName')} className={inputCls(false)} />
                      </Field>
                      <Field label="Consultant Location">
                        <input {...register('consultantLocation')} className={inputCls(false)} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Architect Name">
                        <input {...register('architectName')} className={inputCls(false)} />
                      </Field>
                      <Field label="Architect Location">
                        <input {...register('architectLocation')} className={inputCls(false)} />
                      </Field>
                    </div>
                  </>
                )}

                {/* ─ Step 3: Pipeline & Assignment ─ */}
                {step === 3 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Source *" error={errors.source?.message}>
                        <select {...register('source')} className={inputCls(!!errors.source)}>
                          {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Source Detail">
                        <input {...register('sourceDetail')} placeholder="e.g. Google Ads" className={inputCls(false)} />
                      </Field>
                    </div>
                    <Field label="Priority *" error={errors.priority?.message}>
                      <div className="grid grid-cols-4 gap-2">
                        {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                          <label
                            key={p}
                            className={cn(
                              'flex flex-col items-center gap-1 p-2 rounded-xl border cursor-pointer transition-all text-xs font-semibold capitalize',
                              watch('priority') === p
                                ? p === 'urgent' ? 'bg-red-500/10 border-red-500/50 text-red-600'
                                : p === 'high'   ? 'bg-amber-500/10 border-amber-500/50 text-amber-600'
                                : p === 'medium' ? 'bg-blue-500/10 border-blue-500/50 text-blue-600'
                                :                  'bg-muted border-border text-muted-foreground'
                                : 'border-border text-muted-foreground hover:bg-accent',
                            )}
                          >
                            <input type="radio" {...register('priority')} value={p} className="sr-only" />
                            {p}
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Field label="Site Inspection Needed">
                      <label className="flex items-center gap-2 cursor-pointer w-fit mt-1">
                        <div
                          onClick={() => setValue('siteInspectionNeeded', !siteInspNeeded)}
                          className={cn(
                            'w-10 h-6 rounded-full transition-colors relative',
                            siteInspNeeded ? 'bg-sky-600' : 'bg-border',
                          )}
                        >
                          <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform', siteInspNeeded ? 'translate-x-5' : 'translate-x-1')} />
                        </div>
                        <span className="text-sm text-foreground">{siteInspNeeded ? 'Yes' : 'No'}</span>
                      </label>
                    </Field>
                    <Field label="Requirements / Notes">
                      <textarea
                        {...register('requirementNotes')}
                        rows={3}
                        placeholder="Describe the project requirements..."
                        className={cn(inputCls(false), 'resize-none')}
                      />
                    </Field>
                    {salespersons.length > 0 && (
                      <Field label="Assign To">
                        <select {...register('assignedToId')} className={inputCls(false)}>
                          <option value="">— Unassigned —</option>
                          {salespersons.map((u: { id: string; firstName: string; lastName: string }) => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </>
                )}
              </div>
            </form>

            {/* ── Footer ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-border shrink-0">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
                >
                  Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Ticket
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    'w-full px-3.5 py-2.5 bg-background border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all',
    hasError
      ? 'border-red-400 focus:ring-red-400/30'
      : 'border-border focus:ring-sky-500/40 focus:border-sky-500',
  );
}
