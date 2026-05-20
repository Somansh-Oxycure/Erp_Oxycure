import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe,
  Res, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List/search products with pagination' })
  findAll(@Query() query: QueryProductDto) {
    return this.service.findAll(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all products as CSV' })
  async exportCsv(@Res() res: Response) {
    const csv = await this.service.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products-export.csv"');
    res.send(csv);
  }

  @Post('import')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Import products from CSV (new productCodes only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are accepted');
    }
    return this.service.importCsv(file.buffer);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get distinct list of all brands in catalog' })
  getBrands() {
    return this.service.getBrands();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get distinct list of all category names in catalog' })
  getCategories() {
    return this.service.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single product with full specs' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Post(':id/duplicate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Duplicate a product (creates a draft copy)' })
  duplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.duplicate(id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a product (includes full spec replacement if provided)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a product (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
