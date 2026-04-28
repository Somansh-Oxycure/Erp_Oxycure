import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seed/users';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Seeding Oxycure ERP database...\n');

  await seedUsers(prisma);

  console.log('\n✅ Users seeded.\n');
  console.log('📋 Login Credentials:');
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
