import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export type Users = {
  admin: { id: string };
  manager: { id: string };
  salesperson: { id: string };
  salesperson2: { id: string };
  designer: { id: string };
};

export async function seedUsers(prisma: PrismaClient): Promise<Users> {
  const [adminPwd, managerPwd, salesPwd, sales2Pwd, designPwd] = await Promise.all([
    bcrypt.hash('Admin@2026', 12),
    bcrypt.hash('Manager@2026', 12),
    bcrypt.hash('Sales@2026', 12),
    bcrypt.hash('Sales2@2026', 12),
    bcrypt.hash('Design@2026', 12),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@oxycure.com' },
    update: {},
    create: {
      employeeId: 'EMP-001',
      firstName: 'Oxycure',
      lastName: 'Admin',
      email: 'admin@oxycure.com',
      phone: '9999999999',
      passwordHash: adminPwd,
      role: 'admin',
      department: 'admin',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@oxycure.com' },
    update: {},
    create: {
      employeeId: 'EMP-002',
      firstName: 'Rajesh',
      lastName: 'Sharma',
      email: 'manager@oxycure.com',
      phone: '9888888888',
      passwordHash: managerPwd,
      role: 'manager',
      department: 'sales',
    },
  });

  const salesperson = await prisma.user.upsert({
    where: { email: 'sales@oxycure.com' },
    update: {},
    create: {
      employeeId: 'EMP-003',
      firstName: 'Priya',
      lastName: 'Patel',
      email: 'sales@oxycure.com',
      phone: '9777777777',
      passwordHash: salesPwd,
      role: 'salesperson',
      department: 'sales',
    },
  });

  const salesperson2 = await prisma.user.upsert({
    where: { email: 'sales2@oxycure.com' },
    update: {},
    create: {
      employeeId: 'EMP-005',
      firstName: 'Rahul',
      lastName: 'Desai',
      email: 'sales2@oxycure.com',
      phone: '9555555555',
      passwordHash: sales2Pwd,
      role: 'salesperson',
      department: 'sales',
    },
  });

  const designer = await prisma.user.upsert({
    where: { email: 'design@oxycure.com' },
    update: {},
    create: {
      employeeId: 'EMP-004',
      firstName: 'Arjun',
      lastName: 'Nair',
      email: 'design@oxycure.com',
      phone: '9666666666',
      passwordHash: designPwd,
      role: 'design_engineer',
      department: 'design',
    },
  });

  console.log('✅ 5 users created');
  return { admin, manager, salesperson, salesperson2, designer };
}
