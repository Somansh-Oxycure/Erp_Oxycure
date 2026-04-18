'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, UserPlus, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn, PRODUCT_TYPE_LABELS, SOURCE_LABELS } from '@/lib/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { leadsApi, usersApi } from '@/lib/api';
import { toast } from 'sonner';

const schema = z.object({
  contactName: z.string().min(2, 'Name required'),
  companyName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  address: z.string().optional(),
  source: z.string().min(1, 'Source required'),
  productInterest: z.string().min(1, 'Product required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimatedValue: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateLeadDialogProps {
  open: boolean;
  onClose: () => void;
}

const FIELDS_STEPS = [
  { label: 'Contact Info', fields: ['contactName', 'companyName', 'phone', 'email', 'address'] },
  { label: 'Lead Details', fields: ['source', 'productInterest', 'priority', 'estimatedValue', 'assignedToId'] },
  { label: 'Notes', fields: ['notes'] },
];

export function CreateLeadDialog({ open, onClose }: CreateLeadDialogProps) {
  const [step, setStep] = useState(0);
  const [duplicateLead, setDuplicateLead] = useState<null | { leadNumber: string; firstName: string; lastName: string; status: string }>(null);
  const qc = useQueryClient();

  const { data: salespersonsResp } = useQuery({
    queryKey: ['salespersons'],
    queryFn: () => usersApi.salespersons(),
    enabled: open,
  });
  const salespersons = salespersonsResp?.data?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    trigger,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { priority: 'medium', source: 'website', productInterest: 'air_purifier' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => {
      const nameParts = data.contactName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || undefined;
      const payload = {
        firstName,
        lastName,
        email: data.email || undefined,
        phone: data.phone,
        companyName: data.companyName || undefined,
        addressLine1: data.address || undefined,
        source: data.source || undefined,
        productType: data.productInterest || undefined,
        priority: data.priority,
        estimatedValue: data.estimatedValue || undefined,
        requirementNotes: data.notes || undefined,
        assignedToId: data.assignedToId || undefined,
      };
      return leadsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead-stats'] });
      toast.success('Lead created successfully!');
      reset();
      setStep(0);
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: string[] } } };
      const data = axiosErr?.response?.data;
      if (data?.errors && data.errors.length > 0) {
        data.errors.forEach((msg) => toast.error(msg));
      } else {
        toast.error(data?.message || 'Failed to create lead');
      }
    },
  });

  const handleClose = () => {
    reset();
    setStep(0);
    setDuplicateLead(null);
    onClose();
  };

  const handlePhoneBlur = async (phone: string) => {
    if (phone.length >= 10) {
      try {
        const res = await leadsApi.checkDuplicate(phone);
        const result = res.data?.data ?? res.data;
        if (result?.isDuplicate && result.lead) {
          setDuplicateLead(result.lead);
        } else {
          setDuplicateLead(null);
        }
      } catch {
        // silently ignore
      }
    }
  };

  const handleNext = async () => {
    const currentFields = FIELDS_STEPS[step].fields as (keyof FormData)[];
    const valid = await trigger(currentFields);
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
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">New Lead</h2>
                    <p className="text-xs text-slate-400">{FIELDS_STEPS[step].label}</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicators */}
              <div className="flex gap-1 px-6 pt-4">
                {FIELDS_STEPS.map((s, i) => (
                  <div key={i} className={cn('h-1.5 flex-1 rounded-full transition-all duration-300', i <= step ? 'bg-sky-600' : 'bg-slate-100')} />
                ))}
              </div>

              {/* Duplicate phone warning */}
              <AnimatePresence>
                {duplicateLead && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-6 mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700">
                      <span className="font-semibold">Duplicate phone detected.</span> Lead{' '}
                      <span className="font-mono">{duplicateLead.leadNumber}</span> —{' '}
                      {duplicateLead.firstName} {duplicateLead.lastName} ({duplicateLead.status}) already exists with this number.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="px-6 py-5 space-y-4 min-h-[320px]">
                  {/* Step 0: Contact Info */}
                  {step === 0 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Full Name *" error={errors.contactName?.message}>
                          <input {...register('contactName')} placeholder="John Doe" className={inputCls} />
                        </Field>
                        <Field label="Company" error={errors.companyName?.message}>
                          <input {...register('companyName')} placeholder="Acme Corp" className={inputCls} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Phone *" error={errors.phone?.message}>
                          <input
                            {...register('phone')}
                            placeholder="9876543210"
                            className={inputCls}
                            onBlur={(e) => handlePhoneBlur(e.target.value)}
                          />
                        </Field>
                        <Field label="Email" error={errors.email?.message}>
                          <input {...register('email')} type="email" placeholder="john@company.com" className={inputCls} />
                        </Field>
                      </div>
                      <Field label="Address" error={errors.address?.message}>
                        <input {...register('address')} placeholder="City, State" className={inputCls} />
                      </Field>
                    </motion.div>
                  )}

                  {/* Step 1: Lead Details */}
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Source *" error={errors.source?.message}>
                          <select {...register('source')} className={selectCls}>
                            {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Product *" error={errors.productInterest?.message}>
                          <select {...register('productInterest')} className={selectCls}>
                            {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Priority" error={errors.priority?.message}>
                          <select {...register('priority')} className={selectCls}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </Field>
                        <Field label="Est. Value (₹)" error={errors.estimatedValue?.message}>
                          <input {...register('estimatedValue')} type="number" placeholder="50000" className={inputCls} />
                        </Field>
                      </div>
                      {salespersons.length > 0 && (
                        <Field label="Assign To" error={errors.assignedToId?.message}>
                          <select {...register('assignedToId')} className={selectCls}>
                            <option value="">Unassigned</option>
                            {salespersons.map((sp: { id: string; firstName: string; lastName: string }) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.firstName} {sp.lastName}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                    </motion.div>
                  )}

                  {/* Step 2: Notes */}
                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <Field label="Initial Note (optional)" error={errors.notes?.message}>
                        <textarea
                          {...register('notes')}
                          rows={6}
                          placeholder="Add any initial notes about this lead..."
                          className={cn(inputCls, 'resize-none')}
                        />
                      </Field>
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                  <button
                    type="button"
                    onClick={step === 0 ? handleClose : () => setStep((s) => s - 1)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    {step === 0 ? 'Cancel' : 'Back'}
                  </button>

                  {step < FIELDS_STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 transition-all shadow-sm"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-xl hover:bg-sky-700 disabled:opacity-60 transition-all shadow-sm"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Create Lead
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputCls = 'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all';
const selectCls = 'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
