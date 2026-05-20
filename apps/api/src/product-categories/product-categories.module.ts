import { Module } from '@nestjs/common';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService],
  exports: [ProductCategoriesService],
})
export class ProductCategoriesModule {}
