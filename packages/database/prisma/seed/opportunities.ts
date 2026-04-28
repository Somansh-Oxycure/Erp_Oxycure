import { PrismaClient } from '@prisma/client';
import { Users } from './users';
import { LeadIds } from './leads';
import { CustomerIds } from './customers';

// ============================================================
//  OPPORTUNITIES � Only from qualified/quoted/won/lost leads
//
//  LD-001 (won)       ? OPP-001  closed_won
//  LD-002 (won)       ? OPP-002  closed_won
//  LD-003 (quoted)    ? OPP-003  negotiation
//  LD-004 (qualified) ? OPP-004  proposal
//  LD-005 (qualified) ? OPP-005  discovery
//  LD-009 (lost)      ? OPP-007  closed_lost
//  LD-013 (qualified) ? OPP-008  discovery
//  LD-014 (qualified) ? OPP-009  prospect
//  LD-015 (qualified) ? OPP-010  proposal
//  LD-016 (qualified) ? OPP-011  prospect
//  LD-017 (qualified) ? OPP-012  discovery
// ============================================================

export type OpportunityIds = {
  opp001: string;
  opp002: string;
  opp003: string;
  opp004: string;
  opp005: string;
  opp007: string;
  opp008: string;
  opp009: string;
  opp010: string;
  opp011: string;
  opp012: string;
};

export async function seedOpportunities(
  prisma: PrismaClient,
  users: Users,
  leadIds: LeadIds,
  customerIds: CustomerIds,
): Promise<OpportunityIds> {
  const { manager, salesperson, salesperson2 } = users;

  const opp001 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-001' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-001',
      leadId: leadIds['LD-2026-0001'],
      customerId: customerIds.hospital,
      title: 'Medicare Hospital � Air Purifier Package (ICU + General Wards)',
      stage: 'closed_won',
      dealValue: 452000,
      probability: 100,
      expectedCloseDate: new Date('2026-02-28'),
      actualCloseDate: new Date('2026-02-20'),
      notes: 'Full hospital package � 13 units across 3 ICU and 10 general wards. Smooth close.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp002 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-002' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-002',
      leadId: leadIds['LD-2026-0002'],
      customerId: customerIds.clinic,
      title: 'Apollo Clinic � Air Purifier System (6 Units)',
      stage: 'closed_won',
      dealValue: 318000,
      probability: 100,
      expectedCloseDate: new Date('2026-03-15'),
      actualCloseDate: new Date('2026-03-05'),
      notes: 'Referral lead from Medicare Hospital. Quick close. 6 AP-500 units + AMC.',
      assignedToId: salesperson2.id,
      createdById: manager.id,
    },
  });

  const opp003 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-003' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-003',
      leadId: leadIds['LD-2026-0003'],
      customerId: customerIds.builder,
      title: 'Green Builders � Commercial Complex HVAC (50,000 sqft)',
      stage: 'proposal',
      dealValue: 2450000,
      probability: 75,
      expectedCloseDate: new Date('2026-05-10'),
      notes: 'Quotation sent and reviewed. Client negotiating final price. Consultant approved spec.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp004 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-004' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-004',
      leadId: leadIds['LD-2026-0004'],
      title: 'TechCorp Industries � Industrial Scrubber System',
      stage: 'proposal',
      dealValue: 1250000,
      probability: 55,
      expectedCloseDate: new Date('2026-06-01'),
      notes: 'Design spec in progress. Factory site survey done. Draft quotation being prepared.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp005 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-005' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-005',
      leadId: leadIds['LD-2026-0005'],
      title: 'IISc Research Labs � High-Spec Cleanroom Air Handling',
      stage: 'design',
      dealValue: 1800000,
      probability: 30,
      expectedCloseDate: new Date('2026-08-15'),
      notes: 'Government institution. Long procurement cycle. Design spec requested but site visit pending.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp007 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-007' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-007',
      leadId: leadIds['LD-2026-0009'],
      title: 'Kulkarni Pharmaceuticals � Pharma Clean Room (Lost)',
      stage: 'closed_lost',
      dealValue: 900000,
      probability: 0,
      expectedCloseDate: new Date('2026-03-31'),
      actualCloseDate: new Date('2026-03-28'),
      lostReason: 'Budget deferred to next financial year. Revisit in Q3 2026.',
      notes: 'Discovery done, design spec requested but not started. Client deferred budget.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp008 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-008' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-008',
      leadId: leadIds['LD-2026-0013'],
      title: 'Fortis Hospital Delhi � New Wing Air Purification',
      stage: 'design',
      dealValue: 780000,
      probability: 35,
      expectedCloseDate: new Date('2026-06-30'),
      notes: 'New wing inauguration in July. Site visit scheduled. Strong referral from Medicare.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp009 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-009' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-009',
      leadId: leadIds['LD-2026-0014'],
      title: 'Hyatt Regency Mumbai � Hotel-Wide Air Quality Upgrade',
      stage: 'design',
      dealValue: 1100000,
      probability: 25,
      expectedCloseDate: new Date('2026-07-15'),
      notes: 'Hotel renovation window is Q3. Met at HospEx. Design team to do site visit next month.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp010 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-010' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-010',
      leadId: leadIds['LD-2026-0015'],
      title: 'Reliance Industries � Warehouse Industrial Air Handling (3 Sites)',
      stage: 'proposal',
      dealValue: 3200000,
      probability: 60,
      expectedCloseDate: new Date('2026-06-01'),
      notes: 'Partner referral. Facility head wants demo at Warehouse 1 before committing to all 3 sites. Proposal being drafted.',
      assignedToId: salesperson.id,
      createdById: manager.id,
    },
  });

  const opp011 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-011' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-011',
      leadId: leadIds['LD-2026-0016'],
      title: "St. Xavier's College � Classroom Air Purification (35 Rooms)",
      stage: 'design',
      dealValue: 520000,
      probability: 30,
      expectedCloseDate: new Date('2026-07-01'),
      notes: 'Budget pre-approved by trust. Principal wants installation before new academic year in June.',
      assignedToId: salesperson2.id,
      createdById: salesperson2.id,
    },
  });

  const opp012 = await prisma.opportunity.upsert({
    where: { opportunityNumber: 'OPP-2026-012' },
    update: {},
    create: {
      opportunityNumber: 'OPP-2026-012',
      leadId: leadIds['LD-2026-0017'],
      title: 'Manipal Hospital Bangalore � OT & ICU Air System Replacement',
      stage: 'design',
      dealValue: 650000,
      probability: 40,
      expectedCloseDate: new Date('2026-06-15'),
      notes: 'Referral from Medicare Hospital. Urgent OT air system replacement. Site visit done. Design spec being initiated.',
      assignedToId: salesperson2.id,
      createdById: manager.id,
    },
  });

  console.log('? 11 opportunities created (2 won, 1 negotiation, 2 proposal, 3 discovery, 2 prospect, 1 lost)');
  return {
    opp001: opp001.id,
    opp002: opp002.id,
    opp003: opp003.id,
    opp004: opp004.id,
    opp005: opp005.id,
    opp007: opp007.id,
    opp008: opp008.id,
    opp009: opp009.id,
    opp010: opp010.id,
    opp011: opp011.id,
    opp012: opp012.id,
  };
}
