import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StockTransferService } from './stock-transfer.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ListTransfersDto } from './dto/list-transfers.dto';

@ApiTags('Stock Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock-transfers')
export class StockTransferController {
  constructor(private readonly stockTransferService: StockTransferService) {}

  @Post()
  @Roles('admin', 'manager')
  create(
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.stockTransferService.createTransfer(dto, user.id);
  }

  @Get('stats')
  getStats() {
    return this.stockTransferService.getStats();
  }

  @Get()
  findAll(@Query() query: ListTransfersDto) {
    return this.stockTransferService.listTransfers(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockTransferService.getTransfer(id);
  }

  @Patch(':id/confirm')
  @Roles('admin', 'manager')
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.stockTransferService.confirmTransfer(id, user.id);
  }

  @Patch(':id/cancel')
  @Roles('admin', 'manager')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.stockTransferService.cancelTransfer(id, user.id);
  }
}
