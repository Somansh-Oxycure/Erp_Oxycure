import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus, UserRole } from '@prisma/client';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get orders I created' })
  getMyOrders(@CurrentUser() user: { id: string }) {
    return this.ordersService.getMyOrders(user.id);
  }

  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll({ customerId, status, page: Number(page) || 1, limit: Number(limit) || 20 });
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get order timeline/audit log' })
  getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getTimeline(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Create a new order' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: { id: string }) {
    return this.ordersService.create(dto, user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.admin, UserRole.manager)
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateStatus(id, status);
  }
}
