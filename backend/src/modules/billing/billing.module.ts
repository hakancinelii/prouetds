import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionPayment } from '../../database/entities/subscription-payment.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Driver } from '../../database/entities/driver.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPayment, Tenant, Driver])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
