import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/** @deprecated — Replaced by /tickets. */
@ApiTags('leads')
@Controller('leads')
export class LeadsController {}
