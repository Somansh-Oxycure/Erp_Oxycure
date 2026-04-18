import { PrismaClient } from '@prisma/client';
import { Users } from './users';
import { LeadIds } from './leads';
import { CustomerIds } from './customers';
import { OpportunityIds } from './opportunities';
import { QuotationIds } from './quotations';

// ============================================================
//  ORDERS — Only from accepted quotations
//
//  ORD-001 → QT-001, OPP-001, CUS-001 (hospital)  → completed
//  ORD-002 → QT-002, OPP-002, CUS-002 (clinic)    → in_progress
// ============================================================

export async function seedOrders(
  prisma: PrismaClient,
  users: Users,
  leadIds: LeadIds,
  customerIds: CustomerIds,
  oppIds: OpportunityIds,
  quotIds: QuotationIds,
): Promise<void> {
  const { salesperson, salesperson2 } = users;

  // ORD-001 — Medicare Hospital (completed — delivered and installed)
  const order1 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-2026-001' },
    update: {},
    create: {
      orderNumber: 'ORD-2026-001',
      customerId: customerIds.hospital,
      leadId: leadIds['LD-2026-0001'],
      opportunityId: oppIds.opp001,
      quotationId: quotIds.qt001,
      status: 'completed',
      totalAmount: 452000,
      expectedDeliveryDate: new Date('2026-03-10'),
      notes: 'Delivered and installed. All 13 units commissioned. Customer sign-off received. Warranty cards issued.',
      createdById: salesperson.id,
    },
  });

  await prisma.orderItem.createMany({
    data: [
      { orderId: order1.id, productName: 'Oxycure AP-2000 HEPA Air Purifier', description: 'ICU-grade, HEPA H14', quantity: 3, unitPrice: 45000, totalPrice: 135000, sortOrder: 1 },
      { orderId: order1.id, productName: 'Oxycure AP-800 Air Purifier', description: 'General ward grade, HEPA H13', quantity: 10, unitPrice: 17574, totalPrice: 175740, sortOrder: 2 },
      { orderId: order1.id, productName: 'Wall Mounting Brackets (ICU)', description: 'Hospital-grade brackets', quantity: 3, unitPrice: 800, totalPrice: 2400, sortOrder: 3 },
      { orderId: order1.id, productName: 'Installation & Commissioning', description: 'On-site installation and staff training', quantity: 1, unitPrice: 25000, totalPrice: 25000, sortOrder: 4 },
    ],
  });

  // ORD-002 — Apollo Clinic (in_progress — units procured, delivery scheduled)
  const order2 = await prisma.order.upsert({
    where: { orderNumber: 'ORD-2026-002' },
    update: {},
    create: {
      orderNumber: 'ORD-2026-002',
      customerId: customerIds.clinic,
      leadId: leadIds['LD-2026-0002'],
      opportunityId: oppIds.opp002,
      quotationId: quotIds.qt002,
      status: 'in_progress',
      totalAmount: 318000,
      expectedDeliveryDate: new Date('2026-04-25'),
      notes: 'Units procured from warehouse. Delivery and installation scheduled for 25 April. AMC agreement signed.',
      createdById: salesperson2.id,
    },
  });

  await prisma.orderItem.createMany({
    data: [
      { orderId: order2.id, productName: 'Oxycure AP-500 Air Purifier', description: 'Clinic-grade, HEPA H13 + UV-C', quantity: 5, unitPrice: 19800, totalPrice: 99000, sortOrder: 1 },
      { orderId: order2.id, productName: 'Oxycure AP-300 Lab Purifier', description: 'HEPA H12 + carbon layer', quantity: 1, unitPrice: 12600, totalPrice: 12600, sortOrder: 2 },
      { orderId: order2.id, productName: 'Annual Maintenance Contract (AMC)', description: '1-year AMC, 2 visits', quantity: 1, unitPrice: 42480, totalPrice: 42480, sortOrder: 3 },
      { orderId: order2.id, productName: 'HEPA Filter Replacement Set', description: 'OEM filters for year-1 replacement', quantity: 1, unitPrice: 14160, totalPrice: 14160, sortOrder: 4 },
    ],
  });

  console.log('✅ 2 orders created (1 completed, 1 in-progress)');
}
