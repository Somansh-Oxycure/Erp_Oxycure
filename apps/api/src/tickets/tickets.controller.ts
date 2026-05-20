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
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  ConvertTicketDto,
  CreateTicketNoteDto,
  TicketFilterDto,
} from './dto/ticket.dto';
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

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get ticket statistics for dashboard' })
  getStats(@CurrentUser() user: RequestUser) {
    return this.ticketsService.getStats(user);
  }

  @Get('duplicates/:phone')
  @ApiOperation({ summary: 'Check if a phone number already exists' })
  checkDuplicate(@Param('phone') phone: string) {
    return this.ticketsService.checkDuplicatePhone(phone);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets with filters and pagination' })
  findAll(
    @Query() filters: TicketFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single ticket with full details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.findOne(id, user);
  }

  @Get(':id/aging')
  @ApiOperation({ summary: 'Get time-in-status aging data for a ticket' })
  getAging(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.getAging(id, user);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Create a new ticket' })
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson, UserRole.service_engineer)
  @ApiOperation({ summary: 'Update ticket details or status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.update(id, dto, user);
  }

  @Patch(':id/assign')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Assign ticket to a salesperson' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.assign(id, dto, user);
  }

  @Post(':id/convert')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert ticket to customer' })
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertTicketDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.convert(id, dto, user);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to a ticket' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.addNote(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Delete (soft) a ticket' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ticketsService.remove(id, user);
  }
}
