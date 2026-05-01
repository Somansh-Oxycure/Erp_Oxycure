import { Module } from '@nestjs/common';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { ProposalUploadInterceptor } from './proposal-upload.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalUploadInterceptor],
  exports: [ProposalsService],
})
export class ProposalsModule {}
