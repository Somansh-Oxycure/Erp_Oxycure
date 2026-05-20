import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';

type RequestUser = { id: string; role: UserRole };

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser) {
    return this.dashboardService.getSummary(user);
  }

  @Get('pipeline')
  getPipeline(@CurrentUser() user: RequestUser) {
    return this.dashboardService.getPipeline(user);
  }

  @Get('quotation-funnel')
  getQuotationFunnel() {
    return this.dashboardService.getQuotationFunnel();
  }

  @Get('orders-activity')
  getOrdersActivity(@Query('days') days?: string) {
    return this.dashboardService.getOrdersActivity(days ? parseInt(days, 10) : 30);
  }

  @Get('activity')
  getRecentActivity(@Query('limit') limit?: string) {
    return this.dashboardService.getRecentActivity(limit ? parseInt(limit, 10) : 10);
  }
}
