import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  async getStatistics() {
    return this.dashboardService.getStatistics();
  }

  @Get('alerts')
  async getAlerts() {
    return this.dashboardService.getAlerts();
  }
}
