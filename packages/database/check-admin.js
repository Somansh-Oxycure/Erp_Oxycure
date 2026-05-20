const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@oxycure.com' } });
  if (!user) { console.log('User NOT FOUND'); return; }
  console.log('email:', user.email);
  console.log('isActive:', user.isActive);
  console.log('failedAttempts:', user.failedLoginAttempts);
  console.log('lockedUntil:', user.lockedUntil);
  const valid = await bcrypt.compare('Admin@2026', user.passwordHash);
  console.log('Password Admin@2026 valid:', valid);
}

main().catch(console.error).finally(() => prisma.$disconnect());
