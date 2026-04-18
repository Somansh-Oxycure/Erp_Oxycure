import { PrismaClient } from '@prisma/client';
import { Users } from './users';
import { LeadIds } from './leads';
import { CustomerIds } from './customers';

// ============================================================
//  DESIGN SPECIFICATIONS — Only for qualified/quoted/won leads
//
//  LD-001 (won)       → DS-001  approved   (linked to quotation later)
//  LD-002 (won)       → DS-002  approved   (linked to quotation later)
//  LD-003 (quoted)    → DS-003  completed  (linked to quotation later)
//  LD-004 (qualified) → DS-004  in_progress
//  LD-005 (qualified) → DS-005  requested  (site visit not yet done)
// ============================================================

export type DesignSpecIds = {
  ds001: string;
  ds002: string;
  ds003: string;
  ds004: string;
  ds005: string;
};

export async function seedDesignSpecs(
  prisma: PrismaClient,
  users: Users,
  leadIds: LeadIds,
  customerIds: CustomerIds,
): Promise<DesignSpecIds> {
  const { manager, salesperson, salesperson2, designer } = users;

  // DS-001 — Medicare Hospital (approved, full design done)
  const ds001 = await prisma.designSpecification.upsert({
    where: { specNumber: 'DS-2026-001' },
    update: {},
    create: {
      specNumber: 'DS-2026-001',
      leadId: leadIds['LD-2026-0001'],
      customerId: customerIds.hospital,
      status: 'approved',
      productType: 'air_purifier',
      requirementSummary: 'Hospital-grade HEPA filtration for ICU and general wards. Minimum MERV-16 rating. Silent operation mandatory.',
      siteAreaSqft: 8000,
      siteType: 'Hospital',
      siteEnvironment: 'High-risk medical environment. Strict infection control. Continuous operation required.',
      powerAvailability: '3-phase 415V. Adequate power points confirmed in all wards.',
      specialRequirements: 'ICU units must operate below 30dB. UPS backup required for ICU units.',
      siteInspectionDone: true,
      siteInspectionDate: new Date('2026-01-20'),
      siteInspectionById: designer.id,
      siteInspectionNotes: 'All 3 ICU wards and 10 general wards inspected. Power outlets confirmed. Ceiling height 10ft throughout.',
      recommendedProducts: [
        { model: 'AP-2000', qty: 3, location: 'ICU Wards', notes: 'Wall-mount at 7ft height' },
        { model: 'AP-800', qty: 10, location: 'General Wards', notes: 'Floor stand' },
      ],
      configurationNotes: 'ICU units: wall-mounted at 7ft, directional airflow away from patient beds. General ward: floor stands near windows.',
      technicalSpecs: 'AP-2000: HEPA H14, CADR 2000 m³/h, noise <28dB. AP-800: HEPA H13, CADR 800 m³/h, noise <35dB.',
      bomItems: [
        { item: 'AP-2000 Unit', qty: 3, unitCost: 45000 },
        { item: 'AP-800 Unit', qty: 10, unitCost: 18500 },
        { item: 'Wall Mounting Brackets', qty: 3, unitCost: 800 },
        { item: 'Installation & Commissioning', qty: 1, unitCost: 25000 },
      ],
      estimatedCost: 430000,
      designedById: designer.id,
      reviewedById: manager.id,
      approvedAt: new Date('2026-02-01'),
      createdById: salesperson.id,
    },
  });

  // DS-002 — Apollo Clinic (approved, full design done)
  const ds002 = await prisma.designSpecification.upsert({
    where: { specNumber: 'DS-2026-002' },
    update: {},
    create: {
      specNumber: 'DS-2026-002',
      leadId: leadIds['LD-2026-0002'],
      customerId: customerIds.clinic,
      status: 'approved',
      productType: 'air_purifier',
      requirementSummary: 'Clinic-grade air purification. Reception, 3 consultation rooms, lab. Aesthetic units preferred.',
      siteAreaSqft: 2500,
      siteType: 'Clinic',
      siteEnvironment: 'Medical clinic. Moderate risk. Patient-facing areas need odor and pathogen control.',
      powerAvailability: 'Single-phase 230V at each room. Power points available.',
      specialRequirements: 'Units must be visually minimal. White or grey preferred to match clinic interior.',
      siteInspectionDone: true,
      siteInspectionDate: new Date('2026-02-18'),
      siteInspectionById: designer.id,
      siteInspectionNotes: 'Reception 400 sqft, each consultation room ~180 sqft, lab 350 sqft. All rooms measured.',
      recommendedProducts: [
        { model: 'AP-500', qty: 5, location: 'Consultation Rooms & Reception', notes: 'Table-top / floor-stand' },
        { model: 'AP-300', qty: 1, location: 'Lab', notes: 'Wall-mount near fume source' },
      ],
      configurationNotes: 'AP-500 in each consultation room and reception. AP-300 in lab for chemical odor control.',
      technicalSpecs: 'AP-500: HEPA H13, CADR 500 m³/h, UV-C lamp. AP-300: HEPA H12, activated carbon layer.',
      bomItems: [
        { item: 'AP-500 Unit', qty: 5, unitCost: 22000 },
        { item: 'AP-300 Unit', qty: 1, unitCost: 14000 },
        { item: 'Annual Maintenance Contract', qty: 1, unitCost: 36000 },
        { item: 'HEPA Filter Set (Spare)', qty: 1, unitCost: 12000 },
      ],
      estimatedCost: 270000,
      designedById: designer.id,
      reviewedById: manager.id,
      approvedAt: new Date('2026-02-25'),
      createdById: salesperson2.id,
    },
  });

  // DS-003 — Green Builders HVAC (completed, awaiting final sign-off after quotation sent)
  const ds003 = await prisma.designSpecification.upsert({
    where: { specNumber: 'DS-2026-003' },
    update: {},
    create: {
      specNumber: 'DS-2026-003',
      leadId: leadIds['LD-2026-0003'],
      customerId: customerIds.builder,
      status: 'completed',
      productType: 'hvac',
      requirementSummary: 'Full HVAC design for 50,000 sqft commercial complex. Mixed occupancy — ground floor retail, 4 floors office.',
      siteAreaSqft: 50000,
      siteType: 'Commercial Complex',
      siteEnvironment: 'Mixed use. Ground floor retail with high footfall. Office floors with standard occupancy.',
      powerAvailability: '3-phase 1000kVA transformer on site. Dedicated HVAC distribution board planned.',
      specialRequirements: 'LEED Silver certification compliance. Variable speed drives on all AHUs. BMS integration.',
      siteInspectionDone: true,
      siteInspectionDate: new Date('2026-03-05'),
      siteInspectionById: designer.id,
      siteInspectionNotes: 'Full site survey completed. Architect drawings reviewed. Rooftop space confirmed for AHUs.',
      recommendedProducts: [
        { model: 'HVAC-AHU-5T', qty: 4, location: 'Rooftop', notes: 'One per floor zone' },
        { model: 'Duct Network', qty: 1, location: 'All Floors', notes: 'Complete ductwork' },
        { model: 'BMS Controller', qty: 1, location: 'Server Room', notes: 'Central control' },
      ],
      configurationNotes: '4-zone system. Each floor on independent control via BMS. Energy recovery units on exhaust.',
      technicalSpecs: 'Total cooling load: 220TR. VRF + AHU combination. EER ≥ 3.5. VSD on all fans.',
      bomItems: [
        { item: 'HVAC AHU 5-Ton', qty: 4, unitCost: 320000 },
        { item: 'Duct Network & Distribution', qty: 1, unitCost: 450000 },
        { item: 'BMS Integration & Controls', qty: 1, unitCost: 120000 },
        { item: '5-Year AMC', qty: 1, unitCost: 250000 },
      ],
      estimatedCost: 2100000,
      designedById: designer.id,
      reviewedById: manager.id,
      createdById: salesperson.id,
    },
  });

  // DS-004 — TechCorp Industries (in_progress, site survey done)
  const ds004 = await prisma.designSpecification.upsert({
    where: { specNumber: 'DS-2026-004' },
    update: {},
    create: {
      specNumber: 'DS-2026-004',
      leadId: leadIds['LD-2026-0004'],
      status: 'in_progress',
      productType: 'industrial_solution',
      requirementSummary: 'Industrial air scrubbing for heavy-dust metal fabrication plant. 25,000 sqft. Continuous 24/7 operation.',
      siteAreaSqft: 25000,
      siteType: 'Manufacturing Plant',
      siteEnvironment: 'Metal fabrication, welding, grinding. PM2.5 levels measured at ~850 µg/m³. Explosive dust zones present.',
      powerAvailability: '3-phase 415V. Dedicated industrial circuit available. DG backup on site.',
      specialRequirements: 'Explosion-proof rating (ATEX) needed for Zone 1 welding area. 24/7 uninterrupted operation.',
      siteInspectionDone: true,
      siteInspectionDate: new Date('2026-04-02'),
      siteInspectionById: designer.id,
      siteInspectionNotes: '4 production zones mapped. Dust concentration measured. Zone 1 identified as explosion-risk.',
      designedById: designer.id,
      estimatedCost: 1100000,
      createdById: salesperson.id,
    },
  });

  // DS-005 — IISc Research Labs (requested, site visit not done yet)
  const ds005 = await prisma.designSpecification.upsert({
    where: { specNumber: 'DS-2026-005' },
    update: {},
    create: {
      specNumber: 'DS-2026-005',
      leadId: leadIds['LD-2026-0005'],
      status: 'requested',
      productType: 'industrial_solution',
      requirementSummary: 'ISO Class 5 cleanroom filtration for 2 biology labs. ISO Class 7 for 3 chemistry labs. Laminar flow required.',
      siteAreaSqft: 5000,
      siteType: 'Research Laboratory',
      siteEnvironment: 'Government research institute. Biology and chemistry labs. Zero contamination tolerance.',
      powerAvailability: 'Dedicated lab UPS circuits available. Clean power ensured.',
      specialRequirements: 'ISO 14644-1 Class 5 for biology labs. Class 7 for chemistry. All materials must be non-reactive.',
      siteInspectionDone: false,
      createdById: manager.id,
    },
  });

  console.log('✅ 5 design specs created (2 approved, 1 completed, 1 in-progress, 1 requested)');
  return {
    ds001: ds001.id,
    ds002: ds002.id,
    ds003: ds003.id,
    ds004: ds004.id,
    ds005: ds005.id,
  };
}
