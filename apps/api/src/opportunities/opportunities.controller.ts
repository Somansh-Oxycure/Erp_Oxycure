import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/** @deprecated — Replaced by /tickets. */
@ApiTags('opportunities')
@Controller('opportunities')
export class OpportunitiesController {}
