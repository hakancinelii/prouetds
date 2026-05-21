import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPayment } from '../../database/entities/subscription-payment.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Driver } from '../../database/entities/driver.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(SubscriptionPayment)
    private paymentRepository: Repository<SubscriptionPayment>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
  ) {}

  async getBillingStatus(month: number, year: number) {
    const tenants = await this.tenantRepository.find({
      where: { isActive: true },
      relations: ['drivers'],
    });

    const payments = await this.paymentRepository.find({
      where: { periodMonth: month, periodYear: year },
    });

    const billingMatrix = tenants.map((tenant) => {
      const mainPayment = payments.find(
        (p) => p.tenantId === tenant.id && p.type === 'TENANT_MAIN'
      );

      const externalDrivers = (tenant.drivers || [])
        .filter((d) => d.isActive)
        .map((driver) => {
          const driverPayment = payments.find(
            (p) =>
              p.tenantId === tenant.id &&
              p.type === 'EXTERNAL_DRIVER' &&
              p.driverId === driver.id
          );
          return {
            driverId: driver.id,
            name: `${driver.firstName} ${driver.lastName}`,
            tcKimlikNo: driver.tcKimlikNo,
            paymentStatus: driverPayment ? driverPayment.status : 'UNPAID',
            paymentId: driverPayment ? driverPayment.id : null,
          };
        });

      return {
        tenantId: tenant.id,
        companyName: tenant.companyName,
        paymentStatus: mainPayment ? mainPayment.status : 'UNPAID',
        paymentId: mainPayment ? mainPayment.id : null,
        externalDrivers,
      };
    });

    return billingMatrix;
  }

  async togglePayment(data: {
    tenantId: string;
    driverId?: string;
    month: number;
    year: number;
    status: 'PAID' | 'UNPAID';
  }) {
    const type = data.driverId ? 'EXTERNAL_DRIVER' : 'TENANT_MAIN';

    let payment = await this.paymentRepository.findOne({
      where: {
        tenantId: data.tenantId,
        driverId: data.driverId || null,
        periodMonth: data.month,
        periodYear: data.year,
        type,
      },
    });

    if (!payment) {
      payment = this.paymentRepository.create({
        tenantId: data.tenantId,
        driverId: data.driverId || null,
        periodMonth: data.month,
        periodYear: data.year,
        type,
        status: data.status,
        paidAt: data.status === 'PAID' ? new Date() : null,
      });
    } else {
      payment.status = data.status;
      payment.paidAt = data.status === 'PAID' ? new Date() : null;
    }

    return this.paymentRepository.save(payment);
  }
}
