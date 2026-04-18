import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';
import {
  CreateOpportunityDto,
  UpdateOpportunityDto,
  UpdateOpportunityStageDto,
  OpportunityFilterDto,
} from './dto/opportunity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type RequestUser = { id: string; role: UserRole };

@ApiTags('Opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private service: OpportunitiesService) {}

  @Get('pipeline')
  @ApiOperation({ summary: 'Get pipeline data grouped by stage (Kanban)' })
  getPipeline(@CurrentUser() user: RequestUser) {
    return this.service.getPipelineData(user);
  }

  @Get()
  @ApiOperation({ summary: 'List opportunities' })
  findAll(@Query() filters: OpportunityFilterDto, @CurrentUser() user: RequestUser) {
    return this.service.findAll(filters, user);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Create opportunity' })
  create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update opportunity' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Move opportunity to a different pipeline stage' })
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpportunityStageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateStage(id, dto, user);
  }
}
