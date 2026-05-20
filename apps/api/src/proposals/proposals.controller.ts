import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ProposalUploadInterceptor } from './proposal-upload.interceptor';
import { UserRole } from '@prisma/client';
import { ProposalsService } from './proposals.service';
import { ProposalFilterDto, UpdateProposalStatusDto, UpdateProposalDto, CreateProposalFollowUpDto, UpdateProposalFollowUpDto, AddProposalNoteDto, GenerateProposalDto } from './dto/proposal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type RequestUser = {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string;
};

@ApiTags('Proposals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private proposalsService: ProposalsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get proposal statistics' })
  getStats(@CurrentUser() user: RequestUser) {
    return this.proposalsService.getStats(user);
  }

  @Get('today-follow-ups')
  @ApiOperation({ summary: "Get today's proposal follow-ups" })
  getTodayFollowUps(@CurrentUser() user: RequestUser) {
    return this.proposalsService.getTodayFollowUps(user);
  }

  @Get()
  @ApiOperation({ summary: 'List proposals' })
  findAll(@Query() filters: ProposalFilterDto, @CurrentUser() user: RequestUser) {
    return this.proposalsService.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single proposal' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Update a draft proposal (items, notes, validity)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.proposalsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Update proposal status (send, accept, reject, expire)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.proposalsService.updateStatus(id, dto, user);
  }

  @Post(':id/follow-ups')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Schedule a follow-up for a proposal' })
  createFollowUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProposalFollowUpDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.proposalsService.createFollowUp(id, dto, user.id);
  }

  @Patch(':id/follow-ups/:fid')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Update proposal follow-up status/outcome' })
  updateFollowUp(
    @Param('fid', ParseUUIDPipe) fid: string,
    @Body() dto: UpdateProposalFollowUpDto,
  ) {
    return this.proposalsService.updateFollowUp(fid, dto);
  }

  @Post(':id/notes')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson, UserRole.service_engineer, UserRole.design_engineer)
  @ApiOperation({ summary: 'Add a timestamped note to a proposal' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProposalNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.proposalsService.addNote(id, dto, user.id);
  }

  @Get(':id/document/view')
  @ApiOperation({ summary: 'View the proposal document inline in the browser' })
  async viewDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const info = await this.proposalsService.getDocumentInfo(id);
    const encodedName = encodeURIComponent(info.downloadName);
    res.setHeader('Content-Type', info.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${info.downloadName}"; filename*=UTF-8''${encodedName}`,
    );
    res.sendFile(info.filePath);
  }

  @Get(':id/document/download')
  @ApiOperation({ summary: 'Download the proposal document as the reference-based filename' })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const info = await this.proposalsService.getDocumentInfo(id);
    const encodedName = encodeURIComponent(info.downloadName);
    res.setHeader('Content-Type', info.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${info.downloadName}"; filename*=UTF-8''${encodedName}`,
    );
    res.sendFile(info.filePath);
  }

  @Post(':id/document')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Upload or replace the proposal document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ProposalUploadInterceptor)
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.proposalsService.uploadDocument(id, file);
  }

  @Post('generate')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Generate a proposal .docx from form data and download it (standalone)' })
  async generateDocument(
    @Body() dto: GenerateProposalDto,
    @Res() res: Response,
  ) {
    const buffer = await this.proposalsService.generateDocument(dto);
    const filename = `proposal_${dto.ref_number || Date.now()}.docx`;
    const encoded = encodeURIComponent(filename);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
    );
    res.end(buffer);
  }

  @Post(':id/generate')
  @Roles(UserRole.admin, UserRole.manager, UserRole.salesperson)
  @ApiOperation({ summary: 'Generate a proposal .docx, save it and its form data to the proposal record' })
  async generateAndSave(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateProposalDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const buffer = await this.proposalsService.generateAndSave(id, dto, user);
    const filename = `proposal_${dto.ref_number || id}.docx`;
    const encoded = encodeURIComponent(filename);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
    );
    res.end(buffer);
  }
}
