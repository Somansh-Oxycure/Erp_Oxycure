import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/product-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Product Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly service: ProductCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get category tree (root categories with children)' })
  findAll() {
    return this.service.findAll();
  }

  @Get('flat')
  @ApiOperation({ summary: 'Get all categories as a flat list' })
  findFlat() {
    return this.service.findFlat();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single category by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a product category' })
  create(@Body() dto: CreateProductCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a product category' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a product category (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
