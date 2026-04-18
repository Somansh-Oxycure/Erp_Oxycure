import { Module } from '@nestjs/common';
import { DesignSpecsService } from './design-specs.service';
import { DesignSpecsController } from './design-specs.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DesignSpecsController],
  providers: [DesignSpecsService],
  exports: [DesignSpecsService],
})
export class DesignSpecsModule {}
