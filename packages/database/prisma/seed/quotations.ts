import { PrismaClient } from '@prisma/client';
import { Users } from './users';
import { LeadIds } from './leads';
import { CustomerIds } from './customers';
import { OpportunityIds } from './opportunities';
import { DesignSpecIds } from './design-specs';

// ============================================================
//  QUOTATIONS — Only from leads with approved/completed design specs
//
//  QT-001 → LD-001, OPP-001, CUS-001 (hospital)  → accepted  → Order exists
//  QT-002 → LD-002, OPP-002, CUS-002 (clinic)    → accepted  → Order exists
//  QT-003 → LD-003, OPP-003, CUS-003 (builder)   → sent      → In negotiation
// ============================================================

export type QuotationIds = {
  qt001: string;
  qt002: string;
  qt003: string;
};

export async function seedQuotations(
  prisma: PrismaClient,
  users: Users,
  leadIds: LeadIds,
  customerIds: CustomerIds,
  oppIds: OpportunityIds,
  specIds: DesignSpecIds,
): Promise<QuotationIds> {
  const { salesperson, salesperson2 } = users;

  // QT-001 — Medicare Hospital (accepted, order placed)
  const qt001 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QT-2026-001' },
    update: {},
    create: {
      quotationNumber: 'QT-2026-001',
      opportunityId: oppIds.opp001,
      customerId: customerIds.hospital,
      leadId: leadIds['LD-2026-0001'],
      status: 'accepted',
      validUntil: new Date('2026-03-15'),
      subtotal: 383051,
      taxAmount: 68949,
      discountAmount: 0,
      totalAmount: 452000,
      termsAndConditions: 'Payment: 50% advance, 50% on delivery. Warranty: 2 years on all units. Installation included.',
      notes: 'Hospital emergency procurement rate applied. PO received.',
      createdById: salesperson.id,
    },
  });

  await prisma.quotationItem.createMany({
    data: [
      { quotationId: qt001.id, productName: 'Oxycure AP-2000 HEPA Air Purifier', description: 'ICU-grade, HEPA H14, CADR 2000 m³/h, <28dB', quantity: 3, unitPrice: 45000, discountPercent: 0, taxPercent: 18, totalPrice: 159300, sortOrder: 1 },
      { quotationId: qt001.id, productName: 'Oxycure AP-800 Air Purifier', description: 'General ward grade, HEPA H13, CADR 800 m³/h', quantity: 10, unitPrice: 18500, discountPercent: 5, taxPercent: 18, totalPrice: 207285, sortOrder: 2 },
      { quotationId: qt001.id, productName: 'Wall Mounting Brackets (ICU)', description: 'Heavy-duty hospital-grade brackets', quantity: 3, unitPrice: 800, discountPercent: 0, taxPercent: 18, totalPrice: 2832, sortOrder: 3 },
      { quotationId: qt001.id, productName: 'Installation & Commissioning', description: 'On-site installation, testing, staff training', quantity: 1, unitPrice: 25000, discountPercent: 0, taxPercent: 18, totalPrice: 29500, sortOrder: 4 },
    ],
  });

  // Link design spec to quotation
  await prisma.designSpecification.update({
    where: { id: specIds.ds001 },
    data: { quotationId: qt001.id },
  });

  // QT-002 — Apollo Clinic (accepted, order placed)
  const qt002 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QT-2026-002' },
    update: {},
    create: {
      quotationNumber: 'QT-2026-002',
      opportunityId: oppIds.opp002,
      customerId: customerIds.clinic,
      leadId: leadIds['LD-2026-0002'],
      status: 'accepted',
      validUntil: new Date('2026-03-31'),
      subtotal: 269492,
      taxAmount: 48508,
      discountAmount: 0,
      totalAmount: 318000,
      termsAndConditions: 'Payment: 100% advance. Delivery within 7 working days. 2-year warranty on units.',
      notes: 'Referral discount (10%) applied on units. AMC included.',
      createdById: salesperson2.id,
    },
  });

  await prisma.quotationItem.createMany({
    data: [
      { quotationId: qt002.id, productName: 'Oxycure AP-500 Air Purifier', description: 'Clinic-grade, HEPA H13 + UV-C, CADR 500 m³/h', quantity: 5, unitPrice: 22000, discountPercent: 10, taxPercent: 18, totalPrice: 116820, sortOrder: 1 },
      { quotationId: qt002.id, productName: 'Oxycure AP-300 Lab Purifier', description: 'HEPA H12 + activated carbon, lab-grade', quantity: 1, unitPrice: 14000, discountPercent: 10, taxPercent: 18, totalPrice: 14868, sortOrder: 2 },
      { quotationId: qt002.id, productName: 'Annual Maintenance Contract (AMC)', description: '1-year AMC covering all 6 units, 2 visits/year', quantity: 1, unitPrice: 36000, discountPercent: 0, taxPercent: 18, totalPrice: 42480, sortOrder: 3 },
      { quotationId: qt002.id, productName: 'HEPA Filter Replacement Set', description: 'Set of 6 OEM filters for year-1 replacement', quantity: 1, unitPrice: 12000, discountPercent: 0, taxPercent: 18, totalPrice: 14160, sortOrder: 4 },
    ],
  });

  // Link design spec to quotation
  await prisma.designSpecification.update({
    where: { id: specIds.ds002 },
    data: { quotationId: qt002.id },
  });

  // QT-003 — Green Builders HVAC (sent, in negotiation)
  const qt003 = await prisma.quotation.upsert({
    where: { quotationNumber: 'QT-2026-003' },
    update: {},
    create: {
      quotationNumber: 'QT-2026-003',
      opportunityId: oppIds.opp003,
      customerId: customerIds.builder,
      leadId: leadIds['LD-2026-0003'],
      status: 'sent',
      validUntil: new Date('2026-05-20'),
      subtotal: 2076271,
      taxAmount: 373729,
      discountAmount: 0,
      totalAmount: 2450000,
      termsAndConditions: 'Payment: 30% on PO, 40% on delivery, 30% on installation sign-off. 5-year AMC included.',
      notes: 'Revised quote after consultant review. Client requested 5% discount — pending manager approval.',
      createdById: salesperson.id,
    },
  });

  await prisma.quotationItem.createMany({
    data: [
      { quotationId: qt003.id, productName: 'Oxycure HVAC AHU 5-Ton Unit', description: 'Commercial-grade AHU with VSD, rooftop installation', quantity: 4, unitPrice: 320000, discountPercent: 5, taxPercent: 18, totalPrice: 1437120, sortOrder: 1 },
      { quotationId: qt003.id, productName: 'Duct Network & Air Distribution', description: 'Complete ductwork for 50,000 sqft, all floors', quantity: 1, unitPrice: 450000, discountPercent: 0, taxPercent: 18, totalPrice: 531000, sortOrder: 2 },
      { quotationId: qt003.id, productName: 'BMS Integration & Controls', description: 'Building management system, 4-zone control', quantity: 1, unitPrice: 120000, discountPercent: 0, taxPercent: 18, totalPrice: 141600, sortOrder: 3 },
      { quotationId: qt003.id, productName: '5-Year Comprehensive AMC', description: 'Annual servicing + emergency callouts for 5 years', quantity: 1, unitPrice: 250000, discountPercent: 0, taxPercent: 18, totalPrice: 295000, sortOrder: 4 },
    ],
  });

  // Link design spec to quotation
  await prisma.designSpecification.update({
    where: { id: specIds.ds003 },
    data: { quotationId: qt003.id },
  });

  console.log('✅ 3 quotations created (2 accepted, 1 sent/in-negotiation)');
  return { qt001: qt001.id, qt002: qt002.id, qt003: qt003.id };
}
