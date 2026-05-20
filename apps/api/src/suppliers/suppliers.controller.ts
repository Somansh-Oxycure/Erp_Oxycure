import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, LinkProductSupplierDto } from './dto/supplier.dto';

const SUPPLIER_UPLOAD_DIR = join(process.cwd(), 'uploads', 'suppliers');

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.suppliersService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }

  @Post(':id/upload-cheque')
  @Roles('admin', 'manager')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        if (!existsSync(SUPPLIER_UPLOAD_DIR)) {
          mkdirSync(SUPPLIER_UPLOAD_DIR, { recursive: true });
        }
        cb(null, SUPPLIER_UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        const supplierId = (req as any).params?.id ?? 'unknown';
        const uniqueSuffix = Date.now();
        cb(null, `cheque-${supplierId}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
      if (!allowed.includes(extname(file.originalname).toLowerCase())) {
        return cb(new BadRequestException('Only JPG, PNG, and PDF files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadCancelledCheque(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const fileUrl = `/uploads/suppliers/${file.filename}`;
    return this.suppliersService.uploadCancelledCheque(id, fileUrl);
  }

  @Post(':id/link-product')
  @Roles('admin', 'manager')
  linkProduct(@Param('id') supplierId: string, @Body() dto: LinkProductSupplierDto) {
    return this.suppliersService.linkProduct(supplierId, dto);
  }

  @Delete(':id/products/:productId')
  @Roles('admin', 'manager')
  unlinkProduct(@Param('id') supplierId: string, @Param('productId') productId: string) {
    return this.suppliersService.unlinkProduct(supplierId, productId);
  }
}
