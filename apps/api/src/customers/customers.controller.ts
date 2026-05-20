import { Controller, Get, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.findAll({
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details with order history' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Update customer details' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, string>) {
    return this.customersService.update(id, body);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: "Get customer's orders" })
  getOrders(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.getOrders(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get customer timeline (all interactions)' })
  getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.getTimeline(id);
  }
}
