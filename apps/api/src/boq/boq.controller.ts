import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, BoQStatus } from '@prisma/client';
import { BoQService } from './boq.service';
import { CreateBoQDto } from './dto/create-boq.dto';
import { UpdateBoQDto } from './dto/update-boq.dto';
import { UpdateBoQStatusDto } from './dto/update-boq-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type RequestUser = {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@ApiTags('BoQ')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('boqs')
export class BoQController {
  constructor(private boqService: BoQService) {}

  @Get()
  @ApiOperation({ summary: 'List BoQs (role-scoped like proposals)' })
  findAll(
    @Query('status') status?: BoQStatus,
    @Query('proposalId') proposalId?: string,
    @Query('preparedById') preparedById?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.boqService.findAll({ status, proposalId, preparedById }, user!);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single BoQ with all items' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.boqService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Create a BoQ for a proposal (optionally seed from template)' })
  create(@Body() dto: CreateBoQDto, @CurrentUser() user: RequestUser) {
    return this.boqService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Update a draft BoQ (items, notes)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBoQDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.boqService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Update BoQ status (draft → final → archived)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBoQStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.boqService.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Soft-delete a BoQ by setting status to archived (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.boqService.remove(id, user);
  }

  // FUTURE: Add GET /boqs/:id/export endpoint that returns a structured
  // JSON payload for PDF generation (via a separate PDF microservice).
}
