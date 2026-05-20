import { Module } from '@nestjs/common';
import { BoQController } from './boq.controller';
import { BoQService } from './boq.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [BoQController],
  providers: [BoQService],
  exports: [BoQService],
})
export class BoQModule {}
