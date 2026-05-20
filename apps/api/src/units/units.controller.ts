import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active units (pass ?all=true for inactive too)' })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  findAll(@Query('all') all?: string) {
    return this.unitsService.findAll(all === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single unit' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new unit' })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a unit (name, description, price, isActive)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }
}
