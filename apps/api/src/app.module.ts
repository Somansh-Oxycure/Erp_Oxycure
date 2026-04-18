import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { CustomersModule } from './customers/customers.module';
import { DesignSpecsModule } from './design-specs/design-specs.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { QuotationsModule } from './quotations/quotations.module';
import { OrdersModule } from './orders/orders.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    CustomersModule,
    DesignSpecsModule,
    OpportunitiesModule,
    QuotationsModule,
    OrdersModule,
    AuditModule,
  ],
})
export class AppModule {}
