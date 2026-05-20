'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '@/lib/api';
import { Supplier } from '@/types/api';
import { toast } from 'sonner';
import { X, Upload, FileText, ExternalLink } from 'lucide-react';

interface Props {
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupplierFormModal({ supplier, onClose, onSuccess }: Props) {
  const isEdit = !!supplier;
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    contactName: supplier?.contactName ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
    gstin: supplier?.gstin ?? '',
    pan: supplier?.pan ?? '',
    bankName: supplier?.bankName ?? '',
    bankAccountNumber: supplier?.bankAccountNumber ?? '',
    bankIfscCode: supplier?.bankIfscCode ?? '',
    bankBranch: supplier?.bankBranch ?? '',
    leadTimeDays: String(supplier?.leadTimeDays ?? 3),
    notes: supplier?.notes ?? '',
    status: supplier?.status ?? 'active',
  });

  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [existingChequeUrl, setExistingChequeUrl] = useState<string | null>(
    supplier?.cancelledChequeUrl ?? null,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        contactName: form.contactName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        bankName: form.bankName || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        bankIfscCode: form.bankIfscCode || undefined,
        bankBranch: form.bankBranch || undefined,
        leadTimeDays: Number(form.leadTimeDays),
        notes: form.notes || undefined,
        ...(isEdit && { status: form.status }),
      };

      const res = isEdit
        ? await suppliersApi.update(supplier.id, payload)
        : await suppliersApi.create(payload);

      const savedId: string = res.data.data.id;

      if (chequeFile) {
        await suppliersApi.uploadCancelledCheque(savedId, chequeFile);
      }

      return res;
    },
    onSuccess: () => {
      toast.success(`Supplier ${isEdit ? 'updated' : 'created'} successfully`);
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Save failed'),
  });

  const f = (field: keyof typeof form) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ─── Basic Info ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Company Name *</label>
                <input {...f('name')} className={inputCls} placeholder="Blue Star Distributors" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contact Name</label>
                <input {...f('contactName')} className={inputCls} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <input {...f('phone')} className={inputCls} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input type="email" {...f('email')} className={inputCls} placeholder="contact@supplier.com" />
              </div>
              {isEdit && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <select {...f('status')} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                <textarea {...f('address')} rows={2} className={`${inputCls} resize-none`} placeholder="Full address…" />
              </div>
            </div>
          </section>

          {/* ─── Tax & Compliance ───────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tax &amp; Compliance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">GST Number</label>
                <input {...f('gstin')} className={inputCls} placeholder="29ABCDE1234F1Z5" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">PAN Number</label>
                <input {...f('pan')} className={inputCls} placeholder="ABCDE1234F" />
              </div>
            </div>
          </section>

          {/* ─── Bank Details ───────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bank Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bank Name</label>
                <input {...f('bankName')} className={inputCls} placeholder="HDFC Bank" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Account Number</label>
                <input {...f('bankAccountNumber')} className={inputCls} placeholder="1234567890" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">IFSC Code</label>
                <input {...f('bankIfscCode')} className={inputCls} placeholder="HDFC0001234" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Branch</label>
                <input {...f('bankBranch')} className={inputCls} placeholder="Bangalore Main Branch" />
              </div>

              {/* Cancelled Cheque Upload */}
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Cancelled Cheque</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-ring transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {chequeFile ? chequeFile.name : 'Upload file (JPG, PNG, PDF)'}
                  </button>
                  {existingChequeUrl && !chequeFile && (
                    <a
                      href={existingChequeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View existing
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {chequeFile && (
                    <button
                      type="button"
                      onClick={() => setChequeFile(null)}
                      className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setChequeFile(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </section>

          {/* ─── Other ──────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Other</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Lead Time (days)</label>
                <input type="number" min="1" {...f('leadTimeDays')} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea {...f('notes')} rows={2} className={`${inputCls} resize-none`} placeholder="Additional notes…" />
              </div>
            </div>
          </section>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!form.name || saveMutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Supplier' : 'Create Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}
