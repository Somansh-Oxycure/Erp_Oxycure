import { PrismaClient } from '@prisma/client';
import { Users } from './users';
import { LeadIds } from './leads';

// ============================================================
//  CUSTOMERS — Only created for leads that are "won" or "quoted"
//
//  WON leads  → real customers (converted)
//  QUOTED lead → prospect customer (needed for quotation FK)
// ============================================================

export type CustomerIds = {
  hospital: string;   // LD-001 → Medicare Hospital (won)
  clinic: string;     // LD-002 → Apollo Clinic (won)
  builder: string;    // LD-003 → Green Builders (quoted, prospect)
};

export async function seedCustomers(
  prisma: PrismaClient,
  users: Users,
  leadIds: LeadIds,
): Promise<CustomerIds> {
  const { manager, salesperson, salesperson2 } = users;

  // CUS-001 — Dr. Suresh Kumar / Medicare Hospital (won from LD-001)
  const hospital = await prisma.customer.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      customerNumber: 'CUS-2026-001',
      firstName: 'Dr. Suresh',
      lastName: 'Kumar',
      phone: '9876543210',
      email: 'suresh.kumar@medhospital.com',
      companyName: 'Medicare Multi-Specialty Hospital',
      designation: 'Medical Director',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      customerType: 'hospital',
      leadId: leadIds['LD-2026-0001'],
      createdById: salesperson.id,
    },
  });

  // CUS-002 — Kavitha Reddy / Apollo Clinic (won from LD-002)
  const clinic = await prisma.customer.upsert({
    where: { phone: '9432109876' },
    update: {},
    create: {
      customerNumber: 'CUS-2026-002',
      firstName: 'Kavitha',
      lastName: 'Reddy',
      phone: '9432109876',
      email: 'kavitha@apolloclinic.com',
      companyName: 'Apollo Clinic',
      designation: 'Administrator',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      customerType: 'clinic',
      leadId: leadIds['LD-2026-0002'],
      createdById: salesperson2.id,
    },
  });

  // CUS-003 — Vikram Bose / Green Builders (quoted from LD-003 — prospect)
  const builder = await prisma.customer.upsert({
    where: { phone: '9543210987' },
    update: {},
    create: {
      customerNumber: 'CUS-2026-003',
      firstName: 'Vikram',
      lastName: 'Bose',
      phone: '9543210987',
      email: 'vikram@greenbuilders.com',
      companyName: 'Green Builders Pvt Ltd',
      designation: 'Project Director',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      customerType: 'business',
      leadId: leadIds['LD-2026-0003'],
      createdById: salesperson.id,
    },
  });

  console.log('✅ 3 customers created (2 converted from won leads, 1 prospect from quoted lead)');
  return { hospital: hospital.id, clinic: clinic.id, builder: builder.id };
}
