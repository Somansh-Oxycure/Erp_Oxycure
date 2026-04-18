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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LeadsService } from './leads.service';
import {
  CreateLeadDto,
  UpdateLeadDto,
  AssignLeadDto,
  ConvertLeadDto,
  CreateLeadNoteDto,
  CreateFollowUpDto,
  LeadFilterDto,
} from './dto/lead.dto';
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

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get lead statistics for dashboard' })
  getStats(@CurrentUser() user: RequestUser) {
    return this.leadsService.getStats(user);
  }

  @Get('today-follow-ups')
  @ApiOperation({ summary: "Get today's follow-ups" })
  getTodayFollowUps(@CurrentUser() user: RequestUser) {
    return this.leadsService.getTodayFollowUps(user);
  }

  @Get('duplicates/:phone')
  @ApiOperation({ summary: 'Check if a phone number already exists' })
  checkDuplicate(@Param('phone') phone: string) {
    return this.leadsService.checkDuplicatePhone(phone);
  }

  @Get()
  @ApiOperation({ summary: 'List leads with filters and pagination' })
  findAll(
    @Query() filters: LeadFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single lead with full details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Create a new lead' })
  create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead details or status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.update(id, dto, user);
  }

  @Patch(':id/assign')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Assign lead to a salesperson' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.assign(id, dto, user);
  }

  @Post(':id/convert')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert lead to customer and create order' })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.convert(id, dto, user);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to a lead' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLeadNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.addNote(id, dto, user.id);
  }

  @Post(':id/follow-ups')
  @ApiOperation({ summary: 'Schedule a follow-up for a lead' })
  createFollowUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFollowUpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.createFollowUp(id, dto, user.id);
  }

  @Patch(':id/follow-ups/:fid')
  @ApiOperation({ summary: 'Update follow-up status/outcome' })
  updateFollowUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fid', ParseUUIDPipe) fid: string,
    @Body() body: { status?: string; outcome?: string },
    @CurrentUser() user: RequestUser,
  ) {
    return this.leadsService.updateFollowUp(id, fid, body, user.id);
  }
}
