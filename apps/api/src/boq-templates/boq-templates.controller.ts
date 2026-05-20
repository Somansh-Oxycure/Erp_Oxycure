import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BoQTemplatesService } from './boq-templates.service';
import { CreateBoQTemplateDto } from './dto/create-boq-template.dto';
import { UpdateBoQTemplateDto } from './dto/update-boq-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('BoQ Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('boq-templates')
export class BoQTemplatesController {
  constructor(private boqTemplatesService: BoQTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active BoQ product templates' })
  findAll(@Query('all') all?: string) {
    if (all === 'true') {
      return this.boqTemplatesService.findAllAdmin();
    }
    return this.boqTemplatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single BoQ template with its full component list' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.boqTemplatesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Create a new BoQ product template (admin only)' })
  create(@Body() dto: CreateBoQTemplateDto) {
    return this.boqTemplatesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Update a BoQ template (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBoQTemplateDto,
  ) {
    return this.boqTemplatesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Deactivate a BoQ template — never hard-deletes (admin only)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.boqTemplatesService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Reactivate a previously deactivated BoQ template (admin only)' })
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.boqTemplatesService.reactivate(id);
  }

  // FUTURE: Add GET /boq-templates/:id/export endpoint for structured JSON export
}
