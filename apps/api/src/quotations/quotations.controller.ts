import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';
import { QuotationsService, CreateQuotationDto } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private quotationsService: QuotationsService) {}

  @Get()
  @ApiOperation({ summary: 'List quotations' })
  findAll(
    @Query('customerId') customerId?: string,
    @Query('status') status?: QuotationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quotationsService.findAll(customerId, status, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.quotationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quotation' })
  create(@Body() dto: CreateQuotationDto, @CurrentUser() user: { id: string }) {
    return this.quotationsService.create(dto, user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update quotation status' })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: QuotationStatus) {
    return this.quotationsService.updateStatus(id, status);
  }
}
