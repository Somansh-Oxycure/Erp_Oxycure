import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('backup')
export class BackupController {
  constructor(private readonly service: BackupService) {}

  private sendBackupJson(res: Response, backup: unknown) {
    const filename = `oxycure-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Prisma payloads may contain BigInt values from DB columns.
    // Convert BigInt to string so JSON serialization is stable.
    const json = JSON.stringify(
      backup,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    );

    res.send(json);
  }

  /** List all available tables */
  @Get('tables')
  @ApiOperation({ summary: 'List all exportable tables' })
  listTables() {
    return this.service.listTables();
  }

  /**
   * Export selected tables (or all) as a downloadable JSON file.
   * ?tables=user,product,customer   — individual tables
   * (omit query param)              — export everything
   */
  @Get('create')
  @ApiOperation({ summary: 'Create table data backup as JSON file (new endpoint alias)' })
  @ApiQuery({ name: 'tables', required: false, description: 'Comma-separated table keys, omit for full backup' })
  async createBackup(
    @Query('tables') tables: string | undefined,
    @Res() res: Response,
  ) {
    const keys = tables ? tables.split(',').map((k) => k.trim()).filter(Boolean) : [];
    const backup = await this.service.exportData(keys);
    this.sendBackupJson(res, backup);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export table data as JSON backup file' })
  @ApiQuery({ name: 'tables', required: false, description: 'Comma-separated table keys, omit for full backup' })
  async exportData(
    @Query('tables') tables: string | undefined,
    @Res() res: Response,
  ) {
    const keys = tables ? tables.split(',').map((k) => k.trim()).filter(Boolean) : [];
    const backup = await this.service.exportData(keys);
    this.sendBackupJson(res, backup);
  }

  /**
   * Restore data from an uploaded JSON backup file.
   * This is a destructive operation — existing rows in each table are removed first.
   */
  @Post('upload')
  @ApiOperation({ summary: 'Upload and restore DB tables from a JSON backup file (new endpoint alias)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async uploadBackup(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.toLowerCase().endsWith('.json')) {
      throw new BadRequestException('Only JSON backup files are accepted');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(file.buffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Uploaded file is not valid JSON');
    }

    return this.service.restoreData(payload as any);
  }

  @Post('restore')
  @ApiOperation({ summary: 'Restore DB tables from a JSON backup file (admin only, destructive)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async restoreData(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.toLowerCase().endsWith('.json')) {
      throw new BadRequestException('Only JSON backup files are accepted');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(file.buffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Uploaded file is not valid JSON');
    }

    return this.service.restoreData(payload as any);
  }

  /**
   * Clear (truncate) selected tables. Irreversible — admin only.
   * Body: { keys: string[] }
   */
  @Post('clear')
  @ApiOperation({ summary: 'Truncate selected tables (admin only, destructive)' })
  async clearTables(@Body() body: { keys: string[] }) {
    if (!Array.isArray(body?.keys) || body.keys.length === 0) {
      throw new BadRequestException('Provide at least one table key in body.keys');
    }
    return this.service.clearTables(body.keys);
  }
}
