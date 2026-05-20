import { PrismaClient } from '@prisma/client';

export async function seedUnits(prisma: PrismaClient) {
  const units = [
    {
      name: 'BIPOLAR',
      description:
        'Particles like dust, dander, smoke and even viruses and bacteria all can be suspended in the air we breathe. Our patented needlepoint bipolar ionization technology creates and releases ions into the airstream using your existing HVAC system as the delivery method. When these ions disperse throughout a space, they seek out and form bonds with particles in the air through agglomeration, creating a snowball effect that makes it easier for your system to filter them out.',
      price: null,
    },
    {
      name: 'REME Cell (For TFA)',
      description:
        'Reflective Electro Magnetic Energy (REME) utilizes an electromagnetic energy cell to create Ionized-Hydro-Peroxides, friendly oxidizer plasma made from oxygen and humidity. The purifying plasma is propelled into the HVAC duct or plenum by a silent plasma propulsion module with no moving parts. Photo hydro ionization (PHI) cell based on advanced oxidation technology with broad spectrum UV tube enclosed by Quad metallic catalyst, enhancing the formation of Hydroxyl, superoxide ions and hydrogen peroxide. REME has the added advantage of Bi-Polar Ionization, making it effective over Particulate Matter. Micro-Organisms can be reduced by over 99%.',
      price: null,
    },
    {
      name: 'ELECTRO STATIC PRECIPITATION FILTER / ELECTRONIC AIR CLEANER (EAC)',
      description:
        'Improves indoor air quality by reducing harmful pollutants like PM2.5, allergens, pollen, smoke, bacteria, and pathogens based on Electrostatic Precipitation technology. Improves Indoor Air Quality (IAQ) by reducing bacteria, viruses and mold that either grow or pass through air handling systems.',
      price: null,
    },
    {
      name: 'IAQ Monitor',
      description:
        'IAQ Monitor to measure parameters like PM2.5, VOCs, CO2, Temperature, formaldehyde and Humidity on a real-time basis. The IAQ Monitor is RS485 enabled and capable of connecting with Wi-Fi. The Monitor displays indoor air quality information and indicates the quality of air.',
      price: null,
    },
    {
      name: 'Maxcure Unit',
      description: 'Pre + Fine + Carbon + HEPA + REME Cell',
      price: null,
    },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: { description: unit.description },
      create: unit,
    });
  }

  console.log(`✅ ${units.length} units seeded.`);
}
