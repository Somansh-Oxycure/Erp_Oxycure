import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
  Res, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StockService } from './stock.service';
import { AdjustStockDto, SetOpeningStockDto, StockQueryDto } from './dto/stock.dto';

@ApiTags('Stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.stockService.getStats();
  }

  @Get('export')
  async exportCsv(@Res() res: Response) {
    const csv = await this.stockService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="stock-export.csv"');
    res.send(csv);
  }

  @Post('import')
  @Roles('admin', 'manager')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are accepted');
    }
    return this.stockService.importCsv(file.buffer, user.id);
  }

  @Post('opening')
  @Roles('admin', 'manager')
  setOpening(@Body() dto: SetOpeningStockDto & { productId: string }, @CurrentUser() user: { id: string }) {
    return this.stockService.setOpening(dto.productId, dto, user.id);
  }

  @Get(':productId')
  findOne(@Param('productId') productId: string) {
    return this.stockService.findOne(productId);
  }

  @Get(':productId/transactions')
  getTransactions(@Param('productId') productId: string) {
    return this.stockService.getTransactions(productId);
  }

  @Post(':productId/opening')
  @Roles('admin', 'manager')
  setOpeningForProduct(
    @Param('productId') productId: string,
    @Body() dto: SetOpeningStockDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.stockService.setOpening(productId, dto, user.id);
  }

  @Post(':productId/adjust')
  @Roles('admin', 'manager')
  adjust(
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.stockService.adjust(productId, dto, user.id);
  }

}

