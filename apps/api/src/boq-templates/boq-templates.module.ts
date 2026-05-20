import { Module } from '@nestjs/common';
import { BoQTemplatesController } from './boq-templates.controller';
import { BoQTemplatesService } from './boq-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BoQTemplatesController],
  providers: [BoQTemplatesService],
  exports: [BoQTemplatesService],
})
export class BoQTemplatesModule {}
