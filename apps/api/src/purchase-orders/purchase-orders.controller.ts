import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto, UpdatePurchaseOrderDto, ReceiveGoodsDto,
} from './dto/purchase-order.dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.purchaseOrdersService.findAll(status, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: { id: string }) {
    return this.purchaseOrdersService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.purchaseOrdersService.update(id, dto);
  }

  @Patch(':id/send')
  @Roles('admin', 'manager')
  markSent(@Param('id') id: string) {
    return this.purchaseOrdersService.markSent(id);
  }

  @Patch(':id/cancel')
  @Roles('admin', 'manager')
  cancel(@Param('id') id: string) {
    return this.purchaseOrdersService.cancel(id);
  }

  @Post(':id/receive')
  @Roles('admin', 'manager')
  receiveGoods(@Param('id') id: string, @Body() dto: ReceiveGoodsDto, @CurrentUser() user: { id: string }) {
    return this.purchaseOrdersService.receiveGoods(id, dto, user.id);
  }
}
