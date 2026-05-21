import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  async getBillingStatus(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    return this.billingService.getBillingStatus(m, y);
  }

  @Post('toggle')
  async togglePayment(@Body() body: {
    tenantId: string;
    driverId?: string;
    month: number;
    year: number;
    status: 'PAID' | 'UNPAID';
  }) {
    return this.billingService.togglePayment(body);
  }
}
