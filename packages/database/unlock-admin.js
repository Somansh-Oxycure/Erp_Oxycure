// Set DATABASE_URL fallback so this script works without a .env file
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://oxycure:oxycure_secret_2026@localhost:5433/oxycure_erp?schema=public';
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'admin@oxycure.com' },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  console.log('Unlocked:', user.email, '| failedAttempts:', user.failedLoginAttempts, '| lockedUntil:', user.lockedUntil);
}

main().catch(console.error).finally(() => prisma.$disconnect());
