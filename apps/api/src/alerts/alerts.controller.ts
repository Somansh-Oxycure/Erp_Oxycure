import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert.dto';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ─── Alert Logs ────────────────────────────────────────────────────────────
  @Get()
  findLogs(@Query('status') status?: string) {
    return this.alertsService.findLogs(status);
  }

  @Get('open')
  findOpen() {
    return this.alertsService.findOpenAlerts();
  }

  @Get('count')
  getOpenCount() {
    return this.alertsService.getOpenCount();
  }

  @Patch(':id/acknowledge')
  @Roles('admin', 'manager')
  acknowledge(@Param('id') id: string) {
    return this.alertsService.acknowledgeAlert(id);
  }

  @Patch(':id/resolve')
  @Roles('admin', 'manager')
  resolve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.alertsService.resolveAlert(id, user.id);
  }

  // ─── Alert Rules ───────────────────────────────────────────────────────────
  @Get('rules')
  @Roles('admin', 'manager')
  findRules(@Query('active') active?: string) {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.alertsService.findRules(isActive);
  }

  @Get('rules/:id')
  @Roles('admin', 'manager')
  findOneRule(@Param('id') id: string) {
    return this.alertsService.findOneRule(id);
  }

  @Post('rules')
  @Roles('admin', 'manager')
  createRule(@Body() dto: CreateAlertRuleDto) {
    return this.alertsService.createRule(dto);
  }

  @Patch('rules/:id')
  @Roles('admin', 'manager')
  updateRule(@Param('id') id: string, @Body() dto: UpdateAlertRuleDto) {
    return this.alertsService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @Roles('admin')
  deleteRule(@Param('id') id: string) {
    return this.alertsService.deleteRule(id);
  }
}
