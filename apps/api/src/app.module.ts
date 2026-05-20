import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { CustomersModule } from './customers/customers.module';
import { QuotationsModule } from './quotations/quotations.module';
import { OrdersModule } from './orders/orders.module';
import { AuditModule } from './audit/audit.module';
import { ProposalsModule } from './proposals/proposals.module';
import { UnitsModule } from './units/units.module';
import { BoQTemplatesModule } from './boq-templates/boq-templates.module';
import { BoQModule } from './boq/boq.module';
import { ProductsModule } from './products/products.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { StockModule } from './stock/stock.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { AlertsModule } from './alerts/alerts.module';
import { StockTransferModule } from './stock-transfer/stock-transfer.module';
import { BackupModule } from './backup/backup.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TicketsModule,
    CustomersModule,
    QuotationsModule,
    OrdersModule,
    AuditModule,
    ProposalsModule,
    UnitsModule,
    BoQTemplatesModule,
    BoQModule,
    ProductsModule,
    ProductCategoriesModule,
    StockModule,
    SuppliersModule,
    PurchaseOrdersModule,
    AlertsModule,
    StockTransferModule,
    BackupModule,
    DashboardModule,
  ],
})
export class AppModule {}
