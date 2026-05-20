'use client';

import { useCallback, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, FileDown, Loader2, ChevronDown, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api';
import { UnitSelectorDialog } from './UnitSelectorDialog';

// ── Zod Schema ───────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Min 1'),
  amount: z.coerce.number().min(0, 'Min 0'),
});

const schema = z.object({
  // Basic Details
  client_name: z.string().min(1, 'Client name is required'),
  client_company_name: z.string().optional(),
  contact_person_name: z.string().optional(),
  contact_person_phone: z.string().optional(),
  project_name: z.string().min(1, 'Project name is required'),
  project_description: z.string().optional(),
  ref_number: z.string().optional(),
  date: z.string().optional(),
  submitted_date: z.string().optional(),
  // Project Details
  consultant_name: z.string().optional(),
  architect_name: z.string().optional(),
  project_stage: z.string().optional(),
  // Items
  items: z.array(itemSchema).min(1, 'At least one item is required'),
  // Financial
  freight_amount: z.coerce.number().min(0).optional(),
  special_discount: z.coerce.number().min(0).optional(),
  project_discount: z.coerce.number().min(0).optional(),
  // Terms
  gst_percentage: z.coerce.number().min(0).default(18),
  gst_text: z.string().optional(),
  price_basis: z.string().optional(),
  installation_included: z.string().optional(),
  freight_included: z.string().optional(),
  warranty_period: z.string().optional(),
  delivery_timeline: z.string().optional(),
  installation_timeline: z.string().optional(),
  // Commercial
  dlp_period: z.string().optional(),
  freight_terms: z.string().optional(),
  third_party_insurance: z.string().optional(),
  car_policy: z.string().optional(),
  water_electricity: z.string().optional(),
  payment_terms: z.string().optional(),
  payment_note: z.string().optional(),
  dispatch_time: z.string().optional(),
  validity_days: z.coerce.number().min(1).default(30),
  billing_delivery_note: z.string().optional(),
  site_person_details: z.string().optional(),
  // Company & Bank
  company_address: z.string().optional(),
  company_gstin: z.string().optional(),
  company_pan: z.string().optional(),
  bank_name: z.string().optional(),
  bank_address: z.string().optional(),
  bank_ifsc: z.string().optional(),
  bank_account_number: z.string().optional(),
  // Sales Person
  salesperson_name: z.string().optional(),
  salesperson_phone: z.string().optional(),
  salesperson_email: z.string().email('Invalid email').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(val: number) {
  return val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  full,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition';
const textareaCls = inputCls + ' resize-none min-h-[80px]';
const selectCls = inputCls;

// ── Main Component ───────────────────────────────────────────────────────────

export function ProposalGenerateForm({
  proposalId,
  savedData,
}: {
  proposalId?: string;
  savedData?: Record<string, unknown>;
}) {
  const qc = useQueryClient();
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gst_percentage: 18,
      gst_text: 'GST Shall be 18% Extra.',
      price_basis: 'Ex-Works, Gurugram (Haryana)',
      installation_included: 'Installation is included in the scope',
      freight_included: 'Freight, P&F, Insurance, Offloading & shifting till site is included in the scope',
      validity_days: 30,
      items: [{ name: '', description: '', quantity: 1, amount: 0 }],
      company_address:
        '10 FLOOR TOWER NO. 4 DLF CORPORATE GREENS SECTOR -74 A GURUGRAM- 122004 HARYANA, INDIA',
      company_gstin: '06AACCO9771F1Z8',
      company_pan: 'AACCO9771F',
      bank_name: 'HDFC BANK',
      bank_address: 'DLF Corporate Green Sector 74A Gurgaon',
      bank_ifsc: 'HDFC0009126',
      bank_account_number: '50200098001844',
      salesperson_email: 'care@o2cure.in',
      warranty_period: '18 Months from date of invoice',
      delivery_timeline: 'Supply will be initiated after two weeks of advance payment',
      installation_timeline: 'As per project T&C',
      dlp_period: 'Bank Guarantee (BG) of 5% of total basic value, valid for 1 year',
      payment_terms: '40% advance against ABG, 50% against delivery within 07 days, 10% after installation within 7 days',
      payment_note: 'TDS (Tax deducted at source) will not be accepted as payment mode',
      freight_terms: 'Freight, P&F, Insurance (Till site delivery), Offloading, shifting till site & Installation is included in our scope',
      third_party_insurance: 'O2Cure Pvt. Ltd.',
      car_policy: 'O2Cure Pvt. Ltd.',
      water_electricity: 'To be provided by Client / Contractor free of cost',
      dispatch_time: '4 to 6 Weeks after Advance',
      billing_delivery_note: 'Billing & delivery address to be mentioned in PO',
      site_person_details: 'To be provided by client',
      freight_amount: 0,
      special_discount: 0,
      project_discount: 0,
      // Overlay with previously saved data (if any)
      ...(savedData as Partial<FormValues>),
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Auto-calculated totals
  const items = watch('items') || [];
  const freightAmount = watch('freight_amount') || 0;
  const specialDiscount = watch('special_discount') || 0;
  const projectDiscount = watch('project_discount') || 0;
  const itemsTotal = items.reduce((s, i) => s + (Number(i.amount) || 0) * (Number(i.quantity) || 0), 0);
  const totalProjectValue = itemsTotal + Number(freightAmount) - Number(specialDiscount) - Number(projectDiscount);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!proposalId) {
        toast.error('No proposal ID. Use the proposal-specific generate page.');
        return;
      }
      try {
        const payload = {
          ...values,
          total_project_value: totalProjectValue,
        };

        const response = await proposalsApi.generateAndSave(proposalId!, payload);

        // Trigger browser download
        const blob = new Blob([response.data as ArrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proposal_${values.ref_number || Date.now()}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        // Refresh the proposal so the saved document/form data is reflected
        if (proposalId) qc.invalidateQueries({ queryKey: ['proposal', proposalId] });

        toast.success('Proposal generated and downloaded!');
      } catch {
        toast.error('Failed to generate proposal. Please try again.');
      }
    },
    [totalProjectValue, proposalId, qc],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Unit Selector Dialog */}
      {unitDialogOpen && (
        <UnitSelectorDialog
          onSelect={(unit) => {
            append({ name: unit.name, description: unit.description, quantity: 1, amount: unit.amount });
            setUnitDialogOpen(false);
          }}
          onClose={() => setUnitDialogOpen(false)}
        />
      )}
      {/* ── 1. Basic Details ── */}
      <SectionCard title="1. Basic Details">
        <Field label="Client Name *" error={errors.client_name?.message}>
          <input {...register('client_name')} className={inputCls} placeholder="e.g. DLF Hospitality" />
        </Field>
        <Field label="Client Company Name" error={errors.client_company_name?.message}>
          <input {...register('client_company_name')} className={inputCls} placeholder="M/S Company Name" />
        </Field>
        <Field label="Contact Person Name">
          <input {...register('contact_person_name')} className={inputCls} placeholder="Mr. Mohit Juneja" />
        </Field>
        <Field label="Contact Person Phone">
          <input {...register('contact_person_phone')} className={inputCls} placeholder="+91-XXXXXXXXXX" />
        </Field>
        <Field label="Project Name *" error={errors.project_name?.message}>
          <input {...register('project_name')} className={inputCls} placeholder="DLF DT4 Wellness Center" />
        </Field>
        <Field label="Reference Number">
          <input {...register('ref_number')} className={inputCls} placeholder="REF/2026/001" />
        </Field>
        <Field label="Date">
          <input type="date" {...register('date')} className={inputCls} />
        </Field>
        <Field label="Submitted Date">
          <input type="date" {...register('submitted_date')} className={inputCls} />
        </Field>
        <Field label="Project Description / Subject" full>
          <textarea
            {...register('project_description')}
            className={textareaCls}
            placeholder="OFFER FOR AIR PURIFICATION BY EAC, BIPOLAR…"
          />
        </Field>
      </SectionCard>

      {/* ── 2. Project Details ── */}
      <SectionCard title="2. Project Details">
        <Field label="Consultant Name">
          <input {...register('consultant_name')} className={inputCls} placeholder="RGC, Sector 65, Gurugram" />
        </Field>
        <Field label="Architect Name">
          <input {...register('architect_name')} className={inputCls} placeholder="White Studio, Ghitorni" />
        </Field>
        <Field label="Project Stage">
          <select {...register('project_stage')} className={selectCls}>
            <option value="">Select stage</option>
            <option value="DESIGN STAGE">DESIGN STAGE</option>
            <option value="EXECUTION STAGE">EXECUTION STAGE</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </Field>
      </SectionCard>

      {/* ── 3. Pricing Table ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">3. Pricing Table</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUnitDialogOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 transition border border-sky-300 hover:border-sky-400 rounded-lg px-2.5 py-1"
            >
              <Package className="w-3.5 h-3.5" />
              Select Unit
            </button>
            <button
              type="button"
              onClick={() => append({ name: '', description: '', quantity: 1, amount: 0 })}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_160px_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
            <span>Item / Unit Name &amp; Description</span>
            <span>Quantity</span>
            <span>Amount (Rs)</span>
            <span />
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_160px_40px] gap-3 items-start">
                <div>
                  <input
                    {...register(`items.${index}.name`)}
                    className={inputCls}
                    placeholder="e.g. BIPOLAR"
                  />
                  {errors.items?.[index]?.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.items[index]?.name?.message}</p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    {...register(`items.${index}.quantity`)}
                    className={inputCls}
                    placeholder="6"
                    min={1}
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-xs text-red-500 mt-1">{errors.items[index]?.quantity?.message}</p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    {...register(`items.${index}.amount`)}
                    className={inputCls}
                    placeholder="180000"
                    min={0}
                  />
                  {errors.items?.[index]?.amount && (
                    <p className="text-xs text-red-500 mt-1">{errors.items[index]?.amount?.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fields.length > 1 && remove(index)}
                  disabled={fields.length <= 1}
                  className="mt-1 p-2 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-30 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Description row */}
              <div>
                <textarea
                  {...register(`items.${index}.description`)}
                  className={textareaCls + ' text-xs min-h-[56px]'}
                  placeholder="Unit description (appears in proposal document)"
                />
              </div>
            </div>
          ))}

          {errors.items?.root && (
            <p className="text-xs text-red-500">{errors.items.root.message}</p>
          )}

          {/* Totals summary */}
          <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Items Total</span>
              <span className="font-medium text-foreground">₹ {formatINR(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>+ Freight / P&amp;F</span>
              <span>₹ {formatINR(Number(freightAmount))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>− Special Discount</span>
              <span>₹ {formatINR(Number(specialDiscount))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>− Project Discount</span>
              <span>₹ {formatINR(Number(projectDiscount))}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
              <span>Total Project Value</span>
              <span className="text-emerald-600">₹ {formatINR(totalProjectValue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Financial Summary ── */}
      <SectionCard title="4. Financial Summary">
        <Field label="Freight / P&F / Insurance (Rs)" error={errors.freight_amount?.message}>
          <input type="number" {...register('freight_amount')} className={inputCls} placeholder="399500" min={0} />
        </Field>
        <Field label="Special Discount (Rs)" error={errors.special_discount?.message}>
          <input type="number" {...register('special_discount')} className={inputCls} placeholder="98685" min={0} />
        </Field>
        <Field label="Project Base Discount (Rs)" error={errors.project_discount?.message}>
          <input type="number" {...register('project_discount')} className={inputCls} placeholder="543835" min={0} />
        </Field>
        <Field label="Total Project Value (auto-calculated)" full>
          <div className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-base font-semibold text-emerald-700">
            ₹ {formatINR(totalProjectValue)}
          </div>
        </Field>
      </SectionCard>

      {/* ── 5. Terms & Conditions ── */}
      <SectionCard title="5. Terms & Conditions">
        <Field label="Price Basis" full>
          <input {...register('price_basis')} className={inputCls} placeholder="Ex-Works, Gurugram (Haryana)" />
        </Field>
        <Field label="GST Percentage" error={errors.gst_percentage?.message}>
          <input type="number" {...register('gst_percentage')} className={inputCls} placeholder="18" min={0} />
        </Field>
        <Field label="GST Text" full>
          <input {...register('gst_text')} className={inputCls} placeholder="GST Shall be 18% Extra." />
        </Field>
        <Field label="Installation Included" full>
          <input {...register('installation_included')} className={inputCls} placeholder="Installation is included in scope" />
        </Field>
        <Field label="Freight Included" full>
          <input {...register('freight_included')} className={inputCls} placeholder="Freight, P&F, Insurance included" />
        </Field>
        <Field label="Warranty Period">
          <input {...register('warranty_period')} className={inputCls} placeholder="18 Months from date of invoice" />
        </Field>
        <Field label="Delivery Timeline" full>
          <textarea {...register('delivery_timeline')} className={textareaCls} placeholder="Supply will be initiated after…" />
        </Field>
        <Field label="Installation Timeline" full>
          <textarea {...register('installation_timeline')} className={textareaCls} placeholder="As per project T&C" />
        </Field>
      </SectionCard>

      {/* ── 6. Commercial Terms ── */}
      <SectionCard title="6. Commercial Terms">
        <Field label="DLP Period" full>
          <input {...register('dlp_period')} className={inputCls} placeholder="Bank Guarantee (BG) of 5%…" />
        </Field>
        <Field label="Freight, P&F, Insurance (Till site)" full>
          <textarea {...register('freight_terms')} className={textareaCls} placeholder="Freight, P&F, Insurance included in scope" />
        </Field>
        <Field label="Third Party Insurance – Supplier's Liability">
          <input {...register('third_party_insurance')} className={inputCls} placeholder="O2Cure Pvt. Ltd." />
        </Field>
        <Field label="CAR Policy – Supplier's Liability">
          <input {...register('car_policy')} className={inputCls} placeholder="O2Cure Pvt. Ltd." />
        </Field>
        <Field label="Water & Electricity">
          <input {...register('water_electricity')} className={inputCls} placeholder="To be provided by Client free of cost" />
        </Field>
        <Field label="Payment Terms" full>
          <textarea {...register('payment_terms')} className={textareaCls} placeholder="40% advance against ABG…" />
        </Field>
        <Field label="Payment Note" full>
          <textarea {...register('payment_note')} className={textareaCls} placeholder="TDS will not be accepted as payment mode" />
        </Field>
        <Field label="Dispatch Time">
          <input {...register('dispatch_time')} className={inputCls} placeholder="4 to 6 Weeks after Advance" />
        </Field>
        <Field label="Validity (Days)" error={errors.validity_days?.message}>
          <input type="number" {...register('validity_days')} className={inputCls} placeholder="30" min={1} />
        </Field>
        <Field label="Billing & Delivery Note" full>
          <textarea {...register('billing_delivery_note')} className={textareaCls} placeholder="Billing & delivery address to be mentioned in PO" />
        </Field>
        <Field label="Site Person Name & Contact">
          <input {...register('site_person_details')} className={inputCls} placeholder="Name and contact number" />
        </Field>
      </SectionCard>

      {/* ── 7. Company & Bank Details ── */}
      <SectionCard title="7. Company & Bank Details">
        <Field label="Company Address" full>
          <textarea {...register('company_address')} className={textareaCls} placeholder="10 Floor Tower…" />
        </Field>
        <Field label="Company GSTIN">
          <input {...register('company_gstin')} className={inputCls} placeholder="06AACCO9771F1Z8" />
        </Field>
        <Field label="Company PAN">
          <input {...register('company_pan')} className={inputCls} placeholder="AACCO9771F" />
        </Field>
        <Field label="Bank Name">
          <input {...register('bank_name')} className={inputCls} placeholder="HDFC BANK" />
        </Field>
        <Field label="Bank Address">
          <input {...register('bank_address')} className={inputCls} placeholder="DLF Corporate Green Sector 74A" />
        </Field>
        <Field label="Bank IFSC Code">
          <input {...register('bank_ifsc')} className={inputCls} placeholder="HDFC0009126" />
        </Field>
        <Field label="Bank Account Number">
          <input {...register('bank_account_number')} className={inputCls} placeholder="50200098001844" />
        </Field>
      </SectionCard>

      {/* ── 8. Sales Person ── */}
      <SectionCard title="8. Sales Person">
        <Field label="Sales Person Name">
          <input {...register('salesperson_name')} className={inputCls} placeholder="Ms. Priyanka Balyan" />
        </Field>
        <Field label="Mobile Number">
          <input {...register('salesperson_phone')} className={inputCls} placeholder="+91-9138961379" />
        </Field>
        <Field label="Email ID" error={errors.salesperson_email?.message}>
          <input type="email" {...register('salesperson_email')} className={inputCls} placeholder="care@o2cure.in" />
        </Field>
      </SectionCard>

      {/* ── Submit ── */}
      <div className="flex justify-end pt-2 pb-8">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60 transition shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Generate Proposal
            </>
          )}
        </button>
      </div>
    </form>
  );
}
