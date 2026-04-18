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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DesignSpecsService } from './design-specs.service';
import {
  CreateDesignSpecDto,
  UpdateDesignSpecDto,
  UpdateDesignSpecStatusDto,
  CreateQuotationFromSpecDto,
  DesignSpecFilterDto,
} from './dto/design-spec.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type RequestUser = { id: string; role: UserRole; firstName: string; lastName: string };

@ApiTags('Design Specifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('design-specs')
export class DesignSpecsController {
  constructor(private service: DesignSpecsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my assigned design specs (design engineers)' })
  getMyQueue(@CurrentUser() user: RequestUser) {
    return this.service.getMyQueue(user);
  }

  @Get('pending')
  @Roles(UserRole.admin, UserRole.manager)
  @ApiOperation({ summary: 'Get specs pending review (managers)' })
  getPending() {
    return this.service.getPending();
  }

  @Get()
  @ApiOperation({ summary: 'List all design specs with filters' })
  findAll(
    @Query() filters: DesignSpecFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findAll(filters, user);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Request a design spec for a qualified lead' })
  create(
    @Body() dto: CreateDesignSpecDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get design spec detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update design spec (add recommendations, BOM, etc.)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignSpecDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change design spec status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignSpecStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateStatus(id, dto, user);
  }

  @Post(':id/create-quotation')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create quotation from approved design spec' })
  createQuotationFromSpec(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuotationFromSpecDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createQuotationFromSpec(id, dto, user);
  }
}
