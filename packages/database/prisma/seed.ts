import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seed/users';
import { seedLeads } from './seed/leads';
import { seedCustomers } from './seed/customers';
import { seedOpportunities } from './seed/opportunities';
import { seedDesignSpecs } from './seed/design-specs';
import { seedQuotations } from './seed/quotations';
import { seedOrders } from './seed/orders';

const prisma = new PrismaClient();

// ============================================================
//  SEED ORCHESTRATOR — Consistent business flow
//
//  Lead → Qualify → Opportunity → Design Spec
//       → Customer → Quotation  → Order
// ============================================================

async function main() {
  console.log('\n🌱 Seeding Oxycure ERP database...\n');

  // Step 1 — Users (must be first, everything else references users)
  const users = await seedUsers(prisma);

  // Step 2 — Leads (requires users)
  const leadIds = await seedLeads(prisma, users);

  // Step 3 — Customers (only from won/quoted leads)
  const customerIds = await seedCustomers(prisma, users, leadIds);

  // Step 4 — Opportunities (only from qualified/quoted/won/lost leads)
  const oppIds = await seedOpportunities(prisma, users, leadIds, customerIds);

  // Step 5 — Design Specs (only for qualified/quoted/won leads)
  const specIds = await seedDesignSpecs(prisma, users, leadIds, customerIds);

  // Step 6 — Quotations (only from approved/completed design specs)
  const quotIds = await seedQuotations(prisma, users, leadIds, customerIds, oppIds, specIds);

  // Step 7 — Orders (only from accepted quotations)
  await seedOrders(prisma, users, leadIds, customerIds, oppIds, quotIds);

  console.log('\n🎉 Database seeding complete!\n');
  console.log('📊 Summary:');
  console.log('   Users:          5  (admin, manager, 2x salesperson, designer)');
  console.log('   Leads:          17 (2 won, 1 quoted, 7 qualified, 3 contacted, 1 lost, 3 new)');
  console.log('   Customers:      3  (2 converted from won leads, 1 prospect from quoted lead)');
  console.log('   Opportunities:  11 (2 closed_won, 1 negotiation, 2 proposal, 3 discovery, 2 prospect, 1 closed_lost)');
  console.log('   Design Specs:   5  (2 approved, 1 completed, 1 in-progress, 1 requested)');
  console.log('   Quotations:     3  (2 accepted, 1 sent/in-negotiation)');
  console.log('   Orders:         2  (1 completed, 1 in-progress)');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin:    admin@oxycure.com    / Admin@2026');
  console.log('   Manager:  manager@oxycure.com  / Manager@2026');
  console.log('   Sales:    sales@oxycure.com    / Sales@2026');
  console.log('   Sales2:   sales2@oxycure.com   / Sales2@2026');
  console.log('   Design:   design@oxycure.com   / Design@2026\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
