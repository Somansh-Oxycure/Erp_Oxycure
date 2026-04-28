import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProposalsService } from './proposals.service';
import { ProposalFilterDto, UpdateProposalStatusDto, UpdateProposalDto } from './dto/proposal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type RequestUser = {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@ApiTags('Proposals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private proposalsService: ProposalsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get proposal statistics' })
  getStats(@CurrentUser() user: RequestUser) {
    return this.proposalsService.getStats(user);
  }

  @Get()
  @ApiOperation({ summary: 'List proposals' })
  findAll(@Query() filters: ProposalFilterDto, @CurrentUser() user: RequestUser) {
    return this.proposalsService.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single proposal' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft proposal (items, notes, validity)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.proposalsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update proposal status (send, accept, reject, expire)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.proposalsService.updateStatus(id, dto, user);
  }
}
