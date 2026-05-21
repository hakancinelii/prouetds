import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';

@Controller('api/billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  async getBillingStatus(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    return this.billingService.getBillingStatus(m, y);
  }

  @Post('toggle')
  @Roles(UserRole.SUPER_ADMIN)
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
